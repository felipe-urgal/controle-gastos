import { randomUUID } from 'node:crypto';
import { afterAll, afterEach, describe, expect, it } from 'vitest';

import { getMonthlyDashboardForUser } from '@/app/lib/dashboard/monthly-dashboard';
import { getFinancialComparisonForUser } from '@/app/lib/financial-comparison/financial-comparison';
import { prisma } from '@/app/lib/prisma';
import { createTransferForUser } from '@/app/lib/transfers/create-transfer';

const createdUserIds: string[] = [];

afterEach(async () => {
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
        name: 'Comparison Owner',
        email: `comparison-owner-${suffix}@example.com`,
        password: 'test-hash',
      },
    }),
    prisma.user.create({
      data: {
        name: 'Comparison Other',
        email: `comparison-other-${suffix}@example.com`,
        password: 'test-hash',
      },
    }),
  ]);
  createdUserIds.push(owner.id, other.id);

  const [checking, savings, card, usdAccount, otherAccount] =
    await Promise.all([
    prisma.account.create({
      data: {
        name: 'Conta BRL comparação',
        type: 'CREDIT_DEBIT',
        currency: 'BRL',
        userId: owner.id,
      },
    }),
    prisma.account.create({
      data: {
        name: 'Reserva BRL comparação',
        type: 'CREDIT_DEBIT',
        currency: 'BRL',
        userId: owner.id,
      },
    }),
    prisma.account.create({
      data: {
        name: 'Cartão BRL comparação',
        type: 'CREDIT_CARD',
        currency: 'BRL',
        creditLimit: 200_000,
        statementClosingDay: 5,
        statementDueDay: 12,
        userId: owner.id,
      },
    }),
    prisma.account.create({
      data: {
        name: 'Conta USD comparação',
        type: 'CREDIT_DEBIT',
        currency: 'USD',
        userId: owner.id,
      },
    }),
    prisma.account.create({
      data: {
        name: 'Conta outro usuário comparação',
        type: 'CREDIT_DEBIT',
        currency: 'BRL',
        userId: other.id,
      },
    }),
  ]);

  const [incomeCategory, foodCategory, housingCategory, otherCategory] =
    await Promise.all([
      prisma.category.create({
        data: {
          name: 'Receita comparação',
          type: 'INCOME',
          userId: owner.id,
        },
      }),
      prisma.category.create({
        data: {
          name: 'Mercado comparação',
          type: 'EXPENSE',
          userId: owner.id,
        },
      }),
      prisma.category.create({
        data: {
          name: 'Moradia histórica',
          type: 'EXPENSE',
          isActive: false,
          userId: owner.id,
        },
      }),
      prisma.category.create({
        data: {
          name: 'Categoria externa comparação',
          type: 'EXPENSE',
          userId: other.id,
        },
      }),
    ]);

  await prisma.transaction.createMany({
    data: [
      {
        amount: 30_000,
        year: 2028,
        month: 1,
        day: 3,
        type: 'INCOME',
        kind: 'NORMAL',
        description: 'Receita janeiro',
        status: 'COMPLETED',
        categoryId: incomeCategory.id,
        accountId: checking.id,
        userId: owner.id,
      },
      {
        amount: 15_000,
        year: 2028,
        month: 1,
        day: 4,
        type: 'EXPENSE',
        kind: 'NORMAL',
        description: 'Despesa janeiro',
        status: 'COMPLETED',
        categoryId: foodCategory.id,
        accountId: checking.id,
        userId: owner.id,
      },
      {
        amount: 100_000,
        year: 2028,
        month: 4,
        day: 1,
        type: 'INCOME',
        kind: 'NORMAL',
        description: 'Receita abril',
        status: 'COMPLETED',
        categoryId: incomeCategory.id,
        accountId: checking.id,
        userId: owner.id,
      },
      {
        amount: 20_000,
        year: 2028,
        month: 4,
        day: 2,
        type: 'EXPENSE',
        kind: 'NORMAL',
        description: 'Mercado abril',
        status: 'COMPLETED',
        categoryId: foodCategory.id,
        accountId: checking.id,
        userId: owner.id,
      },
      {
        amount: 10_000,
        year: 2028,
        month: 4,
        day: 3,
        type: 'EXPENSE',
        kind: 'NORMAL',
        description: 'Moradia abril',
        status: 'COMPLETED',
        categoryId: housingCategory.id,
        accountId: checking.id,
        userId: owner.id,
      },
      {
        amount: 7_000,
        year: 2028,
        month: 4,
        day: 3,
        type: 'EXPENSE',
        kind: 'NORMAL',
        description: 'Despesa sem categoria abril',
        status: 'COMPLETED',
        accountId: checking.id,
        userId: owner.id,
      },
      {
        amount: 25_000,
        year: 2028,
        month: 4,
        day: 4,
        type: 'EXPENSE',
        kind: 'NORMAL',
        description: 'Compra cartão abril',
        status: 'COMPLETED',
        categoryId: foodCategory.id,
        accountId: card.id,
        userId: owner.id,
      },
      {
        amount: 5_000,
        year: 2028,
        month: 4,
        day: 4,
        type: 'INCOME',
        kind: 'NORMAL',
        description: 'Estorno cartão abril',
        status: 'COMPLETED',
        categoryId: foodCategory.id,
        accountId: card.id,
        userId: owner.id,
      },
      {
        amount: 40_000,
        year: 2028,
        month: 4,
        day: 7,
        type: 'EXPENSE',
        kind: 'CARD_PAYMENT',
        description: 'Pagamento de fatura excluído',
        status: 'COMPLETED',
        accountId: checking.id,
        userId: owner.id,
      },
      {
        amount: 99_000,
        year: 2028,
        month: 4,
        day: 8,
        type: 'EXPENSE',
        kind: 'NORMAL',
        description: 'Outra moeda',
        status: 'COMPLETED',
        categoryId: foodCategory.id,
        accountId: usdAccount.id,
        userId: owner.id,
      },
      {
        amount: 999_999,
        year: 2028,
        month: 4,
        day: 9,
        type: 'EXPENSE',
        kind: 'NORMAL',
        description: 'Outro usuário',
        status: 'COMPLETED',
        categoryId: otherCategory.id,
        accountId: otherAccount.id,
        userId: other.id,
      },
      {
        amount: 60_000,
        year: 2028,
        month: 5,
        day: 1,
        type: 'INCOME',
        kind: 'NORMAL',
        description: 'Receita maio',
        status: 'COMPLETED',
        categoryId: incomeCategory.id,
        accountId: checking.id,
        userId: owner.id,
      },
      {
        amount: 20_000,
        year: 2028,
        month: 5,
        day: 2,
        type: 'EXPENSE',
        kind: 'NORMAL',
        description: 'Despesa maio',
        status: 'COMPLETED',
        categoryId: foodCategory.id,
        accountId: checking.id,
        userId: owner.id,
      },
    ],
  });

  await createTransferForUser(
    owner.id,
    {
      sourceAccountId: checking.id,
      destinationAccountId: savings.id,
      amountCents: 50_000,
      year: 2028,
      month: 4,
      day: 6,
      description: 'Transferência excluída',
      status: 'COMPLETED',
    },
    `comparison-transfer-${suffix}`,
  );

  const allocated = await prisma.transaction.create({
    data: {
      amount: 30_000,
      year: 2028,
      month: 4,
      day: 5,
      type: 'EXPENSE',
      kind: 'NORMAL',
      description: 'Despesa dividida abril',
      status: 'COMPLETED',
      categoryId: foodCategory.id,
      accountId: checking.id,
      userId: owner.id,
    },
  });

  await prisma.transactionAllocation.createMany({
    data: [
      {
        amount: 20_000,
        userId: owner.id,
        transactionId: allocated.id,
        categoryId: foodCategory.id,
      },
      {
        amount: 10_000,
        userId: owner.id,
        transactionId: allocated.id,
        categoryId: housingCategory.id,
      },
    ],
  });

  return {
    owner,
    checking,
    incomeCategory,
    foodCategory,
    housingCategory,
  };
}

describe('financial comparison integration', () => {
  it('matches the canonical realized summary and reconciles expense categories', async () => {
    const { owner, foodCategory, housingCategory } = await createFixture();
    const now = new Date('2028-06-15T12:00:00Z');

    const [comparison, dashboard] = await Promise.all([
      getFinancialComparisonForUser(
        owner.id,
        {
          a: {
            from: { year: 2028, month: 4 },
            to: { year: 2028, month: 4 },
          },
          b: {
            from: { year: 2028, month: 5 },
            to: { year: 2028, month: 5 },
          },
          currency: 'BRL',
        },
        now,
      ),
      getMonthlyDashboardForUser(
        owner.id,
        { year: 2028, month: 4 },
        'BRL',
        now,
      ),
    ]);

    expect(comparison.a).toMatchObject({
      income: 100_000,
      expense: 87_000,
      balance: 13_000,
      averageMonthlyIncome: 100_000,
      averageMonthlyExpense: 87_000,
      averageMonthlyBalance: 13_000,
    });
    expect({
      income: comparison.a.income,
      expense: comparison.a.expense,
      balance: comparison.a.balance,
    }).toEqual(dashboard.summary);

    expect(comparison.a.categories).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: foodCategory.id,
          amount: 60_000,
        }),
        expect.objectContaining({
          id: housingCategory.id,
          name: 'Moradia histórica',
          amount: 20_000,
        }),
        expect.objectContaining({
          name: 'Sem categoria',
          amount: 7_000,
        }),
      ]),
    );
    expect(
      comparison.a.categories.reduce((sum, item) => sum + item.amount, 0),
    ).toBe(comparison.a.expense);

    expect(comparison.b).toMatchObject({
      income: 60_000,
      expense: 20_000,
      balance: 40_000,
    });
    expect(comparison.netWorthMethodology.basis).toBe(
      'TRANSACTION_BALANCE',
    );
    expect(comparison.a.netWorthAsOf).toEqual({
      year: 2028,
      month: 4,
      day: 30,
    });
  });

  it('normalizes 3 months against 12 months without hiding absolute totals', async () => {
    const { owner } = await createFixture();

    const comparison = await getFinancialComparisonForUser(
      owner.id,
      {
        a: {
          from: { year: 2028, month: 1 },
          to: { year: 2028, month: 3 },
        },
        b: {
          from: { year: 2028, month: 1 },
          to: { year: 2028, month: 12 },
        },
        currency: 'BRL',
      },
      new Date('2029-01-15T12:00:00Z'),
    );

    expect(comparison.coverage).toEqual({
      sameLength: false,
      overlaps: true,
    });
    expect(comparison.a.months).toBe(3);
    expect(comparison.b.months).toBe(12);
    expect(comparison.a.income).toBe(30_000);
    expect(comparison.a.averageMonthlyIncome).toBe(10_000);
    expect(comparison.b.income).toBe(190_000);
    expect(comparison.b.averageMonthlyIncome).toBe(15_833);
  });

  it('keeps current investment comparison on the transactional history basis', async () => {
    const { owner, incomeCategory } = await createFixture();
    const investment = await prisma.account.create({
      data: {
        name: 'Corretora comparação',
        type: 'INVESTMENT',
        currency: 'BRL',
        userId: owner.id,
      },
    });

    await prisma.transaction.create({
      data: {
        amount: 100_000,
        year: 2026,
        month: 10,
        day: 1,
        type: 'INCOME',
        kind: 'NORMAL',
        description: 'Aporte corretora comparação',
        status: 'COMPLETED',
        accountId: investment.id,
        categoryId: incomeCategory.id,
        userId: owner.id,
      },
    });

    const asset = await prisma.investmentAsset.create({
      data: {
        symbol: `CMP${randomUUID().slice(0, 5)}`.toUpperCase(),
        type: 'STOCK',
        currency: 'BRL',
        market: 'B3',
        userId: owner.id,
      },
    });
    await prisma.investmentOperation.create({
      data: {
        type: 'BUY',
        quantityUnits: BigInt(10) * BigInt(100_000_000),
        unitPriceCents: 6_000,
        feesCents: 0,
        year: 2026,
        month: 10,
        day: 2,
        userId: owner.id,
        accountId: investment.id,
        assetId: asset.id,
      },
    });
    await prisma.assetQuote.create({
      data: {
        assetId: asset.id,
        priceCents: 7_000,
        currency: 'BRL',
        referenceAt: new Date('2026-10-05T12:00:00Z'),
        source: 'BRAPI',
        fetchedAt: new Date('2026-10-05T12:00:00Z'),
      },
    });

    const comparison = await getFinancialComparisonForUser(
      owner.id,
      {
        a: {
          from: { year: 2026, month: 9 },
          to: { year: 2026, month: 9 },
        },
        b: {
          from: { year: 2026, month: 10 },
          to: { year: 2026, month: 10 },
        },
        currency: 'BRL',
      },
      new Date('2026-10-06T12:00:00Z'),
    );

    expect(comparison.netWorthMethodology.basis).toBe(
      'TRANSACTION_BALANCE',
    );
    expect(comparison.a.netWorthEnd).toBe(0);
    expect(comparison.b.netWorthEnd).toBe(100_000);
    expect(comparison.b.netWorthAsOf).toEqual({
      year: 2026,
      month: 10,
      day: 6,
    });
  });

  it('uses effective debt dates in comparable historical net worth points', async () => {
    const { owner, checking, incomeCategory } = await createFixture();

    await prisma.transaction.create({
      data: {
        amount: 100_000,
        year: 2026,
        month: 9,
        day: 1,
        type: 'INCOME',
        kind: 'NORMAL',
        description: 'Saldo para passivo comparação',
        status: 'COMPLETED',
        accountId: checking.id,
        categoryId: incomeCategory.id,
        userId: owner.id,
      },
    });
    const debt = await prisma.debt.create({
      data: {
        userId: owner.id,
        name: 'Passivo comparação',
        currency: 'BRL',
        balance: 30_000,
        adjustments: {
          create: {
            userId: owner.id,
            previousBalance: 0,
            newBalance: 50_000,
            delta: 50_000,
            kind: 'INITIAL_BALANCE',
            effectiveYear: 2026,
            effectiveMonth: 9,
            effectiveDay: 1,
          },
        },
      },
    });
    await prisma.debtAdjustment.create({
      data: {
        userId: owner.id,
        debtId: debt.id,
        previousBalance: 50_000,
        newBalance: 30_000,
        delta: -20_000,
        kind: 'MANUAL_ADJUSTMENT',
        effectiveYear: 2026,
        effectiveMonth: 10,
        effectiveDay: 1,
      },
    });

    const comparison = await getFinancialComparisonForUser(
      owner.id,
      {
        a: {
          from: { year: 2026, month: 9 },
          to: { year: 2026, month: 9 },
        },
        b: {
          from: { year: 2026, month: 10 },
          to: { year: 2026, month: 10 },
        },
        currency: 'BRL',
      },
      new Date('2026-11-15T12:00:00Z'),
    );

    expect(comparison.a.netWorthEnd).toBe(50_000);
    expect(comparison.b.netWorthEnd).toBe(70_000);
    expect(comparison.difference.netWorthEnd).toMatchObject({
      difference: 20_000,
    });
  });

  it('rejects future realized ranges before querying user data', async () => {
    await expect(
      getFinancialComparisonForUser(
        'unused-user-id',
        {
          a: {
            from: { year: 2028, month: 5 },
            to: { year: 2028, month: 7 },
          },
          b: {
            from: { year: 2028, month: 4 },
            to: { year: 2028, month: 4 },
          },
          currency: 'BRL',
        },
        new Date('2028-06-15T12:00:00Z'),
      ),
    ).rejects.toMatchObject({
      status: 400,
      code: 'FUTURE_COMPARISON_PERIOD',
    });
  });
});
