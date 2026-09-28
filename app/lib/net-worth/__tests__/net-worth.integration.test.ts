import { randomUUID } from "node:crypto";
import { afterAll, afterEach, describe, expect, it, vi } from "vitest";

const authMocks = vi.hoisted(() => ({
  getAuthenticatedUserId: vi.fn(),
}));

vi.mock("@/app/lib/auth", () => ({
  getAuthenticatedUserId: authMocks.getAuthenticatedUserId,
}));

import { getNetWorth, getNetWorthForUser } from "@/app/lib/net-worth/net-worth";
import { prisma } from "@/app/lib/prisma";
import { createTransferForUser } from "@/app/lib/transfers/create-transfer";

const createdUserIds: string[] = [];

afterEach(async () => {
  authMocks.getAuthenticatedUserId.mockReset();
  if (createdUserIds.length > 0) {
    await prisma.user.deleteMany({
      where: { id: { in: createdUserIds.splice(0) } },
    });
  }
});

afterAll(async () => {
  await prisma.$disconnect();
});

async function createFixture() {
  const suffix = randomUUID();
  const [owner, other] = await Promise.all([
    prisma.user.create({
      data: {
        name: "Net Worth Owner",
        email: `net-worth-owner-${suffix}@example.com`,
        password: "test-hash",
      },
    }),
    prisma.user.create({
      data: {
        name: "Net Worth Other",
        email: `net-worth-other-${suffix}@example.com`,
        password: "test-hash",
      },
    }),
  ]);
  createdUserIds.push(owner.id, other.id);

  const [checking, investment, usd, inactive, card, foreign] = await Promise.all([
    prisma.account.create({
      data: {
        name: "Conta corrente",
        type: "CREDIT_DEBIT",
        currency: "BRL",
        userId: owner.id,
      },
    }),
    prisma.account.create({
      data: {
        name: "Investimento",
        type: "INVESTMENT",
        currency: "BRL",
        userId: owner.id,
      },
    }),
    prisma.account.create({
      data: {
        name: "Conta dólar",
        type: "CREDIT_DEBIT",
        currency: "USD",
        userId: owner.id,
      },
    }),
    prisma.account.create({
      data: {
        name: "Conta antiga",
        type: "CREDIT_DEBIT",
        currency: "BRL",
        isActive: false,
        userId: owner.id,
      },
    }),
    prisma.account.create({
      data: {
        name: "Cartão",
        type: "CREDIT_CARD",
        currency: "BRL",
        creditLimit: 100_000,
        statementClosingDay: 5,
        statementDueDay: 12,
        userId: owner.id,
      },
    }),
    prisma.account.create({
      data: {
        name: "Conta externa",
        type: "CREDIT_DEBIT",
        currency: "BRL",
        userId: other.id,
      },
    }),
  ]);

  const [income, expense, otherIncome] = await Promise.all([
    prisma.category.create({
      data: { name: "Receita", type: "INCOME", userId: owner.id },
    }),
    prisma.category.create({
      data: { name: "Despesa", type: "EXPENSE", userId: owner.id },
    }),
    prisma.category.create({
      data: { name: "Receita externa", type: "INCOME", userId: other.id },
    }),
  ]);

  return {
    owner,
    other,
    checking,
    investment,
    usd,
    inactive,
    card,
    foreign,
    income,
    expense,
    otherIncome,
  };
}

describe("net worth integration", () => {
  it("derives monthly net worth from completed eligible-account balances", async () => {
    const fixture = await createFixture();

    await prisma.transaction.createMany({
      data: [
        {
          amount: 100_000,
          year: 2028,
          month: 1,
          day: 1,
          type: "INCOME",
          description: "Salário",
          status: "COMPLETED",
          accountId: fixture.checking.id,
          categoryId: fixture.income.id,
          userId: fixture.owner.id,
        },
        {
          amount: 25_000,
          year: 2028,
          month: 1,
          day: 31,
          type: "EXPENSE",
          description: "Despesa janeiro",
          status: "COMPLETED",
          accountId: fixture.checking.id,
          categoryId: fixture.expense.id,
          userId: fixture.owner.id,
        },
        {
          amount: 20_000,
          year: 2028,
          month: 2,
          day: 1,
          type: "INCOME",
          description: "Aporte externo",
          status: "COMPLETED",
          accountId: fixture.investment.id,
          categoryId: fixture.income.id,
          userId: fixture.owner.id,
        },
        {
          amount: 50_000,
          year: 2028,
          month: 2,
          day: 10,
          type: "INCOME",
          description: "Pendente ignorado",
          status: "PENDING",
          accountId: fixture.checking.id,
          categoryId: fixture.income.id,
          userId: fixture.owner.id,
        },
        {
          amount: 90_000,
          year: 2028,
          month: 2,
          day: 11,
          type: "EXPENSE",
          description: "Cancelada ignorada",
          status: "CANCELLED",
          accountId: fixture.checking.id,
          categoryId: fixture.expense.id,
          userId: fixture.owner.id,
        },
        {
          amount: 5_000,
          year: 2028,
          month: 1,
          day: 15,
          type: "INCOME",
          description: "Conta inativa preservada",
          status: "COMPLETED",
          accountId: fixture.inactive.id,
          categoryId: fixture.income.id,
          userId: fixture.owner.id,
        },
        {
          amount: 30_000,
          year: 2028,
          month: 1,
          day: 4,
          type: "INCOME",
          description: "USD",
          status: "COMPLETED",
          accountId: fixture.usd.id,
          categoryId: fixture.income.id,
          userId: fixture.owner.id,
        },
        {
          amount: 99_000,
          year: 2028,
          month: 1,
          day: 4,
          type: "INCOME",
          description: "Cartão não é patrimônio",
          status: "COMPLETED",
          accountId: fixture.card.id,
          categoryId: fixture.income.id,
          userId: fixture.owner.id,
        },
      ],
    });

    const data = await getNetWorthForUser(fixture.owner.id, {
      year: 2028,
      month: 2,
      months: 2,
    });

    expect(data.history).toEqual([
      {
        year: 2028,
        month: 1,
        totals: { BRL: 80_000, USD: 30_000 },
      },
      {
        year: 2028,
        month: 2,
        totals: { BRL: 100_000, USD: 30_000 },
      },
    ]);
    expect(data.totals).toEqual({ BRL: 100_000, USD: 30_000 });
    expect(data.byCurrency.find((item) => item.currency === "BRL")).toMatchObject({
      total: 100_000,
      accounts: expect.arrayContaining([
        expect.objectContaining({ id: fixture.checking.id, balance: 75_000 }),
        expect.objectContaining({ id: fixture.investment.id, balance: 20_000 }),
        expect.objectContaining({
          id: fixture.inactive.id,
          isActive: false,
          balance: 5_000,
        }),
      ]),
    });
    expect(
      data.byCurrency.flatMap((item) => item.accounts).map((account) => account.id),
    ).not.toContain(fixture.card.id);
  });

  it("internal transfer changes account distribution but not consolidated net worth", async () => {
    const fixture = await createFixture();

    await prisma.transaction.create({
      data: {
        amount: 100_000,
        year: 2028,
        month: 3,
        day: 1,
        type: "INCOME",
        description: "Saldo inicial",
        status: "COMPLETED",
        accountId: fixture.checking.id,
        categoryId: fixture.income.id,
        userId: fixture.owner.id,
      },
    });

    await createTransferForUser(
      fixture.owner.id,
      {
        sourceAccountId: fixture.checking.id,
        destinationAccountId: fixture.investment.id,
        amountCents: 40_000,
        year: 2028,
        month: 3,
        day: 15,
        description: "Aporte interno",
        status: "COMPLETED",
      },
      `net-worth-${randomUUID()}`,
    );

    const data = await getNetWorthForUser(fixture.owner.id, {
      year: 2028,
      month: 3,
      months: 1,
    });

    expect(data.totals.BRL).toBe(100_000);
    const accounts = new Map(
      data.byCurrency
        .find((item) => item.currency === "BRL")
        ?.accounts.map((account) => [account.id, account.balance]),
    );
    expect(accounts.get(fixture.checking.id)).toBe(60_000);
    expect(accounts.get(fixture.investment.id)).toBe(40_000);
  });

  it("uses a compact opening balance before the requested history window", async () => {
    const fixture = await createFixture();

    await prisma.transaction.createMany({
      data: [
        {
          amount: 70_000,
          year: 2025,
          month: 12,
          day: 31,
          type: "INCOME",
          description: "Antes da janela",
          status: "COMPLETED",
          accountId: fixture.checking.id,
          categoryId: fixture.income.id,
          userId: fixture.owner.id,
        },
        {
          amount: 10_000,
          year: 2028,
          month: 1,
          day: 31,
          type: "EXPENSE",
          description: "Fim do mês",
          status: "COMPLETED",
          accountId: fixture.checking.id,
          categoryId: fixture.expense.id,
          userId: fixture.owner.id,
        },
      ],
    });

    const data = await getNetWorthForUser(fixture.owner.id, {
      year: 2028,
      month: 2,
      months: 2,
    });

    expect(data.history).toEqual([
      { year: 2028, month: 1, totals: { BRL: 60_000, USD: 0 } },
      { year: 2028, month: 2, totals: { BRL: 60_000, USD: 0 } },
    ]);
  });

  it("never includes another user's accounts or transactions", async () => {
    const fixture = await createFixture();

    await prisma.transaction.create({
      data: {
        amount: 999_999,
        year: 2028,
        month: 1,
        day: 1,
        type: "INCOME",
        description: "Outro usuário",
        status: "COMPLETED",
        accountId: fixture.foreign.id,
        categoryId: fixture.otherIncome.id,
        userId: fixture.other.id,
      },
    });

    const data = await getNetWorthForUser(fixture.owner.id, {
      year: 2028,
      month: 1,
      months: 1,
    });

    expect(data.totals.BRL ?? 0).toBe(0);
    expect(
      data.byCurrency.flatMap((item) => item.accounts).map((account) => account.id),
    ).not.toContain(fixture.foreign.id);
  });

  it("consolidates explicitly with the latest owned manual rate on or before the period", async () => {
    const fixture = await createFixture();

    await prisma.transaction.createMany({
      data: [
        {
          amount: 100_000,
          year: 2028,
          month: 2,
          day: 1,
          type: "INCOME",
          description: "Saldo BRL",
          status: "COMPLETED",
          accountId: fixture.checking.id,
          categoryId: fixture.income.id,
          userId: fixture.owner.id,
        },
        {
          amount: 30_000,
          year: 2028,
          month: 2,
          day: 1,
          type: "INCOME",
          description: "Saldo USD",
          status: "COMPLETED",
          accountId: fixture.usd.id,
          categoryId: fixture.income.id,
          userId: fixture.owner.id,
        },
      ],
    });

    await Promise.all([
      prisma.exchangeRate.create({
        data: {
          userId: fixture.owner.id,
          fromCurrency: "USD",
          toCurrency: "BRL",
          numerator: 5,
          denominator: 1,
          source: "MANUAL",
          referenceYear: 2028,
          referenceMonth: 1,
          referenceDay: 15,
        },
      }),
      prisma.exchangeRate.create({
        data: {
          userId: fixture.owner.id,
          fromCurrency: "USD",
          toCurrency: "BRL",
          numerator: 6,
          denominator: 1,
          source: "MANUAL",
          referenceYear: 2028,
          referenceMonth: 3,
          referenceDay: 1,
        },
      }),
      prisma.exchangeRate.create({
        data: {
          userId: fixture.other.id,
          fromCurrency: "USD",
          toCurrency: "BRL",
          numerator: 99,
          denominator: 1,
          source: "MANUAL",
          referenceYear: 2028,
          referenceMonth: 2,
          referenceDay: 1,
        },
      }),
    ]);

    const data = await getNetWorthForUser(fixture.owner.id, {
      year: 2028,
      month: 2,
      months: 1,
      consolidateTo: "BRL",
    });

    expect(data.consolidation).toMatchObject({
      baseCurrency: "BRL",
      complete: true,
      total: 250_000,
      referenceDate: { year: 2028, month: 2, day: 29 },
      missingRates: [],
    });
    expect(data.consolidation?.convertedItems).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          original: { amount: 30_000, currency: "USD" },
          converted: { amount: 150_000, currency: "BRL" },
          rate: expect.objectContaining({
            numerator: 5,
            denominator: 1,
            referenceDate: { year: 2028, month: 1, day: 15 },
          }),
        }),
      ]),
    );
  });

  it("returns incomplete consolidation instead of treating a missing rate as zero", async () => {
    const fixture = await createFixture();

    await prisma.transaction.create({
      data: {
        amount: 100_000,
        year: 2028,
        month: 2,
        day: 1,
        type: "INCOME",
        description: "Saldo BRL",
        status: "COMPLETED",
        accountId: fixture.checking.id,
        categoryId: fixture.income.id,
        userId: fixture.owner.id,
      },
    });

    const data = await getNetWorthForUser(fixture.owner.id, {
      year: 2028,
      month: 2,
      months: 1,
      consolidateTo: "USD",
    });

    expect(data.consolidation).toMatchObject({
      baseCurrency: "USD",
      complete: false,
      total: null,
      missingRates: [{ from: "BRL", to: "USD" }],
    });
    expect(data.totals.BRL).toBe(100_000);
  });

  it("rejects history windows above 60 months at the API boundary", async () => {
    const fixture = await createFixture();
    authMocks.getAuthenticatedUserId.mockResolvedValue(fixture.owner.id);

    const response = await getNetWorth(
      new Request("http://localhost/api/net-worth?year=2028&month=1&months=61"),
    );

    expect(response.status).toBe(400);

    const invalidCurrencyResponse = await getNetWorth(
      new Request(
        "http://localhost/api/net-worth?year=2028&month=1&consolidateTo=JPY",
      ),
    );
    expect(invalidCurrencyResponse.status).toBe(400);
  });
});
