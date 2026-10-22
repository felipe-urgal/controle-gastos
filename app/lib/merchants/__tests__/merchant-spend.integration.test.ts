import { afterAll, afterEach, describe, expect, it, vi } from "vitest";

const authMocks = vi.hoisted(() => ({
  getAuthenticatedUserId: vi.fn(),
}));

vi.mock("@/app/lib/auth", () => ({
  getAuthenticatedUserId: authMocks.getAuthenticatedUserId,
}));

import { logicalDateFromUtcInstant } from "@/app/lib/date/logical-date";
import { merchantCrud } from "@/app/lib/merchants/merchant-crud";
import { previousMonth } from "@/app/lib/merchants/merchant-spend-model";
import { prisma } from "@/app/lib/prisma";
import { FinancialTestFactory } from "@/tests/support/financial-test-factory";

const factory = new FinancialTestFactory();

afterEach(async () => {
  authMocks.getAuthenticatedUserId.mockReset();
  await factory.cleanup();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("merchant list spend", () => {
  it("devolve o gasto do mês, a comparação e o resumo, sem vazar outro usuário", async () => {
    const owner = await factory.user();
    const other = await factory.user();
    const [account, otherAccount] = await Promise.all([factory.account(owner.id), factory.account(other.id)]);
    const [category, otherCategory] = await Promise.all([
      factory.category(owner.id, { type: "EXPENSE" }),
      factory.category(other.id, { type: "EXPENSE" }),
    ]);
    const [market, empty, foreign] = await Promise.all([
      prisma.merchant.create({ data: { userId: owner.id, name: "Mercado" } }),
      prisma.merchant.create({ data: { userId: owner.id, name: "Sem compras" } }),
      prisma.merchant.create({ data: { userId: other.id, name: "Alheio" } }),
    ]);
    const today = logicalDateFromUtcInstant(new Date());
    const previous = previousMonth(today);

    const spend = (merchantId: string | null, amount: number, period: { year: number; month: number }, status: "COMPLETED" | "PENDING" = "COMPLETED") =>
      factory.transaction({
        userId: owner.id,
        accountId: account.id,
        categoryId: category.id,
        overrides: { amount, type: "EXPENSE", year: period.year, month: period.month, merchantId, status },
      });
    await spend(market.id, 6_000, today);
    await spend(market.id, 1_000, today);
    await spend(market.id, 4_000, previous);
    await spend(market.id, 9_000, today, "PENDING");
    await spend(null, 2_500, today);
    await factory.transaction({
      userId: other.id,
      accountId: otherAccount.id,
      categoryId: otherCategory.id,
      overrides: { amount: 77_000, type: "EXPENSE", year: today.year, month: today.month, merchantId: foreign.id },
    });

    authMocks.getAuthenticatedUserId.mockResolvedValue(owner.id);
    const response = await merchantCrud.list(new Request("http://localhost/api/merchants?page=1&pageSize=50"));
    const body = (await response.json()).data;
    const byName = new Map<string, { monthSpend: unknown }>(body.items.map((item: { name: string; monthSpend: unknown }) => [item.name, item]));

    expect(byName.get("Mercado")?.monthSpend).toEqual([
      { currency: "BRL", expense: 7_000, previousExpense: 4_000, count: 2 },
    ]);
    expect(byName.get("Sem compras")?.monthSpend).toEqual([]);
    expect(byName.has("Alheio")).toBe(false);
    expect(empty.id).toBeTruthy();

    expect(body.summary.currencies).toHaveLength(1);
    expect(body.summary.currencies[0]).toMatchObject({ currency: "BRL", assigned: 7_000, unassigned: 2_500 });
    expect(body.summary.currencies[0].top).toEqual([{ id: market.id, name: "Mercado", expense: 7_000 }]);
  });
});
