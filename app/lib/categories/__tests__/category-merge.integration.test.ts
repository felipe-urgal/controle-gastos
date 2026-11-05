import { afterAll, afterEach, describe, expect, it, vi } from "vitest";

const authMocks = vi.hoisted(() => ({ getAuthenticatedUserId: vi.fn() }));

vi.mock("@/app/lib/auth", () => ({
  getAuthenticatedUserId: authMocks.getAuthenticatedUserId,
}));

import { mergeCategory } from "@/app/lib/categories/category-merge";
import { MONTH_LOCKED_CODE } from "@/app/lib/monthly-closing/month-lock";
import { prisma } from "@/app/lib/prisma";
import { FinancialTestFactory } from "@/tests/support/financial-test-factory";

const fixtures = new FinancialTestFactory();

afterEach(async () => {
  authMocks.getAuthenticatedUserId.mockReset();
  await fixtures.cleanup();
});

afterAll(async () => {
  await prisma.$disconnect();
});

async function setup() {
  const owner = await fixtures.user({ name: "Merge Owner" });
  const account = await fixtures.account(owner.id, { name: "Conta merge", currency: "BRL" });
  const source = await fixtures.category(owner.id, { name: "Mercado A", type: "EXPENSE" });
  const target = await fixtures.category(owner.id, { name: "Mercado B", type: "EXPENSE" });
  authMocks.getAuthenticatedUserId.mockResolvedValue(owner.id);
  return { owner, account, source, target };
}

function merge(sourceId: string, targetId: string) {
  return mergeCategory(
    new Request(`http://localhost/api/categories/${sourceId}/merge`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ targetId }),
    }),
    { params: Promise.resolve({ id: sourceId }) },
  );
}

function transaction(
  userId: string,
  accountId: string,
  categoryId: string,
  overrides: { year?: number; month?: number } = {},
) {
  return prisma.transaction.create({
    data: {
      userId,
      accountId,
      categoryId,
      amount: 10_000,
      type: "EXPENSE",
      description: "Compra",
      status: "COMPLETED",
      year: overrides.year ?? 2028,
      month: overrides.month ?? 4,
      day: 10,
    },
  });
}

describe("mesclar categorias", () => {
  it("move transações, soma divisões, preserva limites do destino e apaga a origem", async () => {
    const { owner, account, source, target } = await setup();
    const direct = await transaction(owner.id, account.id, source.id);
    const split = await transaction(owner.id, account.id, target.id);
    await prisma.transactionAllocation.createMany({
      data: [
        { userId: owner.id, transactionId: split.id, categoryId: source.id, amount: 3_000 },
        { userId: owner.id, transactionId: split.id, categoryId: target.id, amount: 7_000 },
      ],
    });
    await prisma.categoryMonthlyLimit.createMany({
      data: [
        { userId: owner.id, categoryId: source.id, year: 2028, month: 4, amount: 111 },
        { userId: owner.id, categoryId: source.id, year: 2028, month: 5, amount: 222 },
        { userId: owner.id, categoryId: target.id, year: 2028, month: 4, amount: 999 },
      ],
    });

    const response = await merge(source.id, target.id);
    expect(response.status).toBe(200);
    expect((await response.json()).data).toMatchObject({
      movedTransactions: 1,
      movedAllocations: 1,
      movedLimits: 1,
      discardedLimits: 1,
    });

    expect((await prisma.transaction.findUniqueOrThrow({ where: { id: direct.id } })).categoryId).toBe(target.id);
    const allocations = await prisma.transactionAllocation.findMany({ where: { transactionId: split.id } });
    expect(allocations).toHaveLength(1);
    expect(allocations[0]).toMatchObject({ categoryId: target.id, amount: 10_000 });

    const limits = await prisma.categoryMonthlyLimit.findMany({
      where: { userId: owner.id },
      orderBy: { month: "asc" },
    });
    expect(limits.map((item) => [item.categoryId, item.month, item.amount])).toEqual([
      [target.id, 4, 999],
      [target.id, 5, 222],
    ]);
    expect(await prisma.category.findUnique({ where: { id: source.id } })).toBeNull();
  });

  it("recusa tipo diferente, mesma categoria, destino inativo e categoria de outro usuário", async () => {
    const { owner, source, target } = await setup();
    const income = await fixtures.category(owner.id, { name: "Salário", type: "INCOME" });
    const inactive = await fixtures.category(owner.id, { name: "Antiga", type: "EXPENSE", isActive: false });
    const stranger = await fixtures.user({ name: "Merge Stranger" });
    const foreign = await fixtures.category(stranger.id, { name: "Alheia", type: "EXPENSE" });

    expect((await merge(source.id, income.id)).status).toBe(400);
    expect((await merge(source.id, source.id)).status).toBe(400);
    expect((await merge(source.id, inactive.id)).status).toBe(400);
    expect((await merge(source.id, foreign.id)).status).toBe(404);
    expect((await merge(foreign.id, target.id)).status).toBe(404);
    expect(await prisma.category.findUnique({ where: { id: source.id } })).not.toBeNull();
  });

  it("mês travado bloqueia a mesclagem inteira, sem mudar nada", async () => {
    const { owner, account, source, target } = await setup();
    const open = await transaction(owner.id, account.id, source.id, { month: 4 });
    const locked = await transaction(owner.id, account.id, source.id, { month: 5 });
    await prisma.lockedMonth.create({ data: { userId: owner.id, year: 2028, month: 5 } });

    const response = await merge(source.id, target.id);
    expect(response.status).toBe(409);
    expect((await response.json()).error.code).toBe(MONTH_LOCKED_CODE);

    expect((await prisma.transaction.findUniqueOrThrow({ where: { id: open.id } })).categoryId).toBe(source.id);
    expect((await prisma.transaction.findUniqueOrThrow({ where: { id: locked.id } })).categoryId).toBe(source.id);
    expect(await prisma.category.findUnique({ where: { id: source.id } })).not.toBeNull();
  });
});
