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

  const [account, otherAccount] = await Promise.all([
    prisma.account.create({
      data: {
        name: `Conta ${suffix}`,
        type: 'CREDIT_DEBIT',
        userId: owner.id,
      },
    }),
    prisma.account.create({
      data: {
        name: `Conta externa ${suffix}`,
        type: 'CREDIT_DEBIT',
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

  await prisma.categoryMonthlyLimit.create({
    data: {
      userId: owner.id,
      categoryId: foodCategory.id,
      year: 2028,
      month: 4,
      amount: 40_000,
    },
  });

  await prisma.transaction.createMany({
    data: [
      {
        amount: 100_000,
        year: 2028,
        month: 4,
        day: 1,
        type: 'INCOME',
        description: 'Receita realizada',
        status: 'COMPLETED',
        accountId: account.id,
        categoryId: incomeCategory.id,
        userId: owner.id,
      },
      {
        amount: 30_000,
        year: 2028,
        month: 4,
        day: 5,
        type: 'EXPENSE',
        description: 'Mercado realizado',
        status: 'COMPLETED',
        accountId: account.id,
        categoryId: foodCategory.id,
        userId: owner.id,
      },
      {
        amount: 20_000,
        year: 2028,
        month: 4,
        day: 10,
        type: 'EXPENSE',
        description: 'Moradia realizada',
        status: 'COMPLETED',
        accountId: account.id,
        categoryId: housingCategory.id,
        userId: owner.id,
      },
      {
        amount: 9_000,
        year: 2028,
        month: 4,
        day: 12,
        type: 'EXPENSE',
        description: 'Pendente',
        status: 'PENDING',
        accountId: account.id,
        categoryId: foodCategory.id,
        userId: owner.id,
      },
      {
        amount: 8_000,
        year: 2028,
        month: 4,
        day: 13,
        type: 'EXPENSE',
        description: 'Cancelada',
        status: 'CANCELLED',
        accountId: account.id,
        categoryId: foodCategory.id,
        userId: owner.id,
      },
      {
        amount: 50_000,
        year: 2028,
        month: 3,
        day: 1,
        type: 'INCOME',
        description: 'Receita anterior',
        status: 'COMPLETED',
        accountId: account.id,
        categoryId: incomeCategory.id,
        userId: owner.id,
      },
      {
        amount: 10_000,
        year: 2028,
        month: 3,
        day: 2,
        type: 'EXPENSE',
        description: 'Despesa anterior',
        status: 'COMPLETED',
        accountId: account.id,
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

  return { owner, account, foodCategory, housingCategory };
}

describe('monthly dashboard integration', () => {
  it('derives monthly metrics from completed transactions and isolates the user', async () => {
    const { owner, account, foodCategory, housingCategory } = await createFixture();

    const dashboard = await getMonthlyDashboardForUser(owner.id, {
      year: 2028,
      month: 4,
    });

    expect(dashboard.summary).toEqual({
      income: 100_000,
      expense: 50_000,
      balance: 50_000,
    });

    expect(dashboard.comparison.previousPeriod).toEqual({ year: 2028, month: 3 });
    expect(dashboard.comparison.income).toEqual({ difference: 50_000, percentage: 100 });
    expect(dashboard.comparison.expense).toEqual({ difference: 40_000, percentage: 400 });
    expect(dashboard.comparison.balance).toEqual({ difference: 10_000, percentage: 25 });

    expect(dashboard.accounts).toHaveLength(1);
    expect(dashboard.accounts[0]).toMatchObject({
      id: account.id,
      balance: 90_000,
    });

    expect(dashboard.categories).toEqual([
      expect.objectContaining({
        id: foodCategory.id,
        realized: 30_000,
        sharePercentage: 60,
      }),
      expect.objectContaining({
        id: housingCategory.id,
        realized: 20_000,
        sharePercentage: 40,
      }),
    ]);

    expect(dashboard.limits).toEqual([
      expect.objectContaining({
        category: expect.objectContaining({ id: foodCategory.id }),
        amount: 40_000,
        realized: 30_000,
        remaining: 10_000,
        percentage: 75,
      }),
    ]);

    expect(dashboard.flow).toHaveLength(6);
    expect(dashboard.flow[0]).toMatchObject({ year: 2027, month: 11 });
    expect(dashboard.flow.at(-1)).toMatchObject({
      year: 2028,
      month: 4,
      income: 100_000,
      expense: 50_000,
      balance: 50_000,
    });
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
