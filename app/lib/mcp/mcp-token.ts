import crypto from "node:crypto";
import { z } from "zod";

import { HttpError } from "@/app/lib/http-error";
import { logEvent } from "@/app/lib/observability";
import { prisma } from "@/app/lib/prisma";

const MCP_TOKEN_PREFIX = "cgmcp_";
const MCP_SCOPE = "finance:read";
const MAX_ACTIVE_TOKENS = 5;
const LAST_USED_WRITE_INTERVAL_MS = 5 * 60 * 1_000;

export const createMcpTokenSchema = z.object({
  name: z.string().trim().min(1).max(80),
  expiresInDays: z.union([
    z.literal(30),
    z.literal(90),
    z.literal(180),
    z.literal(365),
  ]).default(90),
});

export type CreateMcpTokenInput = z.infer<typeof createMcpTokenSchema>;

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function buildToken() {
  return MCP_TOKEN_PREFIX + crypto.randomBytes(32).toString("base64url");
}

export async function createMcpAccessTokenForUser(
  userId: string,
  input: CreateMcpTokenInput,
  now = new Date(),
) {
  const token = buildToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(
    now.getTime() + input.expiresInDays * 24 * 60 * 60 * 1_000,
  );

  // Serializa criações do mesmo usuário travando a linha dele até o commit,
  // para que count + create respeitem o limite sob concorrência.
  const created = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM users WHERE id = ${userId} FOR UPDATE`;

    const activeCount = await tx.mcpAccessToken.count({
      where: {
        userId,
        revokedAt: null,
        expiresAt: { gt: now },
      },
    });

    if (activeCount >= MAX_ACTIVE_TOKENS) {
      throw new HttpError(
        "Limite de tokens MCP ativos atingido. Revogue um token antes de criar outro.",
        409,
        "MCP_TOKEN_LIMIT_REACHED",
      );
    }

    return tx.mcpAccessToken.create({
      data: {
        userId,
        name: input.name,
        tokenHash,
        tokenPrefix: token.slice(0, 14),
        scope: MCP_SCOPE,
        expiresAt,
      },
      select: {
        id: true,
        name: true,
        tokenPrefix: true,
        scope: true,
        expiresAt: true,
        createdAt: true,
      },
    });
  });

  return {
    ...created,
    token,
  };
}

const tokenSelect = {
  id: true,
  name: true,
  tokenPrefix: true,
  scope: true,
  expiresAt: true,
  revokedAt: true,
  lastUsedAt: true,
  createdAt: true,
} as const;

const HISTORY_LIMIT = 20;

/**
 * Todo token ativo é sempre retornado (credencial externa precisa ser
 * revogável); apenas o histórico expirado/revogado é limitado.
 */
export async function listMcpAccessTokensForUser(
  userId: string,
  now = new Date(),
) {
  const activeWhere = {
    userId,
    revokedAt: null,
    expiresAt: { gt: now },
  } as const;

  const [active, history] = await Promise.all([
    prisma.mcpAccessToken.findMany({
      where: activeWhere,
      select: tokenSelect,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    }),
    prisma.mcpAccessToken.findMany({
      where: { userId, NOT: activeWhere },
      select: tokenSelect,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: HISTORY_LIMIT,
    }),
  ]);

  const items = [...active, ...history].map((item) => ({
    ...item,
    status:
      item.revokedAt !== null
        ? ("REVOKED" as const)
        : item.expiresAt <= now
          ? ("EXPIRED" as const)
          : ("ACTIVE" as const),
  }));

  return { items, totalActive: active.length };
}

/** Revoga todos os tokens ativos; usado em eventos de recuperação de conta. */
export async function revokeAllMcpAccessTokensForUser(
  userId: string,
  db: Pick<typeof prisma, "mcpAccessToken"> = prisma,
  now = new Date(),
) {
  const result = await db.mcpAccessToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: now },
  });
  return result.count;
}

export async function revokeMcpAccessTokenForUser(
  userId: string,
  tokenId: string,
  now = new Date(),
) {
  const result = await prisma.mcpAccessToken.updateMany({
    where: {
      id: tokenId,
      userId,
      revokedAt: null,
    },
    data: { revokedAt: now },
  });

  if (result.count !== 1) {
    throw new HttpError("Token MCP não encontrado", 404, "MCP_TOKEN_NOT_FOUND");
  }
}

export type McpPrincipal = {
  userId: string;
  tokenId: string;
  scope: typeof MCP_SCOPE;
};

export async function authenticateMcpBearerToken(
  authorization: string | null,
  now = new Date(),
): Promise<McpPrincipal | null> {
  const match = /^Bearer\s+(.+)$/i.exec(authorization?.trim() ?? "");
  const token = match?.[1]?.trim();

  if (!token || !token.startsWith(MCP_TOKEN_PREFIX)) return null;

  const record = await prisma.mcpAccessToken.findUnique({
    where: { tokenHash: hashToken(token) },
    select: {
      id: true,
      userId: true,
      scope: true,
      expiresAt: true,
      revokedAt: true,
      lastUsedAt: true,
      user: {
        select: {
          isActive: true,
        },
      },
    },
  });

  if (
    !record ||
    !record.user.isActive ||
    record.scope !== MCP_SCOPE ||
    record.revokedAt !== null ||
    record.expiresAt <= now
  ) {
    return null;
  }

  if (
    record.lastUsedAt === null ||
    now.getTime() - record.lastUsedAt.getTime() >= LAST_USED_WRITE_INTERVAL_MS
  ) {
    // Telemetria best-effort: autorização já validada acima.
    try {
      await prisma.mcpAccessToken.updateMany({
        where: {
          id: record.id,
          revokedAt: null,
          expiresAt: { gt: now },
        },
        data: { lastUsedAt: now },
      });
    } catch (error) {
      logEvent("warn", "mcp_last_used_update_failed", {}, error);
    }
  }

  return {
    userId: record.userId,
    tokenId: record.id,
    scope: MCP_SCOPE,
  };
}
