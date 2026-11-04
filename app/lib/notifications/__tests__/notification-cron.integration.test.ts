import { randomUUID } from "node:crypto";
import { afterAll, afterEach, describe, expect, it, vi } from "vitest";

const generationMocks = vi.hoisted(() => ({ failFor: new Set<string>() }));

vi.mock("@/app/lib/notifications/notification-generation", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/app/lib/notifications/notification-generation")>();
  return {
    ...actual,
    generateNotificationsForUser: async (userId: string, now?: Date) => {
      if (generationMocks.failFor.has(userId)) throw new Error("falha simulada");
      return actual.generateNotificationsForUser(userId, now);
    },
  };
});

import { runNotificationsCron } from "@/app/lib/notifications/notification-cron";
import { prisma } from "@/app/lib/prisma";

const createdUserIds: string[] = [];

afterEach(async () => {
  generationMocks.failFor.clear();
  if (createdUserIds.length > 0) {
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds.splice(0) } } });
  }
});

afterAll(async () => {
  await prisma.$disconnect();
});

async function userWithDueBill(label: string) {
  const user = await prisma.user.create({
    data: { name: label, email: `cron-${randomUUID()}@example.com`, password: "test-hash" },
  });
  createdUserIds.push(user.id);
  const account = await prisma.account.create({
    data: { name: "Conta", type: "CREDIT_DEBIT", currency: "BRL", userId: user.id },
  });
  const income = await prisma.category.create({
    data: { name: `Salário ${randomUUID()}`.slice(0, 50), type: "INCOME", userId: user.id },
  });
  const expense = await prisma.category.create({
    data: { name: `Mercado ${randomUUID()}`.slice(0, 50), type: "EXPENSE", userId: user.id },
  });
  const common = { userId: user.id, accountId: account.id, kind: "NORMAL" as const };
  await prisma.transaction.create({
    data: { ...common, categoryId: income.id, type: "INCOME", status: "COMPLETED", amount: 50_000_000, description: "Saldo", year: 2026, month: 11, day: 1 },
  });
  await prisma.transaction.create({
    data: { ...common, categoryId: expense.id, type: "EXPENSE", status: "PENDING", amount: 10_000, description: "Aluguel", year: 2026, month: 11, day: 11 },
  });
  return user;
}

const NOW = new Date("2026-11-10T15:00:00.000Z");

describe("runNotificationsCron", () => {
  it("gera avisos para os usuários e é idempotente numa segunda execução", async () => {
    const first = await userWithDueBill("Um");
    const second = await userWithDueBill("Dois");

    await runNotificationsCron(NOW);
    const again = await runNotificationsCron(NOW);

    expect(await prisma.notification.count({ where: { userId: first.id } })).toBe(1);
    expect(await prisma.notification.count({ where: { userId: second.id } })).toBe(1);
    expect(again.createdNotifications).toBe(0);
  });

  it("a falha de um usuário não interrompe os outros e o resultado fica parcial", async () => {
    const broken = await userWithDueBill("Quebrado");
    const healthy = await userWithDueBill("Saudável");
    generationMocks.failFor.add(broken.id);

    const metrics = await runNotificationsCron(NOW);

    expect(metrics.failedUsers).toBeGreaterThanOrEqual(1);
    expect(metrics.status).toBe("partial");
    expect(await prisma.notification.count({ where: { userId: healthy.id } })).toBe(1);
    expect(await prisma.notification.count({ where: { userId: broken.id } })).toBe(0);
  });
});
