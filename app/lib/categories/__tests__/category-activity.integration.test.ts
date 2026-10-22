import { randomUUID } from "node:crypto";
import { afterAll, afterEach, describe, expect, it } from "vitest";

import { getCategoryActivity } from "@/app/lib/categories/category-activity";
import { prisma } from "@/app/lib/prisma";

const users: string[] = [];
const asOf = { year: 2028, month: 4, day: 10 };

afterEach(async () => {
  if (users.length) {
    await prisma.user.deleteMany({ where: { id: { in: users.splice(0) } } });
  }
});

afterAll(async () => {
  await prisma.$disconnect();
});

async function createOwner(label: string) {
  const suffix = randomUUID();
  const user = await prisma.user.create({
    data: { name: label, email: `cat-activity-${label}-${suffix}@example.com`, password: "test-hash" },
  });
  users.push(user.id);
  const [brl, usd, category] = await Promise.all([
    prisma.account.create({ data: { name: `BRL ${suffix}`, type: "CREDIT_DEBIT", currency: "BRL", userId: user.id } }),
    prisma.account.create({ data: { name: `USD ${suffix}`, type: "CREDIT_DEBIT", currency: "USD", userId: user.id } }),
    prisma.category.create({ data: { name: `Mercado ${suffix}`, type: "EXPENSE", userId: user.id } }),
  ]);
  return { user, brl, usd, category };
}

type Owner = Awaited<ReturnType<typeof createOwner>>;

function tx(owner: Owner, accountId: string, year: number, month: number, day: number, amount: number, status: "COMPLETED" | "PENDING" | "CANCELLED" = "COMPLETED") {
  return {
    userId: owner.user.id,
    categoryId: owner.category.id,
    accountId,
    year,
    month,
    day,
    amount,
    type: "EXPENSE" as const,
    status,
    description: `Compra ${day}/${month}`,
  };
}

describe("getCategoryActivity", () => {
  it("resume o mês contra o limite, o histórico de seis meses e as movimentações recentes", async () => {
    const owner = await createOwner("owner");
    await prisma.transaction.createMany({
      data: [
        tx(owner, owner.brl.id, 2028, 4, 3, 30_000),
        tx(owner, owner.brl.id, 2028, 4, 8, 12_000),
        tx(owner, owner.brl.id, 2028, 4, 20, 8_000, "PENDING"),
        tx(owner, owner.brl.id, 2028, 4, 9, 99_000, "CANCELLED"),
        tx(owner, owner.brl.id, 2028, 3, 15, 40_000),
        tx(owner, owner.brl.id, 2028, 1, 5, 20_000),
        tx(owner, owner.brl.id, 2027, 10, 5, 77_000), // fora da janela de 6 meses
        tx(owner, owner.usd.id, 2028, 4, 4, 1_000), // outra moeda
      ],
    });
    await prisma.categoryMonthlyLimit.create({
      data: { userId: owner.user.id, categoryId: owner.category.id, year: 2028, month: 4, currency: "BRL", amount: 50_000 },
    });

    const activity = await getCategoryActivity({ userId: owner.user.id, category: { id: owner.category.id, type: "EXPENSE" }, asOf });

    expect(activity.currency).toBe("BRL");
    expect(activity.otherCurrencies).toEqual(["USD"]);
    expect(activity.month).toEqual({ year: 2028, month: 4, realized: 42_000, committed: 8_000, limit: 50_000 });
    expect(activity.history.map((point) => point.realized)).toEqual([0, 0, 20_000, 0, 40_000, 42_000]);
    expect(activity.previousAverage).toBe(12_000);
    expect(activity.recent.map((item) => item.day)).toEqual([20, 8, 4, 3]);
    expect(activity.recent.some((item) => item.status === "PENDING")).toBe(true);
  });

  it("sem limite devolve limit null e sem movimento usa BRL", async () => {
    const owner = await createOwner("owner");

    const activity = await getCategoryActivity({ userId: owner.user.id, category: { id: owner.category.id, type: "EXPENSE" }, asOf });

    expect(activity.currency).toBe("BRL");
    expect(activity.month).toMatchObject({ realized: 0, committed: 0, limit: null });
    expect(activity.history).toHaveLength(6);
    expect(activity.recent).toEqual([]);
  });

  it("não vê movimentos de outro usuário", async () => {
    const owner = await createOwner("owner");
    const other = await createOwner("other");
    await prisma.transaction.createMany({ data: [tx(other, other.brl.id, 2028, 4, 5, 55_000)] });

    const activity = await getCategoryActivity({ userId: owner.user.id, category: { id: other.category.id, type: "EXPENSE" }, asOf });

    expect(activity.history.every((point) => point.realized === 0)).toBe(true);
    expect(activity.recent).toEqual([]);
  });
});
