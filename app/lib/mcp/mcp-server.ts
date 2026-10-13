import { ZodError, z } from "zod";
import {
  createMcpHandler,
  fromJsonSchema,
  isLegacyRequest,
  McpServer,
  WebStandardStreamableHTTPServerTransport,
  type AuthInfo,
  type CallToolResult,
  type JsonSchemaType,
} from "@modelcontextprotocol/server";

import { parseJsonBody } from "@/app/lib/api/request-json";
import { isHttpError } from "@/app/lib/http-error";
import { getRequestId, logEvent } from "@/app/lib/observability";
import {
  authenticateMcpBearerToken,
  type McpPrincipal,
} from "@/app/lib/mcp/mcp-token";
import {
  executeMcpTool,
  isMcpToolName,
  MCP_TOOL_DEFINITIONS,
} from "@/app/lib/mcp/mcp-tools";
import {
  consumeRateLimit,
  getRequestIp,
} from "@/app/lib/security/rate-limit";

const MCP_SERVER_NAME = "controle-gastos";
const MCP_SERVER_VERSION = "1.1.0";
const MCP_MAX_BODY_BYTES = 64 * 1024;
const ONE_MINUTE = 60 * 1_000;
const MCP_ROUTE = "/api/mcp";
const NO_STORE = "private, no-store, max-age=0";

const MCP_INSTRUCTIONS =
  "Servidor financeiro estritamente read-only. Valores monetários são retornados em centavos inteiros e moedas permanecem separadas.";

/** Códigos estáveis e seguros devolvidos em `structuredContent.error.code`. */
export type McpToolErrorCode =
  | "INVALID_ARGUMENTS"
  | "UNSUPPORTED"
  | "TEMPORARILY_UNAVAILABLE";

const requestSchema = z.object({
  jsonrpc: z.literal("2.0"),
  id: z.union([z.string(), z.number()]).optional(),
  method: z.string().min(1),
  params: z.unknown().optional(),
});

type JsonRpcId = string | number | null;

function jsonHeaders() {
  return {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": NO_STORE,
  };
}

function jsonRpcError(
  id: JsonRpcId,
  code: number,
  message: string,
  status = 200,
) {
  return new Response(
    JSON.stringify({ jsonrpc: "2.0", id, error: { code, message } }),
    { status, headers: jsonHeaders() },
  );
}

function unauthorized() {
  return new Response(
    JSON.stringify({
      error: "unauthorized",
      message: "Bearer token MCP ausente, inválido, expirado ou revogado",
    }),
    {
      status: 401,
      headers: {
        ...jsonHeaders(),
        "WWW-Authenticate": 'Bearer realm="controle-gastos-mcp"',
      },
    },
  );
}

async function consumeMcpLimits(request: Request, principal: McpPrincipal) {
  const [tokenLimit, ipLimit] = await Promise.all([
    consumeRateLimit({
      action: "mcp-token",
      identifier: principal.tokenId,
      maxAttempts: 120,
      windowMs: ONE_MINUTE,
      blockMs: ONE_MINUTE,
    }),
    consumeRateLimit({
      action: "mcp-ip",
      identifier: getRequestIp(request),
      maxAttempts: 300,
      windowMs: ONE_MINUTE,
      blockMs: ONE_MINUTE,
    }),
  ]);

  if (!tokenLimit.limited && !ipLimit.limited) return null;

  return Math.max(tokenLimit.retryAfterSeconds, ipLimit.retryAfterSeconds, 1);
}

function rateLimited(id: JsonRpcId, retryAfterSeconds: number) {
  const response = jsonRpcError(
    id,
    -32000,
    "Limite de requisições MCP atingido",
    429,
  );
  response.headers.set("Retry-After", String(retryAfterSeconds));
  return response;
}

function toolError(code: McpToolErrorCode, message: string): CallToolResult {
  return {
    content: [{ type: "text", text: message }],
    structuredContent: { error: { code } },
    isError: true,
  };
}

/**
 * Classifica falhas de tool sem expor mensagens internas (Prisma, provider,
 * stack): apenas códigos estáveis e textos fixos.
 */
function toolFailure(error: unknown): {
  result: CallToolResult;
  outcome: "invalid_arguments" | "unsupported" | "error";
} {
  if (error instanceof ZodError) {
    const detail = error.issues[0]?.message ?? "Argumentos da tool inválidos";
    return {
      result: toolError("INVALID_ARGUMENTS", `Argumentos inválidos: ${detail}`),
      outcome: "invalid_arguments",
    };
  }
  if (isHttpError(error) && error.status >= 400 && error.status < 500) {
    return {
      result: toolError(
        "UNSUPPORTED",
        "Consulta não suportada para os parâmetros informados.",
      ),
      outcome: "unsupported",
    };
  }
  return {
    result: toolError(
      "TEMPORARILY_UNAVAILABLE",
      "Não foi possível executar a consulta financeira.",
    ),
    outcome: "error",
  };
}

type RequestContext = {
  method?: string;
  tool?: string;
  tokenId?: string;
  result?: string;
};

/** Servidor por request: o owner vem do token autenticado, nunca do cliente. */
function buildMcpServer(principal: McpPrincipal, context: RequestContext) {
  const server = new McpServer(
    { name: MCP_SERVER_NAME, version: MCP_SERVER_VERSION },
    {
      instructions: MCP_INSTRUCTIONS,
      capabilities: { tools: { listChanged: false } },
    },
  );

  for (const definition of MCP_TOOL_DEFINITIONS) {
    server.registerTool(
      definition.name,
      {
        description: definition.description,
        inputSchema: fromJsonSchema(definition.inputSchema as unknown as JsonSchemaType),
        annotations: definition.annotations,
      },
      async (args): Promise<CallToolResult> => {
        if (!isMcpToolName(definition.name)) {
          return toolError("UNSUPPORTED", "Tool MCP desconhecida.");
        }
        try {
          const output = await executeMcpTool(
            principal.userId,
            definition.name,
            args,
          );
          context.result = "success";
          return {
            content: [{ type: "text", text: JSON.stringify(output) }],
            structuredContent: output as Record<string, unknown>,
            isError: false,
          };
        } catch (error) {
          const failure = toolFailure(error);
          context.result = failure.outcome;
          return failure.result;
        }
      },
    );
  }

  return server;
}

function toAuthInfo(principal: McpPrincipal): AuthInfo {
  // Pass-through: o token em claro nunca chega ao SDK.
  return { token: "", clientId: principal.tokenId, scopes: [principal.scope] };
}

/** O SDK exige Accept/Content-Type MCP; clientes simples (curl) não os enviam. */
function normalizedRequest(request: Request) {
  const headers = new Headers(request.headers);
  headers.set("content-type", "application/json");
  headers.set("accept", "application/json, text/event-stream");
  headers.delete("content-length");
  return new Request(request.url, { method: "POST", headers });
}

async function dispatchToSdk(
  request: Request,
  body: unknown,
  principal: McpPrincipal,
  context: RequestContext,
) {
  const authInfo = toAuthInfo(principal);
  const sdkRequest = normalizedRequest(request);
  const factory = () => buildMcpServer(principal, context);

  // 2025: serviço stateless com resposta JSON (compatibilidade com clientes
  // existentes). 2026-07-28: handler oficial do SDK.
  if (await isLegacyRequest(sdkRequest, body)) {
    const server = factory();
    const transport = new WebStandardStreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });
    await server.connect(transport);
    try {
      return await transport.handleRequest(sdkRequest, {
        parsedBody: body,
        authInfo,
      });
    } finally {
      await server.close();
    }
  }

  const handler = createMcpHandler(factory, {
    legacy: "reject",
    responseMode: "json",
    onerror: () => undefined,
  });
  return handler.fetch(sdkRequest, { parsedBody: body, authInfo });
}

async function handle(request: Request, context: RequestContext) {
  if (request.method !== "POST") {
    return new Response("Method not allowed", {
      status: 405,
      headers: { Allow: "POST", "Cache-Control": NO_STORE },
    });
  }

  let rawBody: unknown;
  try {
    rawBody = await parseJsonBody(request, { maxBytes: MCP_MAX_BODY_BYTES });
  } catch (error) {
    if (isHttpError(error) && error.status === 413) {
      context.result = "body_too_large";
      return jsonRpcError(null, -32600, "Requisição MCP excede o limite", 413);
    }
    context.result = "invalid_json";
    return jsonRpcError(null, -32700, "JSON inválido", 400);
  }

  if (Array.isArray(rawBody)) {
    context.result = "batch_rejected";
    return jsonRpcError(null, -32600, "Batch JSON-RPC não é suportado", 400);
  }

  const parsedRequest = requestSchema.safeParse(rawBody);
  if (!parsedRequest.success) {
    context.result = "invalid_request";
    return jsonRpcError(null, -32600, "Requisição JSON-RPC inválida", 400);
  }

  context.method = parsedRequest.data.method;
  const params = parsedRequest.data.params;
  if (
    parsedRequest.data.method === "tools/call" &&
    params !== null &&
    typeof params === "object" &&
    "name" in params &&
    typeof params.name === "string"
  ) {
    context.tool = isMcpToolName(params.name) ? params.name : "unknown";
  }

  const principal = await authenticateMcpBearerToken(
    request.headers.get("authorization"),
  );
  if (!principal) {
    context.result = "auth_failed";
    return unauthorized();
  }
  context.tokenId = principal.tokenId;

  const retryAfter = await consumeMcpLimits(request, principal);
  if (retryAfter !== null) {
    context.result = "rate_limited";
    return rateLimited(parsedRequest.data.id ?? null, retryAfter);
  }

  return dispatchToSdk(request, rawBody, principal, context);
}

/**
 * Observabilidade segura: requestId, método/tool, status, duração e tokenId
 * interno. Nunca bearer, argumentos ou saída financeira.
 */
export async function handleMcpRequest(request: Request) {
  const requestId = getRequestId(request);
  const startedAt = performance.now();
  const context: RequestContext = {};

  let response: Response;
  let failure: unknown;
  try {
    response = await handle(request, context);
  } catch (error) {
    failure = error;
    context.result = "error";
    response = jsonRpcError(null, -32603, "Erro interno do servidor MCP", 500);
  }

  response.headers.set("x-request-id", requestId);
  const status = response.status;
  logEvent(
    status >= 500 ? "error" : status >= 400 ? "warn" : "info",
    "mcp_request",
    {
      requestId,
      route: MCP_ROUTE,
      status,
      durationMs: Math.max(0, Math.round(performance.now() - startedAt)),
      method: context.method ?? null,
      tool: context.tool ?? null,
      tokenId: context.tokenId ?? null,
      result: context.result ?? (status < 400 ? "success" : "error"),
    },
    failure,
  );

  return response;
}
