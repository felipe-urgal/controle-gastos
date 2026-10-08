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

  it("consolidates using the latest manual rate on or before month end", async () => {
    const fixture = await createFixture();

    await prisma.transaction.createMany({
      data: [
        {
          amount: 100_000,
          year: 2028,
          month: 2,
          day: 1,
          type: "INCOME",
          description: "BRL",
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
          description: "USD",
          status: "COMPLETED",
          accountId: fixture.usd.id,
          categoryId: fixture.income.id,
          userId: fixture.owner.id,
        },
      ],
    });

    await prisma.exchangeRate.createMany({
      data: [
        {
          userId: fixture.owner.id,
          fromCurrency: "USD",
          toCurrency: "BRL",
          numerator: 2,
          denominator: 1,
          source: "MANUAL",
          referenceYear: 2028,
          referenceMonth: 2,
          referenceDay: 15,
        },
        {
          userId: fixture.owner.id,
          fromCurrency: "USD",
          toCurrency: "BRL",
          numerator: 3,
          denominator: 1,
          source: "MANUAL",
          referenceYear: 2028,
          referenceMonth: 3,
          referenceDay: 1,
        },
      ],
    });

    const data = await getNetWorthForUser(fixture.owner.id, {
      year: 2028,
      month: 2,
      months: 1,
      baseCurrency: "BRL",
    });

    expect(data.totals).toEqual({ BRL: 100_000, USD: 30_000 });
    expect(data.consolidation).toMatchObject({
      baseCurrency: "BRL",
      complete: true,
      total: 160_000,
      referenceDate: { year: 2028, month: 2, day: 29 },
      convertedItems: expect.arrayContaining([
        expect.objectContaining({
          original: { amount: 30_000, currency: "USD" },
          converted: { amount: 60_000, currency: "BRL" },
          rate: expect.objectContaining({
            numerator: 2,
            denominator: 1,
            source: "MANUAL",
            referenceDate: { year: 2028, month: 2, day: 15 },
          }),
        }),
      ]),
    });
  });

  it("returns incomplete consolidation instead of zero when a required rate is missing", async () => {
    const fixture = await createFixture();

    await prisma.transaction.createMany({
      data: [
        {
          amount: 50_000,
          year: 2028,
          month: 4,
          day: 1,
          type: "INCOME",
          description: "BRL",
          status: "COMPLETED",
          accountId: fixture.checking.id,
          categoryId: fixture.income.id,
          userId: fixture.owner.id,
        },
        {
          amount: 20_000,
          year: 2028,
          month: 4,
          day: 1,
          type: "INCOME",
          description: "USD",
          status: "COMPLETED",
          accountId: fixture.usd.id,
          categoryId: fixture.income.id,
          userId: fixture.owner.id,
        },
      ],
    });

    const data = await getNetWorthForUser(fixture.owner.id, {
      year: 2028,
      month: 4,
      months: 1,
      baseCurrency: "BRL",
    });

    expect(data.consolidation).toMatchObject({
      complete: false,
      total: null,
      missingRates: [{ from: "USD", to: "BRL" }],
    });
    expect(data.totals).toEqual({ BRL: 50_000, USD: 20_000 });
  });

  it("does not use another user's manual exchange rate", async () => {
    const fixture = await createFixture();

    await prisma.transaction.create({
      data: {
        amount: 10_000,
        year: 2028,
        month: 5,
        day: 1,
        type: "INCOME",
        description: "USD owner",
        status: "COMPLETED",
        accountId: fixture.usd.id,
        categoryId: fixture.income.id,
        userId: fixture.owner.id,
      },
    });

    await prisma.exchangeRate.create({
      data: {
        userId: fixture.other.id,
        fromCurrency: "USD",
        toCurrency: "BRL",
        numerator: 99,
        denominator: 1,
        source: "MANUAL",
        referenceYear: 2028,
        referenceMonth: 5,
        referenceDay: 1,
      },
    });

    const data = await getNetWorthForUser(fixture.owner.id, {
      year: 2028,
      month: 5,
      months: 1,
      baseCurrency: "BRL",
    });

    expect(data.consolidation).toMatchObject({
      complete: false,
      total: null,
      missingRates: [{ from: "USD", to: "BRL" }],
    });
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

  it("rejects history windows above 60 months at the API boundary", async () => {
    const fixture = await createFixture();
    authMocks.getAuthenticatedUserId.mockResolvedValue(fixture.owner.id);

    const response = await getNetWorth(
      new Request("http://localhost/api/net-worth?year=2028&month=1&months=61"),
    );

    expect(response.status).toBe(400);
  });

  it("subtracts manual liabilities from assets without mixing currencies", async () => {
    const fixture = await createFixture();

    await prisma.transaction.createMany({
      data: [
        {
          amount: 100_000,
          year: 2028,
          month: 2,
          day: 1,
          type: "INCOME",
          description: "Ativo BRL",
          status: "COMPLETED",
          accountId: fixture.checking.id,
          categoryId: fixture.income.id,
          userId: fixture.owner.id,
        },
        {
          amount: 50_000,
          year: 2028,
          month: 2,
          day: 1,
          type: "INCOME",
          description: "Ativo USD",
          status: "COMPLETED",
          accountId: fixture.usd.id,
          categoryId: fixture.income.id,
          userId: fixture.owner.id,
        },
      ],
    });

    await prisma.debt.create({
      data: {
        userId: fixture.owner.id,
        name: "Financiamento BRL",
        currency: "BRL",
        balance: 40_000,
        adjustments: {
          create: {
            userId: fixture.owner.id,
            previousBalance: 0,
            newBalance: 40_000,
            delta: 40_000,
            description: "Saldo inicial",
          },
        },
      },
    });
    await prisma.debt.create({
      data: {
        userId: fixture.owner.id,
        name: "Dívida USD",
        currency: "USD",
        balance: 10_000,
        adjustments: {
          create: {
            userId: fixture.owner.id,
            previousBalance: 0,
            newBalance: 10_000,
            delta: 10_000,
            description: "Saldo inicial",
          },
        },
      },
    });

    const data = await getNetWorthForUser(fixture.owner.id, {
      year: 2028,
      month: 2,
      months: 1,
    });

    expect(data.assetsTotals).toMatchObject({ BRL: 100_000, USD: 50_000 });
    expect(data.liabilitiesTotals).toMatchObject({ BRL: 40_000, USD: 10_000 });
    expect(data.totals).toMatchObject({ BRL: 60_000, USD: 40_000 });
    expect(data.byCurrency.find((item) => item.currency === "BRL")).toMatchObject({
      assetsTotal: 100_000,
      liabilitiesTotal: 40_000,
      total: 60_000,
      debts: [expect.objectContaining({ name: "Financiamento BRL", balance: 40_000 })],
    });
    expect(data.history[0]?.totals).toMatchObject({ BRL: 60_000, USD: 40_000 });
  });

  it("uses debt effective dates instead of record creation time for history", async () => {
    const fixture = await createFixture();

    await prisma.debt.create({
      data: {
        userId: fixture.owner.id,
        name: "Passivo retroativo",
        currency: "BRL",
        balance: 70_000,
        adjustments: {
          create: [
            {
              userId: fixture.owner.id,
              previousBalance: 0,
              newBalance: 100_000,
              delta: 100_000,
              kind: "INITIAL_BALANCE",
              description: "Saldo inicial",
              effectiveYear: 2028,
              effectiveMonth: 1,
              effectiveDay: 5,
            },
            {
              userId: fixture.owner.id,
              previousBalance: 100_000,
              newBalance: 70_000,
              delta: -30_000,
              kind: "MANUAL_ADJUSTMENT",
              description: "Ajuste retroativo",
              effectiveYear: 2028,
              effectiveMonth: 2,
              effectiveDay: 15,
            },
          ],
        },
      },
    });

    const data = await getNetWorthForUser(fixture.owner.id, {
      year: 2028,
      month: 2,
      months: 2,
    });

    expect(data.history).toEqual([
      { year: 2028, month: 1, totals: { BRL: -100_000, USD: 0 } },
      { year: 2028, month: 2, totals: { BRL: -70_000, USD: 0 } },
    ]);
    expect(data.liabilitiesTotals).toMatchObject({ BRL: 70_000 });
    expect(data.totals).toMatchObject({ BRL: -70_000 });
  });

  it("separates current position valuation from transactional history", async () => {
    const fixture = await createFixture();

    await prisma.transaction.create({
      data: {
        amount: 100_000,
        year: 2026,
        month: 10,
        day: 1,
        type: "INCOME",
        description: "Aporte corretora",
        status: "COMPLETED",
        accountId: fixture.investment.id,
        categoryId: fixture.income.id,
        userId: fixture.owner.id,
      },
    });
    const asset = await prisma.investmentAsset.create({
      data: {
        symbol: `NW${randomUUID().slice(0, 5)}`.toUpperCase(),
        type: "STOCK",
        currency: "BRL",
        market: "B3",
        userId: fixture.owner.id,
      },
    });
    await prisma.investmentOperation.create({
      data: {
        type: "BUY",
        quantityUnits: BigInt(10) * BigInt(100_000_000),
        unitPriceCents: 6_000,
        feesCents: 0,
        year: 2026,
        month: 10,
        day: 2,
        userId: fixture.owner.id,
        accountId: fixture.investment.id,
        assetId: asset.id,
      },
    });
    await prisma.assetQuote.create({
      data: {
        assetId: asset.id,
        priceCents: 7_000,
        currency: "BRL",
        referenceAt: new Date("2026-10-05T12:00:00Z"),
        source: "BRAPI",
        fetchedAt: new Date("2026-10-05T12:00:00Z"),
      },
    });

    const data = await getNetWorthForUser(fixture.owner.id, {
      year: 2026,
      month: 10,
      months: 1,
      referenceNow: new Date("2026-10-06T12:00:00Z"),
    });

    const brl = data.byCurrency.find((item) => item.currency === "BRL");
    expect(brl).toMatchObject({
      assetsTotal: 70_000,
      total: 70_000,
      valuation: {
        basis: "MIXED",
        compositionStatus: "UNRECONCILED_TRANSACTION_BALANCE",
        unreconciledTransactionBalance: 100_000,
        positionCount: 1,
        marketPositionCount: 1,
        quoteCoveragePercentage: 100,
        comparableToHistory: false,
      },
    });
    expect(
      brl?.accounts.find((account) => account.id === fixture.investment.id),
    ).toMatchObject({
      balance: 70_000,
      cashBalance: 100_000,
      valuationBasis: "POSITION_MARKET",
    });
    expect(data.history.at(-1)?.totals.BRL).toBe(100_000);
    expect(data.historyValuation.basis).toBe("TRANSACTION_BALANCE");
  });

  it("cuts the current snapshot at the logical UTC day", async () => {
    const fixture = await createFixture();
    await prisma.transaction.createMany({
      data: [
        {
          amount: 10_000,
          year: 2026,
          month: 10,
          day: 6,
          type: "INCOME",
          description: "Hoje",
          status: "COMPLETED",
          accountId: fixture.checking.id,
          categoryId: fixture.income.id,
          userId: fixture.owner.id,
        },
        {
          amount: 20_000,
          year: 2026,
          month: 10,
          day: 7,
          type: "INCOME",
          description: "Amanhã",
          status: "COMPLETED",
          accountId: fixture.checking.id,
          categoryId: fixture.income.id,
          userId: fixture.owner.id,
        },
      ],
    });

    const data = await getNetWorthForUser(fixture.owner.id, {
      year: 2026,
      month: 10,
      months: 1,
      referenceNow: new Date("2026-10-06T23:59:00Z"),
    });

    expect(data.asOf).toEqual({ year: 2026, month: 10, day: 6 });
    expect(data.totals.BRL).toBe(10_000);
    expect(data.history[0]?.totals.BRL).toBe(10_000);
  });

  it("never uses a future exchange rate for the current snapshot", async () => {
    const fixture = await createFixture();
    await prisma.transaction.create({
      data: {
        amount: 10_000,
        year: 2026,
        month: 10,
        day: 1,
        type: "INCOME",
        description: "USD",
        status: "COMPLETED",
        accountId: fixture.usd.id,
        categoryId: fixture.income.id,
        userId: fixture.owner.id,
      },
    });
    await prisma.exchangeRate.createMany({
      data: [
        {
          userId: fixture.owner.id,
          fromCurrency: "USD",
          toCurrency: "BRL",
          numerator: 5,
          denominator: 1,
          source: "MANUAL",
          referenceYear: 2026,
          referenceMonth: 10,
          referenceDay: 5,
        },
        {
          userId: fixture.owner.id,
          fromCurrency: "USD",
          toCurrency: "BRL",
          numerator: 6,
          denominator: 1,
          source: "MANUAL",
          referenceYear: 2026,
          referenceMonth: 10,
          referenceDay: 7,
        },
      ],
    });

    const data = await getNetWorthForUser(fixture.owner.id, {
      year: 2026,
      month: 10,
      months: 1,
      baseCurrency: "BRL",
      referenceNow: new Date("2026-10-06T12:00:00Z"),
    });

    expect(data.consolidation).toMatchObject({
      complete: true,
      total: 50_000,
      referenceDate: { year: 2026, month: 10, day: 6 },
      convertedItems: expect.arrayContaining([
        expect.objectContaining({
          original: { amount: 10_000, currency: "USD" },
          converted: { amount: 50_000, currency: "BRL" },
          rate: expect.objectContaining({
            numerator: 5,
            referenceDate: { year: 2026, month: 10, day: 5 },
          }),
        }),
      ]),
    });
  });

  it("keeps tracked debt payments neutral and manual revaluations patrimonial", async () => {
    const fixture = await createFixture();
    await prisma.transaction.create({
      data: {
        amount: 100_000,
        year: 2026,
        month: 10,
        day: 1,
        type: "INCOME",
        description: "Saldo",
        status: "COMPLETED",
        accountId: fixture.checking.id,
        categoryId: fixture.income.id,
        userId: fixture.owner.id,
      },
    });
    const debt = await prisma.debt.create({
      data: {
        userId: fixture.owner.id,
        name: "Passivo",
        currency: "BRL",
        balance: 30_000,
        adjustments: {
          create: {
            userId: fixture.owner.id,
            previousBalance: 0,
            newBalance: 50_000,
            delta: 50_000,
            kind: "INITIAL_BALANCE",
            effectiveYear: 2026,
            effectiveMonth: 10,
            effectiveDay: 1,
          },
        },
      },
    });
    const paymentTransaction = await prisma.transaction.create({
      data: {
        amount: 10_000,
        year: 2026,
        month: 10,
        day: 5,
        type: "EXPENSE",
        description: "Pagamento passivo",
        status: "COMPLETED",
        accountId: fixture.checking.id,
        categoryId: fixture.expense.id,
        userId: fixture.owner.id,
      },
    });
    await prisma.debtAdjustment.createMany({
      data: [
        {
          userId: fixture.owner.id,
          debtId: debt.id,
          previousBalance: 50_000,
          newBalance: 40_000,
          delta: -10_000,
          kind: "PAYMENT",
          transactionId: paymentTransaction.id,
          effectiveYear: 2026,
          effectiveMonth: 10,
          effectiveDay: 5,
        },
        {
          userId: fixture.owner.id,
          debtId: debt.id,
          previousBalance: 40_000,
          newBalance: 30_000,
          delta: -10_000,
          kind: "MANUAL_ADJUSTMENT",
          effectiveYear: 2026,
          effectiveMonth: 10,
          effectiveDay: 6,
        },
      ],
    });

    const before = await getNetWorthForUser(fixture.owner.id, {
      year: 2026,
      month: 10,
      months: 1,
      referenceNow: new Date("2026-10-04T12:00:00Z"),
    });
    const afterPayment = await getNetWorthForUser(fixture.owner.id, {
      year: 2026,
      month: 10,
      months: 1,
      referenceNow: new Date("2026-10-05T12:00:00Z"),
    });
    const afterRevaluation = await getNetWorthForUser(fixture.owner.id, {
      year: 2026,
      month: 10,
      months: 1,
      referenceNow: new Date("2026-10-06T12:00:00Z"),
    });

    expect(before.totals.BRL).toBe(50_000);
    expect(afterPayment.totals.BRL).toBe(50_000);
    expect(afterRevaluation.totals.BRL).toBe(60_000);
  });


  async function seedBrlAndUsd(fixture: Awaited<ReturnType<typeof createFixture>>) {
    await prisma.transaction.createMany({
      data: [
        {
          amount: 100_000,
          year: 2028,
          month: 2,
          day: 1,
          type: "INCOME",
          description: "BRL",
          status: "COMPLETED",
          accountId: fixture.checking.id,
          categoryId: fixture.income.id,
          userId: fixture.owner.id,
        },
        {
          amount: 10_000,
          year: 2028,
          month: 2,
          day: 1,
          type: "INCOME",
          description: "USD",
          status: "COMPLETED",
          accountId: fixture.usd.id,
          categoryId: fixture.income.id,
          userId: fixture.owner.id,
        },
      ],
    });
  }

  it("marks an arbitrarily old rate as stale instead of a fresh complete consolidation", async () => {
    const fixture = await createFixture();
    await seedBrlAndUsd(fixture);
    await prisma.exchangeRate.create({
      data: {
        userId: fixture.owner.id,
        fromCurrency: "USD",
        toCurrency: "BRL",
        numerator: 5,
        denominator: 1,
        source: "MANUAL",
        referenceYear: 2027,
        referenceMonth: 1,
        referenceDay: 10,
      },
    });

    const data = await getNetWorthForUser(fixture.owner.id, {
      year: 2028,
      month: 2,
      months: 1,
      baseCurrency: "BRL",
    });

    expect(data.consolidation).toMatchObject({
      complete: true,
      stale: true,
      total: 150_000,
    });
    expect(data.consolidation?.convertedItems).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          resolution: expect.objectContaining({
            freshness: "STALE",
            ageDays: expect.any(Number),
          }),
        }),
      ]),
    );
  });

  it("derives the inverse rate without persisting a second row", async () => {
    const fixture = await createFixture();
    await seedBrlAndUsd(fixture);
    await prisma.exchangeRate.create({
      data: {
        userId: fixture.owner.id,
        fromCurrency: "USD",
        toCurrency: "BRL",
        numerator: 5,
        denominator: 1,
        source: "MANUAL",
        referenceYear: 2028,
        referenceMonth: 2,
        referenceDay: 27,
      },
    });

    const data = await getNetWorthForUser(fixture.owner.id, {
      year: 2028,
      month: 2,
      months: 1,
      baseCurrency: "USD",
    });

    expect(data.consolidation).toMatchObject({
      complete: true,
      stale: false,
      total: 30_000,
    });
    expect(data.consolidation?.convertedItems).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          original: { amount: 100_000, currency: "BRL" },
          converted: { amount: 20_000, currency: "USD" },
          resolution: expect.objectContaining({ derivedFromInverse: true }),
        }),
      ]),
    );
    expect(
      await prisma.exchangeRate.count({ where: { userId: fixture.owner.id } }),
    ).toBe(1);
  });

  it("flags manual override when a PTAX exists on the same date", async () => {
    const fixture = await createFixture();
    await seedBrlAndUsd(fixture);
    await prisma.exchangeRate.createMany({
      data: [
        {
          userId: fixture.owner.id,
          fromCurrency: "USD",
          toCurrency: "BRL",
          numerator: 6,
          denominator: 1,
          source: "MANUAL",
          quoteSide: "GENERIC",
          referenceYear: 2028,
          referenceMonth: 2,
          referenceDay: 27,
        },
        {
          userId: fixture.owner.id,
          fromCurrency: "USD",
          toCurrency: "BRL",
          numerator: 5,
          denominator: 1,
          source: "BCB_PTAX",
          quoteSide: "SELL",
          referenceYear: 2028,
          referenceMonth: 2,
          referenceDay: 27,
        },
      ],
    });

    const data = await getNetWorthForUser(fixture.owner.id, {
      year: 2028,
      month: 2,
      months: 1,
      baseCurrency: "BRL",
    });

    expect(data.consolidation?.total).toBe(160_000);
    expect(data.consolidation?.convertedItems).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          resolution: expect.objectContaining({
            overridesPtax: true,
            provenance: "MANUAL",
          }),
        }),
      ]),
    );
  });

  it("reads only the needed rate rows (query budget) with a large FX history", async () => {
    const fixture = await createFixture();
    await seedBrlAndUsd(fixture);
    await prisma.exchangeRate.createMany({
      data: Array.from({ length: 200 }, (_, index) => ({
        userId: fixture.owner.id,
        fromCurrency: "USD",
        toCurrency: "BRL",
        numerator: 500 + index,
        denominator: 100,
        source: "BCB_PTAX" as const,
        quoteSide: "SELL" as const,
        referenceYear: 2027,
        referenceMonth: 1 + Math.floor(index / 28) % 12,
        referenceDay: (index % 28) + 1,
      })),
    });
    const spy = vi.spyOn(prisma.exchangeRate, "findMany");
    try {
      const data = await getNetWorthForUser(fixture.owner.id, {
        year: 2028,
        month: 2,
        months: 1,
        baseCurrency: "BRL",
      });
      expect(data.consolidation?.complete).toBe(true);
      // 1 par (USD→BRL) = direção direta + inversa, cada uma com take: 2.
      expect(spy).toHaveBeenCalledTimes(2);
      for (const call of spy.mock.calls) {
        expect(call[0]?.take).toBe(2);
      }
    } finally {
      spy.mockRestore();
    }
  });
});
