import { afterAll, afterEach, describe, expect, it, vi } from "vitest";

const authMocks = vi.hoisted(() => ({ getAuthenticatedUserId: vi.fn() }));

vi.mock("@/app/lib/auth", () => ({
  getAuthenticatedUserId: authMocks.getAuthenticatedUserId,
}));

import { UnauthorizedError } from "@/app/lib/auth/auth-errors";
import { carryOverCategoryMonthlyLimits } from "@/app/lib/category-limits/category-monthly-limits";
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

function carry(body: unknown) {
  return carryOverCategoryMonthlyLimits(
    new Request("http://localhost/api/category-limits/carry-over", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

async function setup() {
  const owner = await fixtures.user({ name: "Carry Owner" });
  const account = await fixtures.account(owner.id, { name: "Conta carry", currency: "BRL" });
  const food = await fixtures.category(owner.id, { name: "Comida carry", type: "EXPENSE" });
  const rent = await fixtures.category(owner.id, { name: "Aluguel carry", type: "EXPENSE" });
  const fun = await fixtures.category(owner.id, { name: "Lazer carry", type: "EXPENSE" });
  const spend = (categoryId: string, amount: number, status: "COMPLETED" | "PENDING" = "COMPLETED") =>
    prisma.transaction.create({
      data: { userId: owner.id, accountId: account.id, categoryId, amount, type: "EXPENSE", status, description: "Gasto", year: 2028, month: 12, day: 5 },
    });
  const limit = (categoryId: string, year: number, month: number, amount: number) =>
    prisma.categoryMonthlyLimit.create({ data: { userId: owner.id, categoryId, year, month, currency: "BRL", amount } });
  authMocks.getAuthenticatedUserId.mockResolvedValue(owner.id);
  return { owner, food, rent, fun, spend, limit };
}

describe("levar a sobra e o estouro para o mês seguinte", () => {
  it("soma sobra, abate estouro, vira o ano e substitui o limite do mês seguinte sem acumular ao repetir", async () => {
    const { owner, food, rent, fun, spend, limit } = await setup();
    await limit(food.id, 2028, 12, 100_000); // gasta 60k, pendente 10k => saldo 30k
    await spend(food.id, 60_000);
    await spend(food.id, 10_000, "PENDING");
    await limit(rent.id, 2028, 12, 50_000); // gasta 80k => estouro de 30k
    await spend(rent.id, 80_000);
    await limit(fun.id, 2029, 1, 7_000); // sem limite em dez/2028: não é tocado
    await limit(food.id, 2029, 1, 999); // será substituído

    const first = await carry({ year: 2028, month: 12, currency: "BRL" });
    expect(first.status).toBe(200);
    expect((await first.json()).data).toEqual({ updated: 2, targetYear: 2029, targetMonth: 1 });

    const read = async () =>
      Object.fromEntries(
        (await prisma.categoryMonthlyLimit.findMany({ where: { userId: owner.id, year: 2029, month: 1 } })).map((row) => [row.categoryId, row.amount]),
      );
    expect(await read()).toEqual({ [food.id]: 130_000, [rent.id]: 20_000, [fun.id]: 7_000 });

    // Repetir não acumula: o resultado depende só do mês de origem.
    expect((await carry({ year: 2028, month: 12, currency: "BRL" })).status).toBe(200);
    expect(await read()).toEqual({ [food.id]: 130_000, [rent.id]: 20_000, [fun.id]: 7_000 });
  });

  it("estouro maior que o limite zera o mês seguinte; sem limites no mês não há o que levar", async () => {
    const { owner, rent, limit } = await setup();
    await limit(rent.id, 2028, 6, 10_000);
    await prisma.transaction.create({
      data: { userId: owner.id, accountId: (await prisma.account.findFirstOrThrow({ where: { userId: owner.id } })).id, categoryId: rent.id, amount: 50_000, type: "EXPENSE", status: "COMPLETED", description: "Estouro", year: 2028, month: 6, day: 2 },
    });
    expect((await carry({ year: 2028, month: 6, currency: "BRL" })).status).toBe(200);
    expect((await prisma.categoryMonthlyLimit.findFirstOrThrow({ where: { userId: owner.id, year: 2028, month: 7 } })).amount).toBe(0);

    const empty = await carry({ year: 2028, month: 2, currency: "BRL" });
    expect((await empty.json()).data.updated).toBe(0);
  });

  it("valida o período e exige sessão", async () => {
    await setup();
    expect((await carry({ year: 2028, month: 13, currency: "BRL" })).status).toBe(400);
    authMocks.getAuthenticatedUserId.mockRejectedValue(new UnauthorizedError());
    expect((await carry({ year: 2028, month: 5, currency: "BRL" })).status).toBe(401);
  });
});
