import { ZodError, z } from "zod";

import { parseJsonBody } from "@/app/lib/api/request-json";
import { isHttpError } from "@/app/lib/http-error";
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
const MCP_SERVER_VERSION = "1.0.0";
const MCP_MAX_BODY_BYTES = 64 * 1024;
const ONE_MINUTE = 60 * 1_000;
const SUPPORTED_LEGACY_PROTOCOLS = [
  "2025-11-25",
  "2025-06-18",
  "2025-03-26",
] as const;

const requestSchema = z.object({
  jsonrpc: z.literal("2.0"),
  id: z.union([z.string(), z.number()]).optional(),
  method: z.string().min(1),
  params: z.unknown().optional(),
});

const initializeParamsSchema = z.object({
  protocolVersion: z.string().min(1),
  capabilities: z.record(z.string(), z.unknown()).optional(),
  clientInfo: z
    .object({
      name: z.string().min(1),
      version: z.string().min(1),
    })
    .passthrough()
    .optional(),
}).passthrough();

const callToolParamsSchema = z.object({
  name: z.string().min(1),
  arguments: z.unknown().optional(),
}).passthrough();

type JsonRpcId = string | number | null;

function jsonHeaders() {
  return {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "private, no-store, max-age=0",
  };
}

function jsonRpcResult(id: JsonRpcId, result: unknown, status = 200) {
  return new Response(
    JSON.stringify({
      jsonrpc: "2.0",
      id,
      result,
    }),
    { status, headers: jsonHeaders() },
  );
}

function jsonRpcError(
  id: JsonRpcId,
  code: number,
  message: string,
  status = 200,
) {
  return new Response(
    JSON.stringify({
      jsonrpc: "2.0",
      id,
      error: { code, message },
    }),
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

async function consumeMcpLimits(
  request: Request,
  principal: McpPrincipal,
) {
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

  return Math.max(
    tokenLimit.retryAfterSeconds,
    ipLimit.retryAfterSeconds,
    1,
  );
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

function negotiateProtocol(requested: string) {
  return SUPPORTED_LEGACY_PROTOCOLS.includes(
    requested as (typeof SUPPORTED_LEGACY_PROTOCOLS)[number],
  )
    ? requested
    : SUPPORTED_LEGACY_PROTOCOLS[0];
}

async function handleAuthenticatedRequest(
  body: z.infer<typeof requestSchema>,
  principal: McpPrincipal,
) {
  const id = body.id ?? null;

  if (body.method === "initialize") {
    const parsed = initializeParamsSchema.safeParse(body.params ?? {});
    if (!parsed.success) {
      return jsonRpcError(id, -32602, "Parâmetros de initialize inválidos");
    }

    return jsonRpcResult(id, {
      protocolVersion: negotiateProtocol(parsed.data.protocolVersion),
      capabilities: {
        tools: {
          listChanged: false,
        },
      },
      serverInfo: {
        name: MCP_SERVER_NAME,
        version: MCP_SERVER_VERSION,
      },
      instructions:
        "Servidor financeiro estritamente read-only. Valores monetários são retornados em centavos inteiros e moedas permanecem separadas.",
    });
  }

  if (
    body.method === "notifications/initialized" ||
    body.method === "notifications/cancelled"
  ) {
    return new Response(null, {
      status: 202,
      headers: { "Cache-Control": "private, no-store, max-age=0" },
    });
  }

  if (body.method === "ping") {
    return jsonRpcResult(id, {});
  }

  if (body.method === "tools/list") {
    return jsonRpcResult(id, {
      tools: MCP_TOOL_DEFINITIONS,
    });
  }

  if (body.method === "tools/call") {
    const parsed = callToolParamsSchema.safeParse(body.params ?? {});
    if (!parsed.success || !isMcpToolName(parsed.data.name)) {
      return jsonRpcError(id, -32602, "Tool MCP desconhecida ou inválida");
    }

    try {
      const output = await executeMcpTool(
        principal.userId,
        parsed.data.name,
        parsed.data.arguments,
      );

      return jsonRpcResult(id, {
        content: [
          {
            type: "text",
            text: JSON.stringify(output),
          },
        ],
        structuredContent: output,
        isError: false,
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return jsonRpcError(
          id,
          -32602,
          error.issues[0]?.message ?? "Argumentos da tool inválidos",
        );
      }

      return jsonRpcResult(id, {
        content: [
          {
            type: "text",
            text: "Não foi possível executar a consulta financeira.",
          },
        ],
        isError: true,
      });
    }
  }

  return body.id === undefined
    ? new Response(null, {
        status: 202,
        headers: { "Cache-Control": "private, no-store, max-age=0" },
      })
    : jsonRpcError(id, -32601, "Método MCP não suportado");
}

export async function handleMcpRequest(request: Request) {
  if (request.method !== "POST") {
    return new Response("Method not allowed", {
      status: 405,
      headers: {
        Allow: "POST",
        "Cache-Control": "private, no-store, max-age=0",
      },
    });
  }

  let rawBody: unknown;
  try {
    rawBody = await parseJsonBody(request, { maxBytes: MCP_MAX_BODY_BYTES });
  } catch (error) {
    if (isHttpError(error) && error.status === 413) {
      return jsonRpcError(null, -32600, "Requisição MCP excede o limite", 413);
    }
    return jsonRpcError(null, -32700, "JSON inválido", 400);
  }

  if (Array.isArray(rawBody)) {
    return jsonRpcError(null, -32600, "Batch JSON-RPC não é suportado", 400);
  }

  const parsedRequest = requestSchema.safeParse(rawBody);
  if (!parsedRequest.success) {
    return jsonRpcError(null, -32600, "Requisição JSON-RPC inválida", 400);
  }

  const principal = await authenticateMcpBearerToken(
    request.headers.get("authorization"),
  );
  if (!principal) return unauthorized();

  const retryAfter = await consumeMcpLimits(request, principal);
  if (retryAfter !== null) {
    return rateLimited(parsedRequest.data.id ?? null, retryAfter);
  }

  return handleAuthenticatedRequest(parsedRequest.data, principal);
}
