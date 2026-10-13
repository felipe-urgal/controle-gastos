import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ZodError } from "zod";

import { HttpError } from "@/app/lib/http-error";

const mocks = vi.hoisted(() => ({
  authenticate: vi.fn(),
  executeTool: vi.fn(),
  consumeRateLimit: vi.fn(),
  logEvent: vi.fn(),
}));

vi.mock("@/app/lib/mcp/mcp-token", () => ({
  authenticateMcpBearerToken: mocks.authenticate,
}));
vi.mock("@/app/lib/observability", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/app/lib/observability")>()),
  logEvent: mocks.logEvent,
}));
vi.mock("@/app/lib/security/rate-limit", () => ({
  consumeRateLimit: mocks.consumeRateLimit,
  getRequestIp: () => "127.0.0.1",
}));
vi.mock("@/app/lib/mcp/mcp-tools", () => ({
  MCP_TOOL_DEFINITIONS: [
    {
      name: "get_accounts",
      description: "read only",
      inputSchema: {
        type: "object",
        properties: { page: { type: "integer", minimum: 1 } },
        additionalProperties: false,
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
  ],
  isMcpToolName: (value: string) => value === "get_accounts",
  executeMcpTool: mocks.executeTool,
}));

import { handleMcpRequest } from "@/app/lib/mcp/mcp-server";

const TOKEN = "cgmcp_contract_secret";
const URL_ = "http://localhost/api/mcp";

const routedFetch: typeof fetch = (input, init) =>
  handleMcpRequest(new Request(input, init));

async function connectOfficialClient(mode: "auto" | "legacy" = "auto") {
  const client = new Client(
    { name: "contract-test", version: "1.0.0" },
    { versionNegotiation: { mode } },
  );
  const transport = new StreamableHTTPClientTransport(new URL(URL_), {
    fetch: routedFetch,
    requestInit: { headers: { authorization: `Bearer ${TOKEN}` } },
  });
  await client.connect(transport);
  return client;
}

function rawPost(body: unknown, headers: Record<string, string> = {}) {
  return handleMcpRequest(
    new Request(URL_, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${TOKEN}`,
        ...headers,
      },
      body: JSON.stringify(body),
    }),
  );
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.authenticate.mockResolvedValue({
    userId: "user-1",
    tokenId: "token-1",
    scope: "finance:read",
  });
  mocks.consumeRateLimit.mockResolvedValue({ limited: false, retryAfterSeconds: 0 });
  mocks.executeTool.mockResolvedValue({ items: [], hasMore: false });
});

describe("MCP protocol contract (official SDK client)", () => {
  it("conecta com o cliente oficial atual, lista tools read-only e executa uma tool", async () => {
    const client = await connectOfficialClient();
    try {
      // Revisão estável atual negociada nativamente (sem cair no legado 2025).
      expect(client.getNegotiatedProtocolVersion()).toBe("2026-07-28");
      const { tools } = await client.listTools();
      expect(tools.map((tool) => tool.name)).toEqual(["get_accounts"]);
      expect(tools[0]?.annotations?.readOnlyHint).toBe(true);

      const result = await client.callTool({ name: "get_accounts", arguments: { page: 1 } });
      expect(result.isError).toBeFalsy();
      expect(result.structuredContent).toEqual({ items: [], hasMore: false });
      expect(mocks.executeTool).toHaveBeenCalledWith("user-1", "get_accounts", { page: 1 });
    } finally {
      await client.close();
    }
  });

  it("cliente oficial em modo legado negocia a revisão 2025 via initialize", async () => {
    const client = await connectOfficialClient("legacy");
    try {
      expect(client.getNegotiatedProtocolVersion()).toBe("2025-11-25");
      const { tools } = await client.listTools();
      expect(tools).toHaveLength(1);
    } finally {
      await client.close();
    }
  });

  it.each(["2025-11-25", "2025-06-18", "2025-03-26"])(
    "mantém fallback legado %s com resposta JSON",
    async (protocolVersion) => {
      const response = await rawPost({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion,
          capabilities: {},
          clientInfo: { name: "legacy", version: "1.0.0" },
        },
      });
      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toContain("application/json");
      const payload = await response.json();
      expect(payload.result.protocolVersion).toBe(protocolVersion);
      expect(payload.result.serverInfo.name).toBe("controle-gastos");
    },
  );

  it("aceita clientes simples sem cabeçalho Accept", async () => {
    const response = await rawPost({ jsonrpc: "2.0", id: 2, method: "tools/list", params: {} });
    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.result.tools).toHaveLength(1);
  });
});

describe("erros de tool com códigos seguros", () => {
  const call = (args: unknown = {}) =>
    rawPost({
      jsonrpc: "2.0",
      id: 9,
      method: "tools/call",
      params: { name: "get_accounts", arguments: args },
    });

  it("mapeia ZodError para INVALID_ARGUMENTS", async () => {
    mocks.executeTool.mockRejectedValue(new ZodError([
      { code: "custom", message: "page inválida", path: ["page"] },
    ]));
    const payload = await (await call()).json();
    expect(payload.result.isError).toBe(true);
    expect(payload.result.structuredContent.error.code).toBe("INVALID_ARGUMENTS");
  });

  it("mapeia erro 4xx de domínio para UNSUPPORTED sem expor a mensagem", async () => {
    mocks.executeTool.mockRejectedValue(new HttpError("detalhe interno", 422));
    const payload = await (await call()).json();
    expect(payload.result.structuredContent.error.code).toBe("UNSUPPORTED");
    expect(JSON.stringify(payload)).not.toContain("detalhe interno");
  });

  it("mapeia falha inesperada para TEMPORARILY_UNAVAILABLE sem vazar Prisma/provider", async () => {
    mocks.executeTool.mockRejectedValue(new Error("PrismaClientKnownRequestError: P2002 users_email_key"));
    const payload = await (await call()).json();
    expect(payload.result.structuredContent.error.code).toBe("TEMPORARILY_UNAVAILABLE");
    expect(JSON.stringify(payload)).not.toContain("Prisma");
  });
});

describe("observabilidade do MCP", () => {
  it("loga requestId, método, tool, status e duração sem bearer, argumentos ou saída", async () => {
    mocks.executeTool.mockResolvedValue({ secretBalance: 987654321 });
    const response = await rawPost(
      {
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: { name: "get_accounts", arguments: { page: 7 } },
      },
      { "x-request-id": "req-contract-1" },
    );

    expect(response.headers.get("x-request-id")).toBe("req-contract-1");
    const entry = mocks.logEvent.mock.calls.find((call) => call[1] === "mcp_request");
    expect(entry?.[2]).toMatchObject({
      requestId: "req-contract-1",
      method: "tools/call",
      tool: "get_accounts",
      status: 200,
      tokenId: "token-1",
      result: "success",
    });
    expect(typeof entry?.[2].durationMs).toBe("number");
    const serialized = JSON.stringify(mocks.logEvent.mock.calls);
    expect(serialized).not.toContain(TOKEN);
    expect(serialized).not.toContain("987654321");
    expect(serialized).not.toContain('"page":7');
  });

  it("registra falha de autenticação sem token em claro", async () => {
    mocks.authenticate.mockResolvedValue(null);
    const response = await rawPost({ jsonrpc: "2.0", id: 1, method: "tools/list" });
    expect(response.status).toBe(401);
    const entry = mocks.logEvent.mock.calls.find((call) => call[1] === "mcp_request");
    expect(entry?.[2]).toMatchObject({ status: 401, result: "auth_failed", tokenId: null });
    expect(JSON.stringify(mocks.logEvent.mock.calls)).not.toContain(TOKEN);
  });
});
