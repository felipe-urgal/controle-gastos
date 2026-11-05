import { afterAll, afterEach, describe, expect, it, vi } from "vitest";

const authMocks = vi.hoisted(() => ({ getAuthenticatedUserId: vi.fn() }));

vi.mock("@/app/lib/auth", () => ({
  getAuthenticatedUserId: authMocks.getAuthenticatedUserId,
}));

import { MONTH_LOCKED_CODE } from "@/app/lib/monthly-closing/month-lock";
import { prisma } from "@/app/lib/prisma";
import { bulkUpdateTransactions } from "@/app/lib/transactions/bulk-update";
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
  const owner = await fixtures.user({ name: "Bulk Owner" });
  const account = await fixtures.account(owner.id, { name: "Conta lote", currency: "BRL" });
  const food = await fixtures.category(owner.id, { name: "Comida lote", type: "EXPENSE" });
  const market = await fixtures.category(owner.id, { name: "Mercado lote", type: "EXPENSE" });
  const salary = await fixtures.category(owner.id, { name: "Salário lote", type: "INCOME" });
  const shop = await prisma.merchant.create({ data: { userId: owner.id, name: "Loja do lote" } });
  const add = (overrides: Record<string, unknown> = {}) =>
    prisma.transaction.create({
      data: {
        userId: owner.id, accountId: account.id, categoryId: food.id, amount: 3_000, type: "EXPENSE",
        status: "COMPLETED", description: "Compra", year: 2028, month: 4, day: 10, ...overrides,
      },
    });
  authMocks.getAuthenticatedUserId.mockResolvedValue(owner.id);
  return { owner, account, food, market, salary, shop, add };
}

function patch(body: unknown) {
  return bulkUpdateTransactions(
    new Request("http://localhost/api/transactions/bulk", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

const read = (id: string) => prisma.transaction.findUniqueOrThrow({ where: { id } });

describe("edição em lote de transações", () => {
  it("troca categoria e estabelecimento de várias, e remove o estabelecimento com null", async () => {
    const { food, market, shop, add } = await setup();
    const a = await add();
    const b = await add({ month: 5 });

    const response = await patch({ ids: [a.id, b.id], changes: { categoryId: market.id, merchantId: shop.id } });
    expect(response.status).toBe(200);
    expect((await response.json()).data).toEqual({ updated: 2 });
    expect(await read(a.id)).toMatchObject({ categoryId: market.id, merchantId: shop.id });
    expect(await read(b.id)).toMatchObject({ categoryId: market.id, merchantId: shop.id });

    expect((await patch({ ids: [a.id], changes: { merchantId: null } })).status).toBe(200);
    expect(await read(a.id)).toMatchObject({ categoryId: market.id, merchantId: null });
    expect((await read(b.id)).merchantId).toBe(shop.id);
    expect(food.id).not.toBe(market.id);
  });

  it("é tudo ou nada: uma transação impedida cancela a seleção inteira", async () => {
    const { owner, food, market, salary, add } = await setup();
    const ok = await add();
    const lockedMonth = await add({ month: 6 });
    await prisma.lockedMonth.create({ data: { userId: owner.id, year: 2028, month: 6 } });
    const reconciled = await add({ reconciliationStatus: "RECONCILED", reconciledAt: new Date() });
    const income = await add({ type: "INCOME", categoryId: salary.id });
    const split = await add();
    await prisma.transactionAllocation.createMany({
      data: [
        { userId: owner.id, transactionId: split.id, categoryId: food.id, amount: 1_000 },
        { userId: owner.id, transactionId: split.id, categoryId: market.id, amount: 2_000 },
      ],
    });
    const opening = await add({ kind: "OPENING_BALANCE", categoryId: null, type: "INCOME", description: "Saldo inicial" });

    const attempt = async (blocker: { id: string }, changes: Record<string, unknown> = { categoryId: market.id }) => {
      const response = await patch({ ids: [ok.id, blocker.id], changes });
      return { status: response.status, error: (await response.json()).error };
    };

    expect(await attempt(lockedMonth)).toMatchObject({ status: 409, error: { code: MONTH_LOCKED_CODE } });
    expect(await attempt(reconciled)).toMatchObject({ status: 409, error: { code: "BULK_RECONCILED" } });
    expect(await attempt(income)).toMatchObject({ status: 400, error: { code: "BULK_CATEGORY_TYPE" } });
    expect(await attempt(split)).toMatchObject({ status: 409, error: { code: "BULK_HAS_ALLOCATIONS" } });
    expect(await attempt(opening)).toMatchObject({ status: 409, error: { code: "BULK_NOT_NORMAL" } });

    expect((await read(ok.id)).categoryId).toBe(food.id);
    // Só o estabelecimento muda numa transação dividida: não mexe nas categorias, então passa.
    const shop = await prisma.merchant.create({ data: { userId: owner.id, name: "Outra loja" } });
    expect((await patch({ ids: [split.id], changes: { merchantId: shop.id } })).status).toBe(200);
  });

  it("não toca no que é de outro usuário e valida a entrada", async () => {
    const { owner, market, add } = await setup();
    const mine = await add();
    const stranger = await fixtures.user({ name: "Bulk Stranger" });
    const foreignAccount = await fixtures.account(stranger.id, { name: "Alheia", currency: "BRL" });
    const foreignCategory = await fixtures.category(stranger.id, { name: "Alheia cat", type: "EXPENSE" });
    const foreign = await prisma.transaction.create({
      data: { userId: stranger.id, accountId: foreignAccount.id, categoryId: foreignCategory.id, amount: 1_000, type: "EXPENSE", status: "COMPLETED", description: "Alheia", year: 2028, month: 4, day: 1 },
    });

    expect((await patch({ ids: [mine.id, foreign.id], changes: { categoryId: market.id } })).status).toBe(404);
    expect((await patch({ ids: [mine.id], changes: { categoryId: foreignCategory.id } })).status).toBe(400);
    expect((await patch({ ids: [mine.id], changes: {} })).status).toBe(400);
    expect((await patch({ ids: [], changes: { categoryId: market.id } })).status).toBe(400);
    expect((await patch({ ids: ["nao-uuid"], changes: { categoryId: market.id } })).status).toBe(400);
    expect((await patch({ ids: Array.from({ length: 101 }, () => crypto.randomUUID()), changes: { categoryId: market.id } })).status).toBe(400);
    expect((await read(mine.id)).categoryId).not.toBe(market.id);
    expect((await read(foreign.id)).categoryId).toBe(foreignCategory.id);
    expect(owner.id).not.toBe(stranger.id);
  });
});
