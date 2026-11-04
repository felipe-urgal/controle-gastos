import { randomUUID } from "node:crypto";
import { afterAll, afterEach, describe, expect, it } from "vitest";

import { generateNotificationsForUser } from "@/app/lib/notifications/notification-generation";
import { prisma } from "@/app/lib/prisma";

const createdUserIds: string[] = [];

afterEach(async () => {
  if (createdUserIds.length > 0) {
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds.splice(0) } } });
  }
});

afterAll(async () => {
  await prisma.$disconnect();
});

// 10/11/2026 12:00 em Brasília.
const NOW = new Date("2026-11-10T15:00:00.000Z");

async function setup(options: { showValues?: boolean; funded?: boolean } = {}) {
  const user = await prisma.user.create({
    data: {
      name: "Avisos",
      email: `avisos-${randomUUID()}@example.com`,
      password: "test-hash",
      showValues: options.showValues ?? true,
    },
  });
  createdUserIds.push(user.id);
  const account = await prisma.account.create({
    data: { name: "Conta", type: "CREDIT_DEBIT", currency: "BRL", userId: user.id },
  });
  const category = await prisma.category.create({
    data: { name: `Mercado ${randomUUID()}`.slice(0, 50), type: "EXPENSE", userId: user.id },
  });
  if (options.funded ?? true) {
    // Saldo de sobra: a projeção não fica negativa e só o que cada teste quer avisar aparece.
    const income = await prisma.category.create({
      data: { name: `Salário ${randomUUID()}`.slice(0, 50), type: "INCOME", userId: user.id },
    });
    await prisma.transaction.create({
      data: {
        userId: user.id,
        accountId: account.id,
        categoryId: income.id,
        type: "INCOME",
        kind: "NORMAL",
        status: "COMPLETED",
        amount: 50_000_000,
        description: "Saldo",
        year: 2026,
        month: 11,
        day: 1,
      },
    });
  }
  return { user, account, category };
}

async function pending(
  ctx: Awaited<ReturnType<typeof setup>>,
  description: string,
  date: { year: number; month: number; day: number },
  amount = 150_000,
  status: "PENDING" | "COMPLETED" = "PENDING",
) {
  return prisma.transaction.create({
    data: {
      userId: ctx.user.id,
      accountId: ctx.account.id,
      categoryId: ctx.category.id,
      type: "EXPENSE",
      kind: "NORMAL",
      status,
      amount,
      description,
      ...date,
    },
  });
}

const TOMORROW = { year: 2026, month: 11, day: 11 };

describe("generateNotificationsForUser", () => {
  it("cria o aviso de conta que vence amanhã e não repete numa nova execução", async () => {
    const ctx = await setup();
    await pending(ctx, "Aluguel", TOMORROW);

    const first = await generateNotificationsForUser(ctx.user.id, NOW);
    const second = await generateNotificationsForUser(ctx.user.id, NOW);

    expect(first.created).toBe(1);
    expect(second.created).toBe(0);

    const rows = await prisma.notification.findMany({ where: { userId: ctx.user.id } });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ type: "COMMITMENT_DUE", severity: "WARNING", readAt: null });
    expect(rows[0].title).toContain("Aluguel");
    expect(rows[0].body).toContain("vence amanhã");
  });

  it("usa o dia de Brasília: às 23h30 de 10/11 (já 11/11 em UTC) a conta de 11/11 ainda vence amanhã", async () => {
    const ctx = await setup();
    await pending(ctx, "Aluguel", TOMORROW);

    await generateNotificationsForUser(ctx.user.id, new Date("2026-11-11T02:30:00.000Z"));

    const [row] = await prisma.notification.findMany({ where: { userId: ctx.user.id } });
    expect(row.body).toContain("vence amanhã");
  });

  it("não cria nada para conta concluída, distante ou sem pendências", async () => {
    const ctx = await setup();
    await pending(ctx, "Já paga", TOMORROW, 1_000, "COMPLETED");
    await pending(ctx, "Distante", { year: 2026, month: 11, day: 25 });

    expect((await generateNotificationsForUser(ctx.user.id, NOW)).created).toBe(0);
  });

  it("com valores ocultos o aviso não traz valor monetário", async () => {
    const ctx = await setup({ showValues: false });
    await pending(ctx, "Aluguel", TOMORROW, 150_000);

    await generateNotificationsForUser(ctx.user.id, NOW);

    const [row] = await prisma.notification.findMany({ where: { userId: ctx.user.id } });
    expect(row.body).not.toMatch(/R\$|1\.500/);
  });

  it("respeita a preferência: tipo desligado não gera aviso", async () => {
    const ctx = await setup();
    await pending(ctx, "Aluguel", TOMORROW);
    await prisma.notificationPreference.create({
      data: { userId: ctx.user.id, type: "COMMITMENT_DUE", inApp: false, email: false, push: false },
    });

    expect((await generateNotificationsForUser(ctx.user.id, NOW)).created).toBe(0);
  });

  it("limita a 5 por dia, junta o excedente num resumo e não reabre a cota ao rodar de novo", async () => {
    const ctx = await setup();
    for (let index = 0; index < 8; index += 1) {
      await pending(ctx, `Conta ${index}`, TOMORROW, 10_000 + index);
    }

    const first = await generateNotificationsForUser(ctx.user.id, NOW);
    const second = await generateNotificationsForUser(ctx.user.id, NOW);

    expect(first.created).toBe(5);
    expect(second.created).toBe(0);

    const rows = await prisma.notification.findMany({ where: { userId: ctx.user.id } });
    expect(rows.filter((row) => row.type === "SUMMARY")).toHaveLength(1);
    expect(rows.filter((row) => row.type !== "SUMMARY")).toHaveLength(4);
    expect(rows.find((row) => row.type === "SUMMARY")?.title).toBe("Mais 4 itens pedem atenção");
  });

  it("avisa quando a projeção do saldo fica negativa", async () => {
    const ctx = await setup({ funded: false });
    await pending(ctx, "Aluguel", { year: 2026, month: 11, day: 25 }, 200_000);

    await generateNotificationsForUser(ctx.user.id, NOW);

    const rows = await prisma.notification.findMany({ where: { userId: ctx.user.id } });
    expect(rows.map((row) => row.type)).toEqual(["FORECAST_NEGATIVE"]);
    expect(rows[0].title).toContain("Saldo previsto negativo");
    expect(rows[0].href).toBe(`/contas/show/${ctx.account.id}`);
  });

  it("avisa orçamento da categoria a partir de 80% do limite", async () => {
    const ctx = await setup();
    await prisma.categoryMonthlyLimit.create({
      data: {
        userId: ctx.user.id,
        categoryId: ctx.category.id,
        year: 2026,
        month: 11,
        currency: "BRL",
        amount: 100_000,
      },
    });
    await pending(ctx, "Mercado", { year: 2026, month: 11, day: 5 }, 85_000, "COMPLETED");

    await generateNotificationsForUser(ctx.user.id, NOW);

    const rows = await prisma.notification.findMany({ where: { userId: ctx.user.id } });
    expect(rows.map((row) => row.type)).toContain("BUDGET_LIMIT");
    expect(rows.find((row) => row.type === "BUDGET_LIMIT")?.dedupeKey).toBe(
      `BUDGET_LIMIT:${ctx.category.id}:20261101:P80`,
    );
  });

  it("nunca olha dados de outro usuário", async () => {
    const owner = await setup();
    const other = await setup();
    await pending(owner, "Aluguel", TOMORROW);

    expect((await generateNotificationsForUser(other.user.id, NOW)).created).toBe(0);
    expect(await prisma.notification.count({ where: { userId: other.user.id } })).toBe(0);
  });

  it("usuário inativo não recebe avisos", async () => {
    const ctx = await setup();
    await pending(ctx, "Aluguel", TOMORROW);
    await prisma.user.update({ where: { id: ctx.user.id }, data: { isActive: false } });

    expect((await generateNotificationsForUser(ctx.user.id, NOW)).created).toBe(0);
  });
});
