import { randomUUID } from "node:crypto";
import { afterAll, afterEach, describe, expect, it } from "vitest";

import {
  DISABLED_PUSH_RETENTION_DAYS,
  NOTIFICATION_RETENTION_DAYS,
  purgeStaleNotificationData,
} from "@/app/lib/notifications/notification-retention";
import { prisma } from "@/app/lib/prisma";

const createdUserIds: string[] = [];
const NOW = new Date("2026-11-10T11:00:00.000Z");
const DAY = 24 * 60 * 60 * 1000;
const daysAgo = (days: number) => new Date(NOW.getTime() - days * DAY);

afterEach(async () => {
  if (createdUserIds.length > 0) {
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds.splice(0) } } });
  }
});

afterAll(async () => {
  await prisma.$disconnect();
});

async function createUser() {
  const user = await prisma.user.create({
    data: { name: "Retenção", email: `retencao-${randomUUID()}@example.com`, password: "test-hash" },
  });
  createdUserIds.push(user.id);
  return user;
}

const notification = (
  userId: string,
  key: string,
  createdAt: Date,
  state: { readAt?: Date | null; dismissedAt?: Date | null } = {},
) =>
  prisma.notification.create({
    data: {
      userId,
      type: "COMMITMENT_DUE",
      severity: "INFO",
      dedupeKey: key,
      title: key,
      body: "corpo",
      href: "/dashboard",
      createdAt,
      readAt: state.readAt ?? null,
      dismissedAt: state.dismissedAt ?? null,
    },
  });

describe("retenção de avisos e inscrições de push", () => {
  it("apaga avisos lidos ou dispensados com mais de 90 dias e preserva o resto", async () => {
    const user = await createUser();
    const old = NOTIFICATION_RETENTION_DAYS + 1;
    await notification(user.id, "OLD_READ", daysAgo(old), { readAt: daysAgo(old) });
    await notification(user.id, "OLD_DISMISSED", daysAgo(old), { dismissedAt: daysAgo(old) });
    await notification(user.id, "OLD_UNREAD", daysAgo(old));
    await notification(user.id, "RECENT_READ", daysAgo(10), { readAt: daysAgo(9) });
    await notification(user.id, "BORDER_READ", daysAgo(NOTIFICATION_RETENTION_DAYS - 1), { readAt: daysAgo(1) });

    const result = await purgeStaleNotificationData(NOW);

    expect(result.notifications).toBeGreaterThanOrEqual(2);
    const left = await prisma.notification.findMany({ where: { userId: user.id }, orderBy: { dedupeKey: "asc" } });
    expect(left.map((row) => row.dedupeKey)).toEqual(["BORDER_READ", "OLD_UNREAD", "RECENT_READ"]);
  });

  it("apaga inscrições desativadas há mais de 30 dias e mantém as ativas e as recentes", async () => {
    const user = await createUser();
    const sub = (suffix: string, disabledAt: Date | null) =>
      prisma.pushSubscription.create({
        data: {
          userId: user.id,
          endpoint: `https://push.example.test/${suffix}-${randomUUID()}`,
          p256dh: "p",
          auth: "a",
          disabledAt,
        },
      });
    const staleDisabled = await sub("stale", daysAgo(DISABLED_PUSH_RETENTION_DAYS + 1));
    const recentDisabled = await sub("recent", daysAgo(3));
    const active = await sub("active", null);

    await purgeStaleNotificationData(NOW);

    const left = await prisma.pushSubscription.findMany({ where: { userId: user.id } });
    expect(left.map((row) => row.id).sort()).toEqual([recentDisabled.id, active.id].sort());
    expect(left.some((row) => row.id === staleDisabled.id)).toBe(false);
  });
});
