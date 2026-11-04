import { randomUUID } from "node:crypto";
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  emailConfigured: true,
  pushConfigured: true,
  sendNotificationDigest: vi.fn(),
  sendPush: vi.fn(),
}));

vi.mock("@/app/lib/notifications/notification-email", () => ({
  isEmailDeliveryConfigured: () => mocks.emailConfigured,
  sendNotificationDigest: mocks.sendNotificationDigest,
}));
vi.mock("@/app/lib/notifications/push-sender", () => ({
  isPushConfigured: () => mocks.pushConfigured,
  sendPush: mocks.sendPush,
}));

import { deliverNotificationsForUser } from "@/app/lib/notifications/notification-delivery";
import { prisma } from "@/app/lib/prisma";

const createdUserIds: string[] = [];
const NOW = new Date("2026-11-10T11:00:00.000Z");
const HOUR = 60 * 60 * 1000;

beforeEach(() => {
  mocks.emailConfigured = true;
  mocks.pushConfigured = true;
  mocks.sendNotificationDigest.mockReset().mockResolvedValue(undefined);
  mocks.sendPush.mockReset().mockResolvedValue("sent");
});

afterEach(async () => {
  if (createdUserIds.length > 0) {
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds.splice(0) } } });
  }
});

afterAll(async () => {
  await prisma.$disconnect();
});

async function createUser(options: { verified?: boolean } = {}) {
  const user = await prisma.user.create({
    data: {
      name: "Entrega",
      email: `entrega-${randomUUID()}@example.com`,
      password: "test-hash",
      emailVerifiedAt: options.verified === false ? null : new Date(),
    },
  });
  createdUserIds.push(user.id);
  return user;
}

async function notify(
  userId: string,
  key: string,
  overrides: Partial<{ createdAt: Date; dismissedAt: Date | null; type: "COMMITMENT_DUE" | "BUDGET_LIMIT" }> = {},
) {
  return prisma.notification.create({
    data: {
      userId,
      type: overrides.type ?? "COMMITMENT_DUE",
      severity: "WARNING",
      dedupeKey: key,
      title: `Aviso ${key}`,
      body: "vence amanhã",
      href: "/compromissos",
      createdAt: overrides.createdAt ?? NOW,
      dismissedAt: overrides.dismissedAt ?? null,
    },
  });
}

const prefer = (userId: string, type: "COMMITMENT_DUE" | "BUDGET_LIMIT", channels: { email?: boolean; push?: boolean }) =>
  prisma.notificationPreference.create({
    data: { userId, type, inApp: true, email: channels.email ?? false, push: channels.push ?? false },
  });

const subscribe = (userId: string, suffix: string = randomUUID()) =>
  prisma.pushSubscription.create({
    data: { userId, endpoint: `https://push.example.test/${suffix}`, p256dh: "p", auth: "a" },
  });

describe("e-mail diário", () => {
  it("manda um único e-mail com os avisos do tipo ligado e não reenvia depois", async () => {
    const user = await createUser();
    await prefer(user.id, "COMMITMENT_DUE", { email: true });
    await notify(user.id, "A");
    await notify(user.id, "B");
    await notify(user.id, "C", { type: "BUDGET_LIMIT" });

    const first = await deliverNotificationsForUser(user.id, NOW);
    const second = await deliverNotificationsForUser(user.id, NOW);

    expect(first.emailed).toBe(2);
    expect(second.emailed).toBe(0);
    expect(mocks.sendNotificationDigest).toHaveBeenCalledTimes(1);
    const call = mocks.sendNotificationDigest.mock.calls[0][0];
    expect(call.to).toBe(user.email);
    expect(call.items.map((item: { title: string }) => item.title).sort()).toEqual(["Aviso A", "Aviso B"]);

    const rows = await prisma.notification.findMany({ where: { userId: user.id }, orderBy: { dedupeKey: "asc" } });
    expect(rows.map((row) => row.emailedAt !== null)).toEqual([true, true, false]);
  });

  it("é opt-in: sem escolha do usuário nada sai por e-mail", async () => {
    const user = await createUser();
    await notify(user.id, "A");

    expect((await deliverNotificationsForUser(user.id, NOW)).emailed).toBe(0);
    expect(mocks.sendNotificationDigest).not.toHaveBeenCalled();
  });

  it("e-mail não verificado não recebe", async () => {
    const user = await createUser({ verified: false });
    await prefer(user.id, "COMMITMENT_DUE", { email: true });
    await notify(user.id, "A");

    expect((await deliverNotificationsForUser(user.id, NOW)).emailed).toBe(0);
    expect(mocks.sendNotificationDigest).not.toHaveBeenCalled();
  });

  it("sem Resend configurado fica desligado em silêncio", async () => {
    mocks.emailConfigured = false;
    const user = await createUser();
    await prefer(user.id, "COMMITMENT_DUE", { email: true });
    await notify(user.id, "A");

    expect(await deliverNotificationsForUser(user.id, NOW)).toEqual({ emailed: 0, pushed: 0, failures: 0 });
  });

  it("se o provedor recusar, conta a falha, não marca como enviado e tenta de novo na execução seguinte", async () => {
    const user = await createUser();
    await prefer(user.id, "COMMITMENT_DUE", { email: true });
    await notify(user.id, "A");
    mocks.sendNotificationDigest.mockRejectedValueOnce(new Error("AUTH_EMAIL_DELIVERY_FAILED"));

    const failed = await deliverNotificationsForUser(user.id, NOW);
    expect(failed).toMatchObject({ emailed: 0, failures: 1 });
    expect((await prisma.notification.findFirstOrThrow({ where: { userId: user.id } })).emailedAt).toBeNull();

    const retry = await deliverNotificationsForUser(user.id, new Date(NOW.getTime() + HOUR));
    expect(retry.emailed).toBe(1);
  });

  it("ignora avisos com mais de 24 h, dispensados e de outros usuários", async () => {
    const user = await createUser();
    const other = await createUser();
    await prefer(user.id, "COMMITMENT_DUE", { email: true });
    await prefer(other.id, "COMMITMENT_DUE", { email: true });
    await notify(user.id, "OLD", { createdAt: new Date(NOW.getTime() - 25 * HOUR) });
    await notify(user.id, "GONE", { dismissedAt: new Date(NOW.getTime() - HOUR) });
    await notify(user.id, "NEW");
    await notify(other.id, "THEIRS");

    await deliverNotificationsForUser(user.id, NOW);

    const titles = mocks.sendNotificationDigest.mock.calls[0][0].items.map((item: { title: string }) => item.title);
    expect(titles).toEqual(["Aviso NEW"]);
  });
});

describe("push", () => {
  it("manda um push por aviso para cada aparelho, com título, texto e destino, e marca a entrega", async () => {
    const user = await createUser();
    await prefer(user.id, "COMMITMENT_DUE", { push: true });
    await notify(user.id, "A");
    const first = await subscribe(user.id);
    await subscribe(user.id);

    const result = await deliverNotificationsForUser(user.id, NOW);
    const again = await deliverNotificationsForUser(user.id, NOW);

    expect(result.pushed).toBe(1);
    expect(again.pushed).toBe(0);
    expect(mocks.sendPush).toHaveBeenCalledTimes(2);
    expect(mocks.sendPush.mock.calls[0][1]).toEqual({ title: "Aviso A", body: "vence amanhã", url: "/compromissos" });
    expect((await prisma.notification.findFirstOrThrow({ where: { userId: user.id } })).pushedAt).not.toBeNull();
    expect((await prisma.pushSubscription.findUniqueOrThrow({ where: { id: first.id } })).lastSuccessAt).not.toBeNull();
  });

  it("inscrição expirada (404/410) é desativada e o aviso não conta como entregue", async () => {
    const user = await createUser();
    await prefer(user.id, "COMMITMENT_DUE", { push: true });
    await notify(user.id, "A");
    const subscription = await subscribe(user.id);
    mocks.sendPush.mockResolvedValue("gone");

    const result = await deliverNotificationsForUser(user.id, NOW);

    expect(result.pushed).toBe(0);
    expect((await prisma.pushSubscription.findUniqueOrThrow({ where: { id: subscription.id } })).disabledAt).not.toBeNull();
    expect((await prisma.notification.findFirstOrThrow({ where: { userId: user.id } })).pushedAt).toBeNull();

    mocks.sendPush.mockClear();
    await deliverNotificationsForUser(user.id, NOW);
    expect(mocks.sendPush).not.toHaveBeenCalled();
  });

  it("falha de rede conta como falha e o aviso fica para a próxima tentativa", async () => {
    const user = await createUser();
    await prefer(user.id, "COMMITMENT_DUE", { push: true });
    await notify(user.id, "A");
    await subscribe(user.id);
    mocks.sendPush.mockResolvedValueOnce("failed");

    const failed = await deliverNotificationsForUser(user.id, NOW);
    expect(failed).toMatchObject({ pushed: 0, failures: 1 });

    const retry = await deliverNotificationsForUser(user.id, new Date(NOW.getTime() + HOUR));
    expect(retry.pushed).toBe(1);
  });

  it("sem aparelho inscrito, sem preferência ou sem VAPID não envia nada", async () => {
    const withoutDevice = await createUser();
    await prefer(withoutDevice.id, "COMMITMENT_DUE", { push: true });
    await notify(withoutDevice.id, "A");

    const withoutPreference = await createUser();
    await notify(withoutPreference.id, "B");
    await subscribe(withoutPreference.id);

    expect((await deliverNotificationsForUser(withoutDevice.id, NOW)).pushed).toBe(0);
    expect((await deliverNotificationsForUser(withoutPreference.id, NOW)).pushed).toBe(0);

    mocks.pushConfigured = false;
    const configured = await createUser();
    await prefer(configured.id, "COMMITMENT_DUE", { push: true });
    await notify(configured.id, "C");
    await subscribe(configured.id);
    await deliverNotificationsForUser(configured.id, NOW);

    expect(mocks.sendPush).not.toHaveBeenCalled();
  });

  it("aparelho de outro usuário nunca recebe", async () => {
    const owner = await createUser();
    const other = await createUser();
    await prefer(owner.id, "COMMITMENT_DUE", { push: true });
    await notify(owner.id, "A");
    await subscribe(other.id, "other-device");

    await deliverNotificationsForUser(owner.id, NOW);

    expect(mocks.sendPush).not.toHaveBeenCalled();
  });
});
