import { randomUUID } from 'node:crypto';
import { afterAll, afterEach, describe, expect, it } from 'vitest';

import { getDashboardHomeForUser } from '@/app/lib/dashboard/dashboard-home';
import { getMonthlyDashboardForUser } from '@/app/lib/dashboard/monthly-dashboard';
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

async function createOwner() {
  const suffix = randomUUID();
  const owner = await prisma.user.create({
    data: {
      name: 'Dashboard Home Owner',
      email: `dashboard-home-${suffix}@example.com`,
      password: 'test-hash',
    },
  });
  createdUserIds.push(owner.id);
  return { owner, suffix };
}

describe('dashboard home integration', () => {
  it('separates current cash from investments and excludes special movements from monthly flow', async () => {
    const { owner, suffix } = await createOwner();

    const [cash, reserve, investment, usd] = await Promise.all([
      prisma.account.create({
        data: {
          name: 'Conta corrente',
          type: 'CREDIT_DEBIT',
          currency: 'BRL',
          userId: owner.id,
        },
      }),
      prisma.account.create({
        data: {
          name: 'Reserva em caixa',
          type: 'CREDIT_DEBIT',
          currency: 'BRL',
          userId: owner.id,
        },
      }),
      prisma.account.create({
        data: {
          name: 'Investimentos',
          type: 'INVESTMENT',
          currency: 'BRL',
          userId: owner.id,
        },
      }),
      prisma.account.create({
        data: {
          name: 'Conta USD',
          type: 'CREDIT_DEBIT',
          currency: 'USD',
          userId: owner.id,
        },
      }),
    ]);

    const [incomeCategory, expenseCategory] = await Promise.all([
      prisma.category.create({
        data: {
          name: `Receita ${suffix}`.slice(0, 50),
          type: 'INCOME',
          userId: owner.id,
        },
      }),
      prisma.category.create({
        data: {
          name: `Despesa ${suffix}`.slice(0, 50),
          type: 'EXPENSE',
          userId: owner.id,
        },
      }),
    ]);

    await prisma.transaction.createMany({
      data: [
        {
          userId: owner.id,
          accountId: investment.id,
          categoryId: incomeCategory.id,
          amount: 500_000,
          description: 'Posição de investimento anterior',
          type: 'INCOME',
          status: 'COMPLETED',
          year: 2028,
          month: 3,
          day: 1,
        },
        {
          userId: owner.id,
          accountId: cash.id,
          categoryId: incomeCategory.id,
          amount: 100_000,
          description: 'Receita corrente',
          type: 'INCOME',
          status: 'COMPLETED',
          year: 2028,
          month: 4,
          day: 1,
        },
        {
          userId: owner.id,
          accountId: reserve.id,
          categoryId: incomeCategory.id,
          amount: 20_000,
          description: 'Receita reserva',
          type: 'INCOME',
          status: 'COMPLETED',
          year: 2028,
          month: 4,
          day: 2,
        },
        {
          userId: owner.id,
          accountId: cash.id,
          categoryId: expenseCategory.id,
          amount: 10_000,
          description: 'Despesa normal',
          type: 'EXPENSE',
          status: 'COMPLETED',
          year: 2028,
          month: 4,
          day: 3,
        },
        {
          userId: owner.id,
          accountId: cash.id,
          categoryId: null,
          amount: 5_000,
          description: 'Pagamento de fatura',
          type: 'EXPENSE',
          kind: 'CARD_PAYMENT',
          status: 'COMPLETED',
          year: 2028,
          month: 4,
          day: 4,
        },
        {
          userId: owner.id,
          accountId: usd.id,
          categoryId: incomeCategory.id,
          amount: 900_000,
          description: 'Receita USD',
          type: 'INCOME',
          status: 'COMPLETED',
          year: 2028,
          month: 4,
          day: 1,
        },
      ],
    });

    await createTransferForUser(
      owner.id,
      {
        sourceAccountId: cash.id,
        destinationAccountId: reserve.id,
        amountCents: 4_000,
        year: 2028,
        month: 4,
        day: 5,
        description: 'Transferência interna',
        status: 'COMPLETED',
      },
      'dashboard-home-transfer',
    );

    const monthly = await getMonthlyDashboardForUser(
      owner.id,
      { year: 2028, month: 4 },
      'BRL',
      new Date('2028-04-15T12:00:00.000Z'),
    );

    expect(monthly.summary).toEqual({
      income: 120_000,
      expense: 10_000,
      balance: 110_000,
    });

    const home = await getDashboardHomeForUser(
      owner.id,
      { year: 2028, month: 4 },
      'BRL',
      new Date('2028-04-15T12:00:00.000Z'),
    );

    expect(home.scope).toMatchObject({
      selectedPeriodRelation: 'CURRENT',
      currentAsOf: { year: 2028, month: 4, day: 15 },
    });
    expect(home.current.cash.accounts.map((account) => account.id)).toEqual(
      expect.arrayContaining([cash.id, reserve.id]),
    );
    expect(home.current.cash.accounts.map((account) => account.id)).not.toContain(
      investment.id,
    );
    expect(home.current.cash.total).toBe(105_000);
    expect(home.current.forecast.status).toBe('SUCCESS');
    if (home.current.forecast.status === 'SUCCESS') {
      expect(home.current.forecast.data.safeToSpend.realizedBalance).toBe(105_000);
    }
  });

  it('returns only the five latest transactions of the selected currency after more than 100 foreign movements', async () => {
    const { owner, suffix } = await createOwner();

    const [brl, usd, expenseCategory] = await Promise.all([
      prisma.account.create({
        data: {
          name: 'Conta BRL',
          type: 'CREDIT_DEBIT',
          currency: 'BRL',
          userId: owner.id,
        },
      }),
      prisma.account.create({
        data: {
          name: 'Conta USD',
          type: 'CREDIT_DEBIT',
          currency: 'USD',
          userId: owner.id,
        },
      }),
      prisma.category.create({
        data: {
          name: `Escala ${suffix}`.slice(0, 50),
          type: 'EXPENSE',
          userId: owner.id,
        },
      }),
    ]);

    await prisma.transaction.createMany({
      data: Array.from({ length: 101 }, (_, index) => ({
        userId: owner.id,
        accountId: usd.id,
        categoryId: expenseCategory.id,
        amount: 100 + index,
        description: `USD ${index}`,
        type: 'EXPENSE' as const,
        status: 'COMPLETED' as const,
        year: 2028,
        month: 4,
        day: 28,
      })),
    });

    for (let day = 1; day <= 6; day += 1) {
      await prisma.transaction.create({
        data: {
          userId: owner.id,
          accountId: brl.id,
          categoryId: expenseCategory.id,
          amount: day * 100,
          description: `BRL recente ${day}`,
          type: 'EXPENSE',
          status: day === 6 ? 'PENDING' : 'COMPLETED',
          year: 2028,
          month: 4,
          day,
        },
      });
    }

    const home = await getDashboardHomeForUser(
      owner.id,
      { year: 2028, month: 4 },
      'BRL',
      new Date('2028-04-15T12:00:00.000Z'),
    );

    expect(home.recentTransactions.status).toBe('SUCCESS');
    if (home.recentTransactions.status === 'SUCCESS') {
      expect(home.recentTransactions.data).toHaveLength(5);
      expect(
        home.recentTransactions.data.map((transaction) => transaction.description),
      ).toEqual([
        'BRL recente 6',
        'BRL recente 5',
        'BRL recente 4',
        'BRL recente 3',
        'BRL recente 2',
      ]);
      expect(
        home.recentTransactions.data.every(
          (transaction) => transaction.account.currency === 'BRL',
        ),
      ).toBe(true);
      expect(home.recentTransactions.data[0]?.status).toBe('PENDING');
    }
  });
});
