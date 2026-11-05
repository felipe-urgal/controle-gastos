import type { AccountSecurityEventType, Prisma } from "@prisma/client";

import { signAuthToken } from "@/app/lib/auth/auth-token";
import { prisma } from "@/app/lib/prisma";

export const AUTH_SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // igual ao TTL do token (7d)
/** `lastSeenAt` só é atualizado se passou deste intervalo, para não gravar a cada requisição. */
export const SESSION_TOUCH_INTERVAL_MS = 10 * 60 * 1000;
const EVENT_RETENTION_MS = 180 * 24 * 60 * 60 * 1000;
const REVOKED_SESSION_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

type Db = Pick<Prisma.TransactionClient, "accountSecurityEvent"> | typeof prisma;

/** User agent truncado: identifica o aparelho para a pessoa reconhecer, sem guardar mais do que isso. */
export function normalizeUserAgent(value: string | null | undefined) {
  const trimmed = (value ?? "").replace(/[\u0000-\u001f\u007f]/g, "").trim();
  return trimmed ? trimmed.slice(0, 200) : null;
}

/** Rótulo curto e legível do aparelho a partir do user agent ("Chrome em Windows"). */
export function describeUserAgent(userAgent: string | null | undefined) {
  const ua = userAgent ?? "";
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /OPR\/|Opera/.test(ua)
      ? "Opera"
      : /Firefox\//.test(ua)
        ? "Firefox"
        : /Chrome\//.test(ua)
          ? "Chrome"
          : /Safari\//.test(ua)
            ? "Safari"
            : null;
  const system = /Windows/.test(ua)
    ? "Windows"
    : /Android/.test(ua)
      ? "Android"
      : /iPhone|iPad|iOS/.test(ua)
        ? "iOS"
        : /Mac OS X|Macintosh/.test(ua)
          ? "macOS"
          : /Linux/.test(ua)
            ? "Linux"
            : null;
  if (browser && system) return `${browser} em ${system}`;
  return browser ?? system ?? "Aparelho desconhecido";
}

/**
 * Registra um evento de segurança. Nunca derruba o fluxo que o chamou (login, troca de senha…): se a gravação falhar,
 * o evento só deixa de aparecer no histórico.
 */
export async function recordSecurityEvent(
  args: { userId: string; type: AccountSecurityEventType; userAgent?: string | null },
  db: Db = prisma,
) {
  try {
    await db.accountSecurityEvent.create({
      data: { userId: args.userId, type: args.type, userAgent: normalizeUserAgent(args.userAgent) },
    });
  } catch {
    // Auditoria é best-effort por desenho.
  }
}

/** Cria a sessão do aparelho, registra o login e devolve o token (com `sid`) para o cookie. */
export async function issueAuthSession(args: {
  userId: string;
  authVersion: number;
  request?: Request;
  now?: Date;
}) {
  const now = args.now ?? new Date();
  const userAgent = normalizeUserAgent(args.request?.headers.get("user-agent"));
  const session = await prisma.authSession.create({
    data: {
      userId: args.userId,
      authVersion: args.authVersion,
      userAgent,
      createdAt: now,
      lastSeenAt: now,
      expiresAt: new Date(now.getTime() + AUTH_SESSION_TTL_MS),
    },
    select: { id: true },
  });

  await recordSecurityEvent({ userId: args.userId, type: "LOGIN", userAgent });
  await pruneOldSecurityData(args.userId, now);

  return { sessionId: session.id, token: signAuthToken(args.userId, args.authVersion, session.id) };
}

/** Limpeza oportunista (por usuário, a cada login): sessões vencidas/revogadas há um mês e eventos de mais de 180 dias. */
export async function pruneOldSecurityData(userId: string, now: Date = new Date()) {
  try {
    await Promise.all([
      prisma.authSession.deleteMany({
        where: {
          userId,
          OR: [
            { expiresAt: { lt: new Date(now.getTime() - REVOKED_SESSION_RETENTION_MS) } },
            { revokedAt: { lt: new Date(now.getTime() - REVOKED_SESSION_RETENTION_MS) } },
          ],
        },
      }),
      prisma.accountSecurityEvent.deleteMany({ where: { userId, createdAt: { lt: new Date(now.getTime() - EVENT_RETENTION_MS) } } }),
    ]);
  } catch {
    // Limpeza é best-effort.
  }
}

/**
 * Confere se o token de uma sessão ainda vale: existe, é do usuário, não foi revogada, não venceu e foi emitida na versão
 * atual da conta. Atualiza `lastSeenAt` no máximo a cada `SESSION_TOUCH_INTERVAL_MS`.
 */
export async function isAuthSessionActive(args: {
  sessionId: string;
  userId: string;
  authVersion: number;
  now?: Date;
}) {
  const now = args.now ?? new Date();
  const session = await prisma.authSession.findFirst({
    where: { id: args.sessionId, userId: args.userId },
    select: { revokedAt: true, expiresAt: true, authVersion: true, lastSeenAt: true },
  });
  if (!session || session.revokedAt !== null || session.expiresAt <= now || session.authVersion !== args.authVersion) {
    return false;
  }
  if (now.getTime() - session.lastSeenAt.getTime() > SESSION_TOUCH_INTERVAL_MS) {
    await prisma.authSession
      .updateMany({ where: { id: args.sessionId, userId: args.userId, revokedAt: null }, data: { lastSeenAt: now } })
      .catch(() => undefined);
  }
  return true;
}
