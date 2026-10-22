import { afterAll, afterEach, describe, expect, it } from "vitest";

import { logicalDateFromUtcInstant } from "@/app/lib/date/logical-date";
import { getMerchantActivity } from "@/app/lib/merchants/merchant-activity";
import { merchantMonthWindow } from "@/app/lib/merchants/merchant-spend-model";
import { prisma } from "@/app/lib/prisma";
import { FinancialTestFactory } from "@/tests/support/financial-test-factory";

const factory = new FinancialTestFactory();

afterEach(async () => {
  await factory.cleanup();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("getMerchantActivity", () => {
  it("resume o mês, o histórico, a categoria principal e as movimentações recentes", async () => {
    const owner = await factory.user();
    const account = await factory.account(owner.id);
    const usd = await factory.account(owner.id, { currency: "USD" });
    const [food, transport] = await Promise.all([
      factory.category(owner.id, { type: "EXPENSE" }),
      factory.category(owner.id, { type: "EXPENSE" }),
    ]);
    const merchant = await prisma.merchant.create({ data: { userId: owner.id, name: "iFood" } });
    const asOf = logicalDateFromUtcInstant(new Date());
    const window = merchantMonthWindow(asOf);
    const previous = window[4];

    const make = (accountId: string, categoryId: string, amount: number, period: { year: number; month: number }, extra: Record<string, unknown> = {}) =>
      factory.transaction({
        userId: owner.id,
        accountId,
        categoryId,
        overrides: { amount, type: "EXPENSE", year: period.year, month: period.month, merchantId: merchant.id, ...extra },
      });
    await make(account.id, food.id, 6_000, asOf, { day: 3, description: "Pedido A" });
    await make(account.id, food.id, 2_000, asOf, { day: 9, description: "Pedido B" });
    await make(account.id, transport.id, 2_000, previous);
    await make(account.id, food.id, 5_000, asOf, { status: "CANCELLED" });
    await make(account.id, food.id, 70_000, { year: asOf.year - 3, month: 1 });
    await make(usd.id, food.id, 300, asOf);

    const activity = await getMerchantActivity({ userId: owner.id, merchantId: merchant.id, asOf });

    expect(activity.currency).toBe("BRL");
    expect(activity.otherCurrencies).toEqual(["USD"]);
    expect(activity.month).toMatchObject({ expense: 8_000, previousExpense: 2_000, count: 2 });
    expect(activity.history).toHaveLength(6);
    expect(activity.previousAverage).toBe(400);
    expect(activity.topCategory).toMatchObject({ id: food.id, share: 80 });
    expect(activity.recent.map((item) => item.description).slice(0, 2)).toEqual(["Pedido B", "Pedido A"]);
    expect(activity.recent.some((item) => (item.status as string) === "CANCELLED")).toBe(false);
  });

  it("não vê movimentos de outro usuário", async () => {
    const owner = await factory.user();
    const other = await factory.user();
    const account = await factory.account(other.id);
    const category = await factory.category(other.id, { type: "EXPENSE" });
    const merchant = await prisma.merchant.create({ data: { userId: other.id, name: "Alheio" } });
    const asOf = logicalDateFromUtcInstant(new Date());
    await factory.transaction({
      userId: other.id,
      accountId: account.id,
      categoryId: category.id,
      overrides: { amount: 9_000, type: "EXPENSE", year: asOf.year, month: asOf.month, merchantId: merchant.id },
    });

    const activity = await getMerchantActivity({ userId: owner.id, merchantId: merchant.id, asOf });

    expect(activity.month.expense).toBe(0);
    expect(activity.topCategory).toBeNull();
    expect(activity.recent).toEqual([]);
  });
});
