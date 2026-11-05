import { apiFailureFromError } from "@/app/lib/api/api-error-response";
import { success } from "@/app/lib/api-response";
import { getAuthenticatedUserId, getCurrentSessionId } from "@/app/lib/auth";
import { describeUserAgent, recordSecurityEvent } from "@/app/lib/auth/auth-session";
import { HttpError } from "@/app/lib/http-error";
import { prisma } from "@/app/lib/prisma";

const EVENT_LIMIT = 50;

export type AuthSessionDTO = {
  id: string;
  device: string;
  createdAt: string;
  lastSeenAt: string;
  current: boolean;
};

async function activeSessionsFilter(userId: string, now = new Date()) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { authVersion: true } });
  // Só vale a sessão emitida na versão atual da conta, ainda não revogada e não vencida.
  return { userId, revokedAt: null, expiresAt: { gt: now }, authVersion: user?.authVersion ?? 0 };
}

/** `GET /api/auth/sessions` — aparelhos com login ativo (o atual vem marcado). */
export async function listAuthSessions() {
  try {
    const userId = await getAuthenticatedUserId();
    const currentId = await getCurrentSessionId();
    const rows = await prisma.authSession.findMany({
      where: await activeSessionsFilter(userId),
      select: { id: true, userAgent: true, createdAt: true, lastSeenAt: true },
      orderBy: [{ lastSeenAt: "desc" }, { id: "asc" }],
    });
    const items: AuthSessionDTO[] = rows.map((row) => ({
      id: row.id,
      device: describeUserAgent(row.userAgent),
      createdAt: row.createdAt.toISOString(),
      lastSeenAt: row.lastSeenAt.toISOString(),
      current: row.id === currentId,
    }));
    return success({ items });
  } catch (error) {
    return apiFailureFromError(error, { fallbackMessage: "Erro ao carregar as sessões" });
  }
}

/** `DELETE /api/auth/sessions/{id}` — encerra a sessão de um aparelho (a do próprio usuário). */
export async function revokeAuthSession(request: Request, context?: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!context) throw new HttpError("Sessão não encontrada", 404);
    const { id } = await context.params;
    const currentId = await getCurrentSessionId();

    const revoked = await prisma.authSession.updateMany({
      where: { id, userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    if (revoked.count !== 1) throw new HttpError("Sessão não encontrada", 404);

    await recordSecurityEvent({ userId, type: "SESSIONS_REVOKED", userAgent: request.headers.get("user-agent") });
    return success({ id, revokedCurrent: id === currentId }, "Sessão encerrada");
  } catch (error) {
    return apiFailureFromError(error, { fallbackMessage: "Erro ao encerrar a sessão" });
  }
}

/** `POST /api/auth/sessions/revoke-others` — encerra todas as sessões, menos a deste aparelho. */
export async function revokeOtherAuthSessions(request: Request) {
  try {
    const userId = await getAuthenticatedUserId();
    const currentId = await getCurrentSessionId();

    const revoked = await prisma.authSession.updateMany({
      where: { userId, revokedAt: null, ...(currentId ? { id: { not: currentId } } : {}) },
      data: { revokedAt: new Date() },
    });
    if (revoked.count > 0) {
      await recordSecurityEvent({ userId, type: "SESSIONS_REVOKED", userAgent: request.headers.get("user-agent") });
    }
    return success({ revoked: revoked.count }, revoked.count > 0 ? "Outras sessões encerradas" : "Não há outras sessões");
  } catch (error) {
    return apiFailureFromError(error, { fallbackMessage: "Erro ao encerrar as outras sessões" });
  }
}

/** `GET /api/auth/events` — últimos eventos de segurança da conta. */
export async function listSecurityEvents() {
  try {
    const userId = await getAuthenticatedUserId();
    const rows = await prisma.accountSecurityEvent.findMany({
      where: { userId },
      select: { id: true, type: true, userAgent: true, createdAt: true },
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      take: EVENT_LIMIT,
    });
    return success({
      items: rows.map((row) => ({
        id: row.id,
        type: row.type,
        device: row.userAgent ? describeUserAgent(row.userAgent) : null,
        createdAt: row.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    return apiFailureFromError(error, { fallbackMessage: "Erro ao carregar o histórico de segurança" });
  }
}
