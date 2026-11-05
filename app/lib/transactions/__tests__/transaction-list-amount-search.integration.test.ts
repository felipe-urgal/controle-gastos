import { afterAll, afterEach, describe, expect, it, vi } from "vitest";

const authMocks = vi.hoisted(() => ({ getAuthenticatedUserId: vi.fn() }));

vi.mock("@/app/lib/auth", () => ({
  getAuthenticatedUserId: authMocks.getAuthenticatedUserId,
}));

import { prisma } from "@/app/lib/prisma";
import { transactionCrud } from "@/app/lib/transactions/transaction-crud";
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
  const owner = await fixtures.user({ name: "Amount Search Owner" });
  const account = await fixtures.account(owner.id, { name: "Conta busca", currency: "BRL" });
  const market = await fixtures.category(owner.id, { name: "Supermercado busca", type: "EXPENSE" });
  const leisure = await fixtures.category(owner.id, { name: "Lazer busca", type: "EXPENSE" });
  const bakery = await prisma.merchant.create({ data: { userId: owner.id, name: "Padaria Estrela" } });
  const add = (amount: number, description: string, categoryId: string, merchantId: string | null = null) =>
    prisma.transaction.create({
      data: { userId: owner.id, accountId: account.id, categoryId, merchantId, amount, type: "EXPENSE", status: "COMPLETED", description, year: 2028, month: 4, day: 10 },
    });
  const cheap = await add(1_000, "Café", market.id, bakery.id);
  const mid = await add(5_000, "Compra da semana", market.id);
  const big = await add(20_000, "Cinema e jantar", leisure.id);
  authMocks.getAuthenticatedUserId.mockResolvedValue(owner.id);
  return { owner, cheap, mid, big };
}

async function list(query: string) {
  const response = await transactionCrud.list(new Request(`http://localhost/api/transactions?year=2028&month=4&${query}`));
  return { status: response.status, body: await response.json() };
}

const ids = (body: { data: { items: Array<{ id: string }> } }) => body.data.items.map((item) => item.id).sort();

describe("listagem de transações: faixa de valor e busca no servidor", () => {
  it("filtra por valor mínimo, máximo ou faixa, com limites inclusivos", async () => {
    const { cheap, mid, big } = await setup();
    expect(ids((await list("minAmount=5000")).body)).toEqual([mid.id, big.id].sort());
    expect(ids((await list("maxAmount=5000")).body)).toEqual([cheap.id, mid.id].sort());
    expect(ids((await list("minAmount=1000&maxAmount=5000")).body)).toEqual([cheap.id, mid.id].sort());
    expect(ids((await list("minAmount=5001&maxAmount=19999")).body)).toEqual([]);
    expect(ids((await list("minAmount=")).body)).toHaveLength(3);
  });

  it("a busca de texto acha por descrição, estabelecimento e categoria, e combina com a faixa de valor", async () => {
    const { cheap, mid, big } = await setup();
    expect(ids((await list("search=cinema")).body)).toEqual([big.id]);
    expect(ids((await list("search=estrela")).body)).toEqual([cheap.id]);
    expect(ids((await list("search=SUPERMERCADO")).body)).toEqual([cheap.id, mid.id].sort());
    expect(ids((await list("search=supermercado&minAmount=2000")).body)).toEqual([mid.id]);
  });

  it("o resumo acompanha o filtro e valores inválidos viram 400", async () => {
    await setup();
    const filtered = await list("minAmount=5000");
    const income = filtered.body.data.summary?.[0];
    expect(income?.expense).toBe(25_000);

    for (const query of ["minAmount=-1", "maxAmount=1.5", "minAmount=abc", "minAmount=9000&maxAmount=1000", "maxAmount=99999999999"]) {
      expect((await list(query)).status).toBe(400);
    }
  });
});
