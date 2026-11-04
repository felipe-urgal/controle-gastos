import { randomUUID } from 'node:crypto';
import { afterAll, afterEach, describe, expect, it, vi } from 'vitest';

import { getDashboardHomeForUser } from '@/app/lib/dashboard/dashboard-home';
import { getMonthlyDashboardForUser } from '@/app/lib/dashboard/monthly-dashboard';
import { prisma } from '@/app/lib/prisma';
import { createTransferForUser } from '@/app/lib/transfers/create-transfer';

const createdUserIds: string[] = [];

afterEach(async () => {
  vi.restoreAllMocks();

  if (createdUserIds.length > 0) {
    await prisma.user.deleteMany({
      where: { id: { in: createdUserIds.splice(0) } },
    });
  }
});

afterAll(async () => {
  await prisma.$disconnect();
});

async function createUser(label: string) {
  const suffix = randomUUID();
  const user = await prisma.user.create({
    data: {
      name: label,
      email: `dashboard-follow-up-${suffix}@example.com`,
      password: 'test-hash',
    },
  });
  createdUserIds.push(user.id);
  return user;
}

async function createCategories(userId: string) {
  const suffix = randomUUID();
  const [income, expense] = await Promise.all([
    prisma.category.create({
      data: {
        name: `Receita Dashboard ${suffix}`.slice(0, 50),
        type: 'INCOME',
        userId,
      },
    }),
    prisma.category.create({
      data: {
        name: `Despesa Dashboard ${suffix}`.slice(0, 50),
        type: 'EXPENSE',
        userId,
      },
    }),
  ]);

  return { income, expense };
}

describe('dashboard follow-up contracts', () => {
  it('keeps NORMAL completed as realized while excluding pending, cancelled, transfer and card payment', async () => {
    const user = await createUser('Dashboard special kinds');

    const { income, expense } = await createCategories(user.id);

    const [cash, reserve, card] = await Promise.all([
      prisma.account.create({
        data: {
          name: 'Conta corrente',
          type: 'CREDIT_DEBIT',
          currency: 'BRL',
          userId: user.id,
        },
      }),
      prisma.account.create({
        data: {
          name: 'Reserva',
          type: 'CREDIT_DEBIT',
          currency: 'BRL',
          userId: user.id,
        },
      }),
      prisma.account.create({
        data: {
          name: 'Cartão',
          type: 'CREDIT_CARD',
          currency: 'BRL',
          creditLimit: 200_000,
          statementClosingDay: 5,
          statementDueDay: 12,
          userId: user.id,
        },
      }),
    ]);

    await prisma.transaction.createMany({
      data: [
        {
          userId: user.id,
          accountId: cash.id,
          categoryId: income.id,
          amount: 100_000,
          description: 'Receita normal',
          type: 'INCOME',
          kind: 'NORMAL',
          status: 'COMPLETED',
          year: 2028,
          month: 4,
          day: 1,
        },
        {
          userId: user.id,
          accountId: cash.id,
          categoryId: expense.id,
          amount: 20_000,
          description: 'Despesa normal',
          type: 'EXPENSE',
          kind: 'NORMAL',
          status: 'COMPLETED',
          year: 2028,
          month: 4,
          day: 2,
        },
        {
          userId: user.id,
          accountId: cash.id,
          categoryId: expense.id,
          amount: 30_000,
          description: 'Despesa pendente',
          type: 'EXPENSE',
          kind: 'NORMAL',
          status: 'PENDING',
          year: 2028,
          month: 4,
          day: 3,
        },
        {
          userId: user.id,
          accountId: cash.id,
          categoryId: expense.id,
          amount: 40_000,
          description: 'Despesa cancelada',
          type: 'EXPENSE',
          kind: 'NORMAL',
          status: 'CANCELLED',
          year: 2028,
          month: 4,
          day: 4,
        },
        {
          userId: user.id,
          accountId: card.id,
          categoryId: expense.id,
          amount: 50_000,
          description: 'Compra no cartão',
          type: 'EXPENSE',
          kind: 'NORMAL',
          status: 'COMPLETED',
          year: 2028,
          month: 4,
          day: 5,
        },
        {
          userId: user.id,
          accountId: card.id,
          categoryId: income.id,
          amount: 10_000,
          description: 'Crédito de cartão',
          type: 'INCOME',
          kind: 'NORMAL',
          status: 'COMPLETED',
          year: 2028,
          month: 4,
          day: 6,
        },
        {
          userId: user.id,
          accountId: cash.id,
          categoryId: null,
          amount: 40_000,
          description: 'Pagamento de fatura',
          type: 'EXPENSE',
          kind: 'CARD_PAYMENT',
          status: 'COMPLETED',
          year: 2028,
          month: 4,
          day: 7,
        },
      ],
    });

    await createTransferForUser(
      user.id,
      {
        sourceAccountId: cash.id,
        destinationAccountId: reserve.id,
        amountCents: 5_000,
        year: 2028,
        month: 4,
        day: 8,
        description: 'Transferência interna',
        status: 'COMPLETED',
      },
      'dashboard-follow-up-transfer',
    );

    const dashboard = await getMonthlyDashboardForUser(
      user.id,
      { year: 2028, month: 4 },
      'BRL',
      new Date('2028-04-15T12:00:00.000Z'),
    );

    expect(dashboard.summary).toEqual({
      income: 100_000,
      expense: 60_000,
      balance: 40_000,
    });
    expect(dashboard.flow.at(-1)).toMatchObject({
      year: 2028,
      month: 4,
      income: 100_000,
      expense: 60_000,
      balance: 40_000,
    });
    expect(dashboard.cards[0]).toMatchObject({
      id: card.id,
      usedLimit: 40_000,
    });
  });

  it('shows a past month as it stood on its last day', async () => {
    const user = await createUser('Dashboard historical period');

    const { income } = await createCategories(user.id);

    const cash = await prisma.account.create({
      data: {
        name: 'Conta histórica',
        type: 'CREDIT_DEBIT',
        currency: 'BRL',
        userId: user.id,
      },
    });

    await prisma.transaction.createMany({
      data: [
        {
          userId: user.id,
          accountId: cash.id,
          categoryId: income.id,
          amount: 50_000,
          description: 'Receita de setembro',
          type: 'INCOME',
          kind: 'NORMAL',
          status: 'COMPLETED',
          year: 2026,
          month: 9,
          day: 10,
        },
        {
          userId: user.id,
          accountId: cash.id,
          categoryId: income.id,
          amount: 25_000,
          description: 'Receita de outubro',
          type: 'INCOME',
          kind: 'NORMAL',
          status: 'COMPLETED',
          year: 2026,
          month: 10,
          day: 2,
        },
      ],
    });

    const home = await getDashboardHomeForUser(
      user.id,
      { year: 2026, month: 9 },
      'BRL',
      new Date('2026-10-06T03:00:00.000Z'),
    );

    expect(home.scope).toEqual({
      selectedPeriod: { year: 2026, month: 9 },
      selectedPeriodRelation: 'PAST',
      currentAsOf: { year: 2026, month: 10, day: 6 },
      referenceDate: { year: 2026, month: 9, day: 30 },
    });
    expect(home.monthly.summary.income).toBe(50_000);
    // Saldo em caixa no fim de setembro: a receita de outubro ainda não existia.
    expect(home.current.cash.total).toBe(50_000);
    expect(home.current.forecast).toEqual({ status: 'NOT_APPLICABLE' });
    expect(home.current.commitments).toEqual({ status: 'NOT_APPLICABLE' });
    expect(home.recentTransactions.status).toBe('SUCCESS');
    if (home.recentTransactions.status === 'SUCCESS') {
      expect(home.recentTransactions.data.map((item) => item.description)).toEqual([
        'Receita de setembro',
      ]);
    }
  });

  it('projects a future month up to its last day, and only within 90 days', async () => {
    const user = await createUser('Dashboard future month');
    await prisma.account.create({
      data: { name: 'Conta futura', type: 'CREDIT_DEBIT', currency: 'BRL', userId: user.id },
    });
    const now = new Date('2026-10-06T15:00:00.000Z');

    const december = await getDashboardHomeForUser(user.id, { year: 2026, month: 12 }, 'BRL', now);
    expect(december.scope.selectedPeriodRelation).toBe('FUTURE');
    expect(december.scope.referenceDate).toEqual({ year: 2026, month: 10, day: 6 });
    expect(december.current.forecast.status).toBe('SUCCESS');
    if (december.current.forecast.status === 'SUCCESS') {
      expect(december.current.forecast.data.safeToSpend.through).toEqual({ year: 2026, month: 12, day: 31 });
    }

    const march = await getDashboardHomeForUser(user.id, { year: 2027, month: 3 }, 'BRL', now);
    expect(march.current.forecast).toEqual({ status: 'NOT_APPLICABLE' });
    expect(march.current.commitments).toEqual({ status: 'NOT_APPLICABLE' });
  });

  it('uses the canonical commitment directions for payable, receivable and milestone items', async () => {
    const user = await createUser('Dashboard commitments');

    const { income, expense } = await createCategories(user.id);

    const cash = await prisma.account.create({
      data: {
        name: 'Conta compromissos',
        type: 'CREDIT_DEBIT',
        currency: 'BRL',
        userId: user.id,
      },
    });

    const goal = await prisma.financialGoal.create({
      data: {
        name: 'Meta com prazo',
        targetAmount: 100_000,
        currency: 'BRL',
        targetYear: 2026,
        targetMonth: 10,
        targetDay: 20,
        status: 'ACTIVE',
        userId: user.id,
        accountId: cash.id,
      },
    });

    await prisma.transaction.createMany({
      data: [
        {
          userId: user.id,
          accountId: cash.id,
          categoryId: expense.id,
          amount: 12_000,
          description: 'Conta vencida',
          type: 'EXPENSE',
          kind: 'NORMAL',
          status: 'PENDING',
          year: 2026,
          month: 10,
          day: 5,
        },
        {
          userId: user.id,
          accountId: cash.id,
          categoryId: income.id,
          amount: 8_000,
          description: 'Receita futura',
          type: 'INCOME',
          kind: 'NORMAL',
          status: 'PENDING',
          year: 2026,
          month: 10,
          day: 10,
        },
      ],
    });

    const home = await getDashboardHomeForUser(
      user.id,
      { year: 2026, month: 10 },
      'BRL',
      new Date('2026-10-06T12:00:00.000Z'),
    );

    expect(home.current.commitments.status).toBe('SUCCESS');
    if (home.current.commitments.status === 'SUCCESS') {
      expect(home.current.commitments.data.items).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            title: 'Conta vencida',
            direction: 'PAYABLE',
            state: 'OVERDUE',
          }),
          expect.objectContaining({
            title: 'Receita futura',
            direction: 'RECEIVABLE',
            state: 'UPCOMING',
          }),
          expect.objectContaining({
            source: { kind: 'GOAL', id: goal.id },
            direction: 'MILESTONE',
            href: `/metas#goal-${goal.id}`,
          }),
        ]),
      );
    }
  });

  it('treats the Brazil year rollover consistently', async () => {
    const user = await createUser('Dashboard Brazil rollover');

    // 31/12 às 23h59 em Brasília (já 01/01 em UTC) ainda é dezembro.
    const beforeMidnight = await getDashboardHomeForUser(
      user.id,
      { year: 2028, month: 12 },
      'BRL',
      new Date('2029-01-01T02:59:59.000Z'),
    );
    expect(beforeMidnight.scope).toMatchObject({
      selectedPeriodRelation: 'CURRENT',
      currentAsOf: { year: 2028, month: 12, day: 31 },
    });

    const home = await getDashboardHomeForUser(
      user.id,
      { year: 2028, month: 12 },
      'BRL',
      new Date('2029-01-01T03:00:01.000Z'),
    );

    expect(home.scope).toMatchObject({
      selectedPeriod: { year: 2028, month: 12 },
      selectedPeriodRelation: 'PAST',
      currentAsOf: { year: 2029, month: 1, day: 1 },
    });
  });

  it('skips credit-card payment and statement reads when there is no eligible card', async () => {
    const user = await createUser('Dashboard without cards');

    await prisma.account.create({
      data: {
        name: 'Conta sem cartão',
        type: 'CREDIT_DEBIT',
        currency: 'BRL',
        userId: user.id,
      },
    });

    const paymentGroupBy = vi.spyOn(prisma.creditCardPayment, 'groupBy');
    const paymentFindMany = vi.spyOn(prisma.creditCardPayment, 'findMany');
    const transactionFindMany = vi.spyOn(prisma.transaction, 'findMany');

    await getMonthlyDashboardForUser(
      user.id,
      { year: 2026, month: 10 },
      'BRL',
      new Date('2026-10-06T12:00:00.000Z'),
    );

    expect(paymentGroupBy).not.toHaveBeenCalled();
    expect(paymentFindMany).not.toHaveBeenCalled();
    expect(transactionFindMany).not.toHaveBeenCalled();
  });
});
