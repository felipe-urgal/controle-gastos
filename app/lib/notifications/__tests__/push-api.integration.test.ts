import { randomUUID } from "node:crypto";
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const authMocks = vi.hoisted(() => ({ getAuthenticatedUserId: vi.fn() }));

vi.mock("@/app/lib/auth", () => ({
  getAuthenticatedUserId: authMocks.getAuthenticatedUserId,
}));

import { UnauthorizedError } from "@/app/lib/auth/auth-errors";
import { getPushPublicKey, subscribePush, unsubscribePush } from "@/app/lib/notifications/push-api";
import { MAX_PUSH_SUBSCRIPTIONS_PER_USER } from "@/app/lib/notifications/push-schema";
import { prisma } from "@/app/lib/prisma";

const ENV = ["VAPID_PUBLIC_KEY", "VAPID_PRIVATE_KEY", "VAPID_SUBJECT"] as const;
const saved: Record<string, string | undefined> = {};
const createdUserIds: string[] = [];

beforeEach(() => {
  for (const name of ENV) saved[name] = process.env[name];
  process.env.VAPID_PUBLIC_KEY = "public-key";
  process.env.VAPID_PRIVATE_KEY = "private-key";
  process.env.VAPID_SUBJECT = "mailto:avisos@example.test";
});

afterEach(async () => {
  authMocks.getAuthenticatedUserId.mockReset();
  for (const name of ENV) {
    if (saved[name] === undefined) delete process.env[name];
    else process.env[name] = saved[name];
  }
  if (createdUserIds.length > 0) {
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds.splice(0) } } });
  }
});

afterAll(async () => {
  await prisma.$disconnect();
});

async function createUser() {
  const user = await prisma.user.create({
    data: { name: "Push", email: `push-${randomUUID()}@example.com`, password: "test-hash" },
  });
  createdUserIds.push(user.id);
  return user;
}

const as = (userId: string) => authMocks.getAuthenticatedUserId.mockResolvedValue(userId);
const post = (body: unknown, method = "POST") =>
  new Request("http://localhost/api/push/subscribe", {
    method,
    headers: { "content-type": "application/json", "user-agent": "Teste/1.0" },
    body: JSON.stringify(body),
  });
const subscription = (endpoint = `https://push.example.test/${randomUUID()}`) => ({
  endpoint,
  keys: { p256dh: "BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DkM", auth: "tBHItJI5svbpez7KI4CCXg" },
});

describe("API de push", () => {
  it("exige autenticação", async () => {
    authMocks.getAuthenticatedUserId.mockRejectedValue(new UnauthorizedError());

    expect((await getPushPublicKey()).status).toBe(401);
    expect((await subscribePush(post(subscription()))).status).toBe(401);
    expect((await unsubscribePush(post({ endpoint: "x" }, "DELETE"))).status).toBe(401);
  });

  it("entrega a chave pública e diz se o push está configurado", async () => {
    const user = await createUser();
    as(user.id);

    expect((await (await getPushPublicKey()).json()).data).toEqual({ configured: true, publicKey: "public-key" });

    delete process.env.VAPID_PRIVATE_KEY;
    expect((await (await getPushPublicKey()).json()).data).toEqual({ configured: false, publicKey: null });
  });

  it("sem VAPID configurado a inscrição é recusada com 503", async () => {
    const user = await createUser();
    as(user.id);
    delete process.env.VAPID_SUBJECT;

    expect((await subscribePush(post(subscription()))).status).toBe(503);
    expect(await prisma.pushSubscription.count({ where: { userId: user.id } })).toBe(0);
  });

  it("grava a inscrição do aparelho e é idempotente para o mesmo endpoint", async () => {
    const user = await createUser();
    as(user.id);
    const body = subscription();

    const first = await subscribePush(post(body));
    const second = await subscribePush(post(body));

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    const rows = await prisma.pushSubscription.findMany({ where: { userId: user.id } });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ endpoint: body.endpoint, userAgent: "Teste/1.0", disabledAt: null });
  });

  it("rejeita endpoint sem https, chaves inválidas e corpo vazio, sem gravar nada", async () => {
    const user = await createUser();
    as(user.id);
    const valid = subscription();

    const bodies = [
      { ...valid, endpoint: "http://push.example.test/x" },
      { ...valid, endpoint: "não é url" },
      { ...valid, keys: { ...valid.keys, p256dh: "com espaço!" } },
      { ...valid, keys: { p256dh: valid.keys.p256dh } },
      { ...valid, endpoint: `https://push.example.test/${"x".repeat(2100)}` },
      {},
    ];
    for (const body of bodies) {
      expect((await subscribePush(post(body))).status).toBe(400);
    }
    expect(await prisma.pushSubscription.count({ where: { userId: user.id } })).toBe(0);
  });

  it("o aparelho que troca de conta passa a pertencer a quem entrou por último", async () => {
    const first = await createUser();
    const second = await createUser();
    const body = subscription();

    as(first.id);
    await subscribePush(post(body));
    as(second.id);
    await subscribePush(post(body));

    expect(await prisma.pushSubscription.count({ where: { userId: first.id } })).toBe(0);
    expect(await prisma.pushSubscription.count({ where: { userId: second.id } })).toBe(1);
  });

  it("reativa uma inscrição que estava desativada", async () => {
    const user = await createUser();
    as(user.id);
    const body = subscription();
    await subscribePush(post(body));
    await prisma.pushSubscription.updateMany({ where: { userId: user.id }, data: { disabledAt: new Date() } });

    await subscribePush(post(body));

    expect((await prisma.pushSubscription.findFirstOrThrow({ where: { userId: user.id } })).disabledAt).toBeNull();
  });

  it("limita a 10 aparelhos por usuário, mantendo os mais recentes", async () => {
    const user = await createUser();
    as(user.id);
    const endpoints: string[] = [];
    for (let index = 0; index < MAX_PUSH_SUBSCRIPTIONS_PER_USER + 2; index += 1) {
      const body = subscription();
      endpoints.push(body.endpoint);
      await subscribePush(post(body));
      await new Promise((resolve) => setTimeout(resolve, 5));
    }

    const rows = await prisma.pushSubscription.findMany({ where: { userId: user.id } });
    expect(rows).toHaveLength(MAX_PUSH_SUBSCRIPTIONS_PER_USER);
    expect(rows.map((row) => row.endpoint)).not.toContain(endpoints[0]);
    expect(rows.map((row) => row.endpoint)).toContain(endpoints.at(-1));
  });

  it("cancelar remove só o aparelho do próprio usuário e é idempotente", async () => {
    const owner = await createUser();
    const intruder = await createUser();
    const body = subscription();
    as(owner.id);
    await subscribePush(post(body));

    as(intruder.id);
    expect((await unsubscribePush(post({ endpoint: body.endpoint }, "DELETE"))).status).toBe(200);
    expect(await prisma.pushSubscription.count({ where: { userId: owner.id } })).toBe(1);

    as(owner.id);
    expect((await unsubscribePush(post({ endpoint: body.endpoint }, "DELETE"))).status).toBe(200);
    expect((await unsubscribePush(post({ endpoint: body.endpoint }, "DELETE"))).status).toBe(200);
    expect(await prisma.pushSubscription.count({ where: { userId: owner.id } })).toBe(0);
    expect((await unsubscribePush(post({}, "DELETE"))).status).toBe(400);
  });
});
