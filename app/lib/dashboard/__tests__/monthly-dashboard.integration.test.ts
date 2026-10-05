import { randomUUID } from 'node:crypto';
import { afterAll, afterEach, describe, expect, it } from 'vitest';

import {
  dashboardComparisonMetric,
  getDashboardFlowPeriods,
  getMonthlyDashboardForUser,
  shiftDashboardPeriod,
} from '@/app/lib/dashboard/monthly-dashboard';
import { prisma } from '@/app/lib/prisma';

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
  const [owner, otherUser] = await Promise.all([
    prisma.user.create({
      data: {
        name: 'Dashboard Owner',
        email: `dashboard-owner-${suffix}@example.com`,
        password: 'test-hash',
      },
    }),
    prisma.user.create({
      data: {
        name: 'Dashboard Other',
        email: `dashboard-other-${suffix}@example.com`,
        password: 'test-hash',
      },
    }),
  ]);
  createdUserIds.push(owner.id, otherUser.id);

  const [brlAccount, usdAccount, otherAccount] = await Promise.all([
    prisma.account.create({
      data: {
        name: `Conta BRL ${suffix}`,
        type: 'CREDIT_DEBIT',
        currency: 'BRL',
        userId: owner.id,
      },
    }),
    prisma.account.create({
      data: {
        name: `Conta USD ${suffix}`,
        type: 'CREDIT_DEBIT',
        currency: 'USD',
        userId: owner.id,
      },
    }),
    prisma.account.create({
      data: {
        name: `Conta externa ${suffix}`,
        type: 'CREDIT_DEBIT',
        currency: 'BRL',
        userId: otherUser.id,
      },
    }),
  ]);

  const [incomeCategory, foodCategory, housingCategory, foreignCategory] =
    await Promise.all([
      prisma.category.create({
        data: {
          name: `Receita ${suffix}`.slice(0, 50),
          type: 'INCOME',
          userId: owner.id,
        },
      }),
      prisma.category.create({
        data: {
          name: `Mercado ${suffix}`.slice(0, 50),
          type: 'EXPENSE',
          userId: owner.id,
        },
      }),
      prisma.category.create({
        data: {
          name: `Moradia ${suffix}`.slice(0, 50),
          type: 'EXPENSE',
          userId: owner.id,
        },
      }),
      prisma.category.create({
        data: {
          name: `Externa ${suffix}`.slice(0, 50),
          type: 'EXPENSE',
          userId: otherUser.id,
        },
      }),
    ]);

  await prisma.categoryMonthlyLimit.createMany({
    data: [
      {
        userId: owner.id,
        categoryId: foodCategory.id,
        year: 2028,
        month: 4,
        currency: 'BRL',
        amount: 40_000,
      },
      {
        userId: owner.id,
        categoryId: foodCategory.id,
        year: 2028,
        month: 4,
        currency: 'USD',
        amount: 20_000,
      },
    ],
  });

  await prisma.transaction.createMany({
    data: [
      {
        amount: 100_000,
        year: 2028,
        month: 4,
        day: 1,
        type: 'INCOME',
        description: 'Receita BRL realizada',
        status: 'COMPLETED',
        accountId: brlAccount.id,
        categoryId: incomeCategory.id,
        userId: owner.id,
      },
      {
        amount: 30_000,
        year: 2028,
        month: 4,
        day: 5,
        type: 'EXPENSE',
        description: 'Mercado BRL',
        status: 'COMPLETED',
        accountId: brlAccount.id,
        categoryId: foodCategory.id,
        userId: owner.id,
      },
      {
        amount: 20_000,
        year: 2028,
        month: 4,
        day: 10,
        type: 'EXPENSE',
        description: 'Moradia BRL',
        status: 'COMPLETED',
        accountId: brlAccount.id,
        categoryId: housingCategory.id,
        userId: owner.id,
      },
      {
        amount: 50_000,
        year: 2028,
        month: 4,
        day: 2,
        type: 'INCOME',
        description: 'Receita USD realizada',
        status: 'COMPLETED',
        accountId: usdAccount.id,
        categoryId: incomeCategory.id,
        userId: owner.id,
      },
      {
        amount: 5_000,
        year: 2028,
        month: 4,
        day: 6,
        type: 'EXPENSE',
        description: 'Mercado USD',
        status: 'COMPLETED',
        accountId: usdAccount.id,
        categoryId: foodCategory.id,
        userId: owner.id,
      },
      {
        amount: 9_000,
        year: 2028,
        month: 4,
        day: 12,
        type: 'EXPENSE',
        description: 'Pendente BRL',
        status: 'PENDING',
        accountId: brlAccount.id,
        categoryId: foodCategory.id,
        userId: owner.id,
      },
      {
        amount: 50_000,
        year: 2028,
        month: 3,
        day: 1,
        type: 'INCOME',
        description: 'Receita BRL anterior',
        status: 'COMPLETED',
        accountId: brlAccount.id,
        categoryId: incomeCategory.id,
        userId: owner.id,
      },
      {
        amount: 10_000,
        year: 2028,
        month: 3,
        day: 2,
        type: 'EXPENSE',
        description: 'Despesa BRL anterior',
        status: 'COMPLETED',
        accountId: brlAccount.id,
        categoryId: foodCategory.id,
        userId: owner.id,
      },
      {
        amount: 20_000,
        year: 2028,
        month: 3,
        day: 1,
        type: 'INCOME',
        description: 'Receita USD anterior',
        status: 'COMPLETED',
        accountId: usdAccount.id,
        categoryId: incomeCategory.id,
        userId: owner.id,
      },
      {
        amount: 2_000,
        year: 2028,
        month: 3,
        day: 2,
        type: 'EXPENSE',
        description: 'Despesa USD anterior',
        status: 'COMPLETED',
        accountId: usdAccount.id,
        categoryId: foodCategory.id,
        userId: owner.id,
      },
      {
        amount: 900_000,
        year: 2028,
        month: 4,
        day: 3,
        type: 'EXPENSE',
        description: 'Outro usuário',
        status: 'COMPLETED',
        accountId: otherAccount.id,
        categoryId: foreignCategory.id,
        userId: otherUser.id,
      },
    ],
  });

  return { owner, brlAccount, usdAccount, foodCategory, housingCategory };
}

describe('monthly dashboard integration', () => {
  it('keeps BRL aggregates isolated from other currencies', async () => {
    const { owner, brlAccount, usdAccount, foodCategory, housingCategory } = await createFixture();

    const dashboard = await getMonthlyDashboardForUser(
      owner.id,
      { year: 2028, month: 4 },
      'BRL',
    );

    expect(dashboard.currency).toBe('BRL');
    expect(dashboard.summary).toEqual({
      income: 100_000,
      expense: 50_000,
      balance: 50_000,
    });
    expect(dashboard.comparison.income).toEqual({ difference: 50_000, percentage: 100 });
    expect(dashboard.comparison.expense).toEqual({ difference: 40_000, percentage: 400 });
    expect(dashboard.categories).toEqual([
      expect.objectContaining({
        id: foodCategory.id,
        currency: 'BRL',
        realized: 30_000,
        sharePercentage: 60,
      }),
      expect.objectContaining({
        id: housingCategory.id,
        currency: 'BRL',
        realized: 20_000,
        sharePercentage: 40,
      }),
    ]);
    expect(dashboard.limits).toEqual([
      expect.objectContaining({
        category: expect.objectContaining({ id: foodCategory.id }),
        currency: 'BRL',
        amount: 40_000,
        realized: 30_000,
        committed: 9_000,
        consumption: 39_000,
        remaining: 10_000,
        available: 1_000,
        percentage: 75,
        planningPercentage: 97.5,
        isOverBudget: false,
      }),
    ]);

    expect(dashboard.planning).toEqual({
      budget: 40_000,
      realized: 50_000,
      committed: 9_000,
      available: -19_000,
      overBudgetCategories: 0,
      realizedIncome: 100_000,
      expectedIncome: 0,
      totalIncome: 100_000,
    });

    const balances = new Map(dashboard.accounts.map((account) => [account.id, account.balance]));
    expect(balances.get(brlAccount.id)).toBe(90_000);
    expect(balances.get(usdAccount.id)).toBe(63_000);
  });

  it('keeps USD summary, comparison and limits independent from BRL', async () => {
    const { owner, foodCategory } = await createFixture();

    const dashboard = await getMonthlyDashboardForUser(
      owner.id,
      { year: 2028, month: 4 },
      'USD',
    );

    expect(dashboard.summary).toEqual({
      income: 50_000,
      expense: 5_000,
      balance: 45_000,
    });
    expect(dashboard.comparison.income).toEqual({ difference: 30_000, percentage: 150 });
    expect(dashboard.comparison.expense).toEqual({ difference: 3_000, percentage: 150 });
    expect(dashboard.categories).toEqual([
      expect.objectContaining({
        id: foodCategory.id,
        currency: 'USD',
        realized: 5_000,
        sharePercentage: 100,
      }),
    ]);
    expect(dashboard.limits).toEqual([
      expect.objectContaining({
        currency: 'USD',
        amount: 20_000,
        realized: 5_000,
        committed: 0,
        consumption: 5_000,
        remaining: 15_000,
        available: 15_000,
        percentage: 25,
        planningPercentage: 25,
        isOverBudget: false,
      }),
    ]);
    expect(dashboard.planning).toEqual({
      budget: 20_000,
      realized: 5_000,
      committed: 0,
      available: 15_000,
      overBudgetCategories: 0,
      realizedIncome: 50_000,
      expectedIncome: 0,
      totalIncome: 50_000,
    });
    expect(dashboard.flow.at(-1)).toMatchObject({
      year: 2028,
      month: 4,
      currency: 'USD',
      income: 50_000,
      expense: 5_000,
      balance: 45_000,
    });
  });

  it('adds card limit and next open statement without treating the card as cash balance', async () => {
    const { owner, foodCategory } = await createFixture();

    const card = await prisma.account.create({
      data: {
        name: 'Cartão Dashboard',
        type: 'CREDIT_CARD',
        currency: 'BRL',
        creditLimit: 100_000,
        statementClosingDay: 5,
        statementDueDay: 12,
        userId: owner.id,
      },
    });

    await prisma.transaction.createMany({
      data: [
        {
          amount: 25_000,
          year: 2028,
          month: 4,
          day: 4,
          type: 'EXPENSE',
          description: 'Compra cartão atual',
          status: 'COMPLETED',
          accountId: card.id,
          categoryId: foodCategory.id,
          userId: owner.id,
        },
        {
          amount: 10_000,
          year: 2028,
          month: 4,
          day: 4,
          type: 'INCOME',
          description: 'Crédito cartão atual',
          status: 'COMPLETED',
          accountId: card.id,
          categoryId: foodCategory.id,
          userId: owner.id,
        },
        {
          amount: 15_000,
          year: 2028,
          month: 5,
          day: 4,
          type: 'EXPENSE',
          description: 'Parcela futura cartão',
          status: 'PENDING',
          accountId: card.id,
          categoryId: foodCategory.id,
          userId: owner.id,
        },
      ],
    });

    const dashboard = await getMonthlyDashboardForUser(
      owner.id,
      { year: 2028, month: 4 },
      'BRL',
    );

    expect(dashboard.accounts.map((account) => account.id)).not.toContain(card.id);
    expect(dashboard.summary.expense).toBe(65_000);
    expect(
      dashboard.categories.reduce(
        (sum, category) => sum + category.sharePercentage,
        0,
      ),
    ).toBeCloseTo(100, 1);
    expect(
      dashboard.categories.find((category) => category.id === foodCategory.id),
    ).toMatchObject({
      realized: 55_000,
      sharePercentage: 73.3,
    });
    expect(dashboard.cards).toEqual([
      expect.objectContaining({
        id: card.id,
        creditLimit: 100_000,
        usedLimit: 30_000,
        availableLimit: 70_000,
        overLimit: 0,
        nextStatement: expect.objectContaining({
          amount: 15_000,
          closingDate: { year: 2028, month: 4, day: 5 },
          dueDate: { year: 2028, month: 4, day: 12 },
          transactionCount: 2,
        }),
      }),
    ]);
  });

  it('adds only active goals in the selected currency with derived progress', async () => {
    const { owner, brlAccount } = await createFixture();

    const [activeGoal, archivedGoal, usdGoal] = await Promise.all([
      prisma.financialGoal.create({
        data: {
          name: 'Reserva Dashboard',
          targetAmount: 100_000,
          currency: 'BRL',
          targetYear: 2028,
          targetMonth: 8,
          targetDay: 31,
          status: 'ACTIVE',
          userId: owner.id,
          accountId: brlAccount.id,
        },
      }),
      prisma.financialGoal.create({
        data: {
          name: 'Meta arquivada',
          targetAmount: 80_000,
          currency: 'BRL',
          status: 'ARCHIVED',
          userId: owner.id,
        },
      }),
      prisma.financialGoal.create({
        data: {
          name: 'Meta USD',
          targetAmount: 50_000,
          currency: 'USD',
          status: 'ACTIVE',
          userId: owner.id,
        },
      }),
    ]);

    await prisma.financialGoalEntry.createMany({
      data: [
        {
          type: 'CONTRIBUTION',
          amount: 35_000,
          userId: owner.id,
          goalId: activeGoal.id,
        },
        {
          type: 'CONTRIBUTION',
          amount: 10_000,
          userId: owner.id,
          goalId: activeGoal.id,
        },
        {
          type: 'WITHDRAWAL',
          amount: 5_000,
          userId: owner.id,
          goalId: activeGoal.id,
        },
        {
          type: 'CONTRIBUTION',
          amount: 20_000,
          userId: owner.id,
          goalId: archivedGoal.id,
        },
        {
          type: 'CONTRIBUTION',
          amount: 7_000,
          userId: owner.id,
          goalId: usdGoal.id,
        },
      ],
    });

    const dashboard = await getMonthlyDashboardForUser(
      owner.id,
      { year: 2028, month: 4 },
      'BRL',
    );

    expect(dashboard.goals).toEqual([
      expect.objectContaining({
        id: activeGoal.id,
        name: 'Reserva Dashboard',
        currency: 'BRL',
        targetAmount: 100_000,
        currentAmount: 40_000,
        remainingAmount: 60_000,
        percentage: 40,
        targetDate: '2028-08-31',
      }),
    ]);
    expect(dashboard.goals.map((goal) => goal.id)).not.toContain(archivedGoal.id);
    expect(dashboard.goals.map((goal) => goal.id)).not.toContain(usdGoal.id);
  });

  it('treats a zero comparison base as not applicable', () => {
    expect(dashboardComparisonMetric(10_000, 0)).toEqual({
      difference: 10_000,
      percentage: null,
    });
  });

  it('handles six-month windows across year boundaries', () => {
    expect(shiftDashboardPeriod({ year: 2028, month: 1 }, -1)).toEqual({
      year: 2027,
      month: 12,
    });
    expect(getDashboardFlowPeriods({ year: 2028, month: 2 })).toEqual([
      { year: 2027, month: 9 },
      { year: 2027, month: 10 },
      { year: 2027, month: 11 },
      { year: 2027, month: 12 },
      { year: 2028, month: 1 },
      { year: 2028, month: 2 },
    ]);
  });
});
