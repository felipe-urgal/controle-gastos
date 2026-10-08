import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authenticate: vi.fn(),
  executeTool: vi.fn(),
  consumeRateLimit: vi.fn(),
}));

vi.mock("@/app/lib/mcp/mcp-token", () => ({
  authenticateMcpBearerToken: mocks.authenticate,
}));

vi.mock("@/app/lib/mcp/mcp-tools", () => ({
  MCP_TOOL_DEFINITIONS: [
    {
      name: "get_accounts",
      description: "read only",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
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

vi.mock("@/app/lib/security/rate-limit", () => ({
  consumeRateLimit: mocks.consumeRateLimit,
  getRequestIp: () => "127.0.0.1",
}));

import { handleMcpRequest } from "@/app/lib/mcp/mcp-server";

function mcpRequest(body: unknown, token = "cgmcp_test") {
  return new Request("http://localhost/api/mcp", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  mocks.authenticate.mockReset();
  mocks.executeTool.mockReset();
  mocks.consumeRateLimit.mockReset();

  mocks.authenticate.mockResolvedValue({
    userId: "user-1",
    tokenId: "token-1",
    scope: "finance:read",
  });
  mocks.consumeRateLimit.mockResolvedValue({
    limited: false,
    retryAfterSeconds: 0,
  });
});

describe("MCP HTTP server", () => {
  it("exige bearer token MCP antes de executar qualquer tool", async () => {
    mocks.authenticate.mockResolvedValue(null);

    const response = await handleMcpRequest(
      new Request("http://localhost/api/mcp", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "tools/list",
          params: {},
        }),
      }),
    );

    expect(response.status).toBe(401);
    expect(response.headers.get("www-authenticate")).toContain("Bearer");
    expect(mocks.executeTool).not.toHaveBeenCalled();
  });

  it("negocia initialize legado de forma stateless", async () => {
    const response = await handleMcpRequest(
      mcpRequest({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2025-11-25",
          capabilities: {},
          clientInfo: { name: "test", version: "1.0.0" },
        },
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      jsonrpc: "2.0",
      id: 1,
      result: {
        protocolVersion: "2025-11-25",
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: "controle-gastos" },
      },
    });
  });

  it("lista apenas tools marcadas como read-only", async () => {
    const response = await handleMcpRequest(
      mcpRequest({
        jsonrpc: "2.0",
        id: "tools",
        method: "tools/list",
        params: {},
      }),
    );

    const payload = await response.json();
    expect(payload.result.tools).toEqual([
      expect.objectContaining({
        name: "get_accounts",
        annotations: expect.objectContaining({
          readOnlyHint: true,
          destructiveHint: false,
        }),
      }),
    ]);
  });

  it("injeta o userId autenticado e nunca recebe ownership do cliente", async () => {
    mocks.executeTool.mockResolvedValue({ items: [] });

    const response = await handleMcpRequest(
      mcpRequest({
        jsonrpc: "2.0",
        id: 2,
        method: "tools/call",
        params: {
          name: "get_accounts",
          arguments: { includeInactive: false },
        },
      }),
    );

    expect(response.status).toBe(200);
    expect(mocks.executeTool).toHaveBeenCalledWith(
      "user-1",
      "get_accounts",
      { includeInactive: false },
    );
  });

  it("rejeita tool inexistente e não oferece mutation genérica", async () => {
    const unknownTool = await handleMcpRequest(
      mcpRequest({
        jsonrpc: "2.0",
        id: 3,
        method: "tools/call",
        params: {
          name: "delete_transaction",
          arguments: { id: "tx-1" },
        },
      }),
    );

    await expect(unknownTool.json()).resolves.toMatchObject({
      error: { code: -32602 },
    });
    expect(mocks.executeTool).not.toHaveBeenCalled();

    const mutationMethod = await handleMcpRequest(
      mcpRequest({
        jsonrpc: "2.0",
        id: 4,
        method: "transactions/create",
        params: {},
      }),
    );

    await expect(mutationMethod.json()).resolves.toMatchObject({
      error: { code: -32601 },
    });
  });

  it("aplica rate limit por token e IP", async () => {
    mocks.consumeRateLimit
      .mockResolvedValueOnce({ limited: true, retryAfterSeconds: 42 })
      .mockResolvedValueOnce({ limited: false, retryAfterSeconds: 0 });

    const response = await handleMcpRequest(
      mcpRequest({
        jsonrpc: "2.0",
        id: 5,
        method: "tools/list",
        params: {},
      }),
    );

    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("42");
  });

  it("não aceita batch JSON-RPC", async () => {
    const response = await handleMcpRequest(
      mcpRequest([
        {
          jsonrpc: "2.0",
          id: 1,
          method: "tools/list",
          params: {},
        },
      ]),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: -32600 },
    });
  });

  it("aplica o limite de 64 KB ao corpo real, sem Content-Length", async () => {
    const payload = JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "ping",
      params: { padding: "x".repeat(70 * 1024) },
    });
    const encoded = new TextEncoder().encode(payload);
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoded.slice(0, 40 * 1024));
        controller.enqueue(encoded.slice(40 * 1024));
        controller.close();
      },
    });
    const request = new Request("http://localhost/api/mcp", {
      method: "POST",
      headers: { authorization: "Bearer cgmcp_test" },
      body: stream,
      duplex: "half",
    } as RequestInit);
    expect(request.headers.get("content-length")).toBeNull();

    const response = await handleMcpRequest(request);

    expect(response.status).toBe(413);
    expect(mocks.authenticate).not.toHaveBeenCalled();
  });

  it("responde 405 para métodos diferentes de POST", async () => {
    const response = await handleMcpRequest(
      new Request("http://localhost/api/mcp", { method: "GET" }),
    );
    expect(response.status).toBe(405);
  });
});
