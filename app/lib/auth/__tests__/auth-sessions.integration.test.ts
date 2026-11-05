import { randomUUID } from "node:crypto";
import jwt from "jsonwebtoken";
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ cookies: vi.fn() }));

vi.mock("next/headers", () => ({ cookies: mocks.cookies }));

import { getAuthenticatedUserId, UnauthorizedError } from "@/app/lib/auth";
import {
  describeUserAgent,
  issueAuthSession,
  recordSecurityEvent,
  SESSION_TOUCH_INTERVAL_MS,
} from "@/app/lib/auth/auth-session";
import {
  listAuthSessions,
  listSecurityEvents,
  revokeAuthSession,
  revokeOtherAuthSessions,
} from "@/app/lib/auth/auth-session-api";
import { verifyAuthToken } from "@/app/lib/auth/auth-token";
import { prisma } from "@/app/lib/prisma";

const JWT_SECRET = "test-jwt-secret-with-sufficient-length";
const createdUserIds: string[] = [];

beforeEach(() => {
  process.env.JWT_SECRET = JWT_SECRET;
});

afterEach(async () => {
  mocks.cookies.mockReset();
  if (createdUserIds.length > 0) {
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds.splice(0) } } });
  }
});

afterAll(async () => {
  await prisma.$disconnect();
});

async function createUser() {
  const user = await prisma.user.create({
    data: { name: "Session User", email: "session-" + randomUUID() + "@example.com", password: "test-hash" },
  });
  createdUserIds.push(user.id);
  return user;
}

const request = (userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64) Chrome/130.0 Safari/537.36") =>
  new Request("http://localhost/api/auth/login", { headers: { "user-agent": userAgent } });

function setCookieToken(token: string) {
  mocks.cookies.mockResolvedValue({ get: (name: string) => (name === "token" ? { value: token } : undefined) });
}

describe("sessões por aparelho", () => {
  it("emite sessão com sid no token, registra o login e autentica", async () => {
    const user = await createUser();
    const { sessionId, token } = await issueAuthSession({ userId: user.id, authVersion: 0, request: request() });

    expect(verifyAuthToken(token)).toMatchObject({ userId: user.id, authVersion: 0, sessionId });
    expect(await prisma.authSession.findUniqueOrThrow({ where: { id: sessionId } })).toMatchObject({ userId: user.id, revokedAt: null });
    expect((await prisma.accountSecurityEvent.findMany({ where: { userId: user.id } })).map((event) => event.type)).toEqual(["LOGIN"]);

    setCookieToken(token);
    await expect(getAuthenticatedUserId()).resolves.toBe(user.id);
  });

  it("token antigo, sem sid, continua valendo (compatibilidade com o que já está em uso)", async () => {
    const user = await createUser();
    setCookieToken(jwt.sign({ sub: user.id, authVersion: 0 }, JWT_SECRET, { algorithm: "HS256", expiresIn: "1h", issuer: "seu-app", audience: "seu-app-users" }));
    await expect(getAuthenticatedUserId()).resolves.toBe(user.id);
  });

  it("revogada, vencida, de outra versão da conta ou inexistente deixa de autenticar", async () => {
    const user = await createUser();
    const revoked = await issueAuthSession({ userId: user.id, authVersion: 0, request: request() });
    const expired = await issueAuthSession({ userId: user.id, authVersion: 0, request: request(), now: new Date(Date.now() - 8 * 24 * 3600 * 1000) });
    const stale = await issueAuthSession({ userId: user.id, authVersion: 0, request: request() });

    await prisma.authSession.update({ where: { id: revoked.sessionId }, data: { revokedAt: new Date() } });
    await prisma.authSession.update({ where: { id: stale.sessionId }, data: { authVersion: 7 } });

    for (const token of [revoked.token, expired.token, stale.token]) {
      setCookieToken(token);
      await expect(getAuthenticatedUserId()).rejects.toBeInstanceOf(UnauthorizedError);
    }

    // sid que não existe no banco.
    setCookieToken(jwt.sign({ sub: user.id, authVersion: 0, sid: randomUUID() }, JWT_SECRET, { algorithm: "HS256", expiresIn: "1h", issuer: "seu-app", audience: "seu-app-users" }));
    await expect(getAuthenticatedUserId()).rejects.toBeInstanceOf(UnauthorizedError);

    // Trocar a senha (authVersion da conta) derruba a sessão mesmo sem tocar na tabela.
    const fresh = await issueAuthSession({ userId: user.id, authVersion: 0, request: request() });
    await prisma.user.update({ where: { id: user.id }, data: { authVersion: { increment: 1 } } });
    setCookieToken(fresh.token);
    await expect(getAuthenticatedUserId()).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it("só atualiza lastSeenAt depois do intervalo mínimo", async () => {
    const user = await createUser();
    const { sessionId, token } = await issueAuthSession({ userId: user.id, authVersion: 0, request: request() });
    setCookieToken(token);

    const before = (await prisma.authSession.findUniqueOrThrow({ where: { id: sessionId } })).lastSeenAt;
    await getAuthenticatedUserId();
    expect((await prisma.authSession.findUniqueOrThrow({ where: { id: sessionId } })).lastSeenAt).toEqual(before);

    const old = new Date(Date.now() - SESSION_TOUCH_INTERVAL_MS - 60_000);
    await prisma.authSession.update({ where: { id: sessionId }, data: { lastSeenAt: old } });
    await getAuthenticatedUserId();
    expect((await prisma.authSession.findUniqueOrThrow({ where: { id: sessionId } })).lastSeenAt.getTime()).toBeGreaterThan(old.getTime() + SESSION_TOUCH_INTERVAL_MS);
  });

  it("lista só as sessões ativas da versão atual, marca a atual, e encerra uma ou as outras", async () => {
    const user = await createUser();
    const phone = await issueAuthSession({ userId: user.id, authVersion: 0, request: request("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Safari/604.1") });
    const laptop = await issueAuthSession({ userId: user.id, authVersion: 0, request: request() });
    const revoked = await issueAuthSession({ userId: user.id, authVersion: 0, request: request() });
    await prisma.authSession.update({ where: { id: revoked.sessionId }, data: { revokedAt: new Date() } });
    const stranger = await createUser();
    const foreign = await issueAuthSession({ userId: stranger.id, authVersion: 0, request: request() });

    setCookieToken(laptop.token);
    const list = (await (await listAuthSessions()).json()).data.items as Array<{ id: string; device: string; current: boolean }>;
    expect(list.map((item) => item.id).sort()).toEqual([phone.sessionId, laptop.sessionId].sort());
    expect(list.find((item) => item.id === laptop.sessionId)).toMatchObject({ device: "Chrome em Windows", current: true });
    expect(list.find((item) => item.id === phone.sessionId)).toMatchObject({ device: "Safari em iOS", current: false });

    // Não encerra a sessão de outro usuário.
    expect((await revokeAuthSession(request(), { params: Promise.resolve({ id: foreign.sessionId }) })).status).toBe(404);

    const one = await revokeAuthSession(request(), { params: Promise.resolve({ id: phone.sessionId }) });
    expect(one.status).toBe(200);
    expect((await one.json()).data).toMatchObject({ revokedCurrent: false });
    expect((await prisma.authSession.findUniqueOrThrow({ where: { id: phone.sessionId } })).revokedAt).not.toBeNull();

    const other = await issueAuthSession({ userId: user.id, authVersion: 0, request: request() });
    const others = await revokeOtherAuthSessions(request());
    expect((await others.json()).data).toEqual({ revoked: 1 });
    expect((await prisma.authSession.findUniqueOrThrow({ where: { id: other.sessionId } })).revokedAt).not.toBeNull();
    expect((await prisma.authSession.findUniqueOrThrow({ where: { id: laptop.sessionId } })).revokedAt).toBeNull();
    expect((await prisma.authSession.findUniqueOrThrow({ where: { id: foreign.sessionId } })).revokedAt).toBeNull();
  });

  it("exige sessão válida nas rotas e devolve o histórico do próprio usuário", async () => {
    const user = await createUser();
    const { token } = await issueAuthSession({ userId: user.id, authVersion: 0, request: request() });
    await recordSecurityEvent({ userId: user.id, type: "PASSWORD_CHANGED", userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X) Firefox/130.0" });
    const stranger = await createUser();
    await recordSecurityEvent({ userId: stranger.id, type: "TWO_FACTOR_DISABLED" });

    setCookieToken(token);
    const events = (await (await listSecurityEvents()).json()).data.items as Array<{ type: string; device: string | null }>;
    expect(events.map((event) => event.type).sort()).toEqual(["LOGIN", "PASSWORD_CHANGED"]);
    expect(events.find((event) => event.type === "PASSWORD_CHANGED")).toMatchObject({ device: "Firefox em macOS" });

    mocks.cookies.mockResolvedValue({ get: () => undefined });
    expect((await listAuthSessions()).status).toBe(401);
    expect((await listSecurityEvents()).status).toBe(401);
    expect((await revokeOtherAuthSessions(request())).status).toBe(401);
  });
});

describe("describeUserAgent", () => {
  it("resume navegador e sistema, e cai em genérico quando não reconhece", () => {
    expect(describeUserAgent("Mozilla/5.0 (Linux; Android 14) Chrome/130.0 Mobile Safari/537.36")).toBe("Chrome em Android");
    expect(describeUserAgent("Mozilla/5.0 (Windows NT 10.0) Edg/130.0 Chrome/130.0 Safari/537.36")).toBe("Edge em Windows");
    expect(describeUserAgent("curl/8.0")).toBe("Aparelho desconhecido");
    expect(describeUserAgent(null)).toBe("Aparelho desconhecido");
  });
});
