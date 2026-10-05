import { afterAll, afterEach, describe, expect, it } from 'vitest';

import { getFinancialCommitmentsForUser } from '@/app/lib/commitments/financial-commitments';
import { prisma } from '@/app/lib/prisma';
import { FinancialTestFactory } from '@/tests/support/financial-test-factory';

const fixtures = new FinancialTestFactory();

afterEach(async () => {
  await fixtures.cleanup();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('financial commitments integration', () => {
  it('mixes financial sources without netting income or duplicating card purchases', async () => {
    const owner = await fixtures.user({ name: 'Commitments Owner' });
    const [cash, card, incomeCategory, expenseCategory] = await Promise.all([
      fixtures.account(owner.id, { name: 'Conta BRL', currency: 'BRL' }),
      fixtures.account(owner.id, {
        name: 'Cartão BRL',
        type: 'CREDIT_CARD',
        currency: 'BRL',
        creditLimit: 100_000,
        statementClosingDay: 5,
        statementDueDay: 12,
      }),
      fixtures.category(owner.id, { name: 'Receitas', type: 'INCOME' }),
      fixtures.category(owner.id, { name: 'Despesas', type: 'EXPENSE' }),
    ]);

    await prisma.transaction.createMany({
      data: [
        {
          userId: owner.id,
          accountId: cash.id,
          categoryId: expenseCategory.id,
          amount: 1_000,
          description: 'Despesa vencida',
          type: 'EXPENSE',
          status: 'PENDING',
          year: 2028,
          month: 4,
          day: 9,
        },
        {
          userId: owner.id,
          accountId: cash.id,
          categoryId: incomeCategory.id,
          amount: 5_000,
          description: 'Receita futura',
          type: 'INCOME',
          status: 'PENDING',
          year: 2028,
          month: 4,
          day: 15,
        },
        {
          userId: owner.id,
          accountId: cash.id,
          categoryId: expenseCategory.id,
          amount: 2_000,
          description: 'Despesa futura',
          type: 'EXPENSE',
          status: 'PENDING',
          year: 2028,
          month: 4,
          day: 16,
        },
        {
          userId: owner.id,
          accountId: card.id,
          categoryId: expenseCategory.id,
          amount: 6_000,
          description: 'Compra cartão',
          type: 'EXPENSE',
          status: 'PENDING',
          year: 2028,
          month: 3,
          day: 4,
        },
      ],
    });

    const recurringSeries = await prisma.transactionSeries.create({
      data: {
        userId: owner.id,
        type: 'RECURRING',
        frequency: 'MONTHLY',
        interval: 1,
        description: 'Recorrência',
        anchorDay: 17,
        startYear: 2028,
        startMonth: 4,
        startDay: 17,
        endYear: 2028,
        endMonth: 4,
        endDay: 17,
        occurrenceCount: 1,
      },
    });
    const installmentSeries = await prisma.transactionSeries.create({
      data: {
        userId: owner.id,
        type: 'INSTALLMENT',
        frequency: 'MONTHLY',
        interval: 1,
        description: 'Parcela',
        anchorDay: 18,
        startYear: 2028,
        startMonth: 4,
        startDay: 18,
        endYear: 2028,
        endMonth: 4,
        endDay: 18,
        occurrenceCount: 1,
      },
    });

    await prisma.transaction.createMany({
      data: [
        {
          userId: owner.id,
          accountId: cash.id,
          categoryId: expenseCategory.id,
          seriesId: recurringSeries.id,
          seriesIndex: 1,
          amount: 3_000,
          description: 'Recorrência',
          type: 'EXPENSE',
          status: 'PENDING',
          year: 2028,
          month: 4,
          day: 17,
        },
        {
          userId: owner.id,
          accountId: cash.id,
          categoryId: expenseCategory.id,
          seriesId: installmentSeries.id,
          seriesIndex: 1,
          amount: 4_000,
          description: 'Parcela',
          type: 'EXPENSE',
          status: 'PENDING',
          year: 2028,
          month: 4,
          day: 18,
        },
      ],
    });

    await prisma.debt.create({
      data: {
        userId: owner.id,
        name: 'Dívida vencida',
        currency: 'BRL',
        balance: 70_000,
        installmentAmount: 7_000,
        dueYear: 2028,
        dueMonth: 4,
        dueDay: 8,
        remainingInstallments: 10,
      },
    });
    await prisma.financialGoal.create({
      data: {
        userId: owner.id,
        name: 'Meta com prazo',
        targetAmount: 100_000,
        currency: 'BRL',
        targetYear: 2028,
        targetMonth: 4,
        targetDay: 20,
      },
    });

    const data = await getFinancialCommitmentsForUser(
      owner.id,
      { currency: 'BRL', days: 30 },
      new Date('2028-04-10T12:00:00.000Z'),
    );

    expect(data.totals).toEqual({
      payable: { count: 6, amount: 23_000 },
      receivable: { count: 1, amount: 5_000 },
      milestoneCount: 1,
      overdueCount: 3,
    });
    expect(data.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ title: 'Despesa vencida', state: 'OVERDUE', direction: 'PAYABLE' }),
        expect.objectContaining({ title: 'Receita futura', direction: 'RECEIVABLE', amount: 5_000 }),
        expect.objectContaining({ type: 'RECURRING', amount: 3_000 }),
        expect.objectContaining({ type: 'INSTALLMENT', amount: 4_000 }),
        expect.objectContaining({ type: 'CARD_STATEMENT', amount: 6_000, state: 'OVERDUE' }),
        expect.objectContaining({ type: 'DEBT_INSTALLMENT', amount: 7_000, state: 'OVERDUE' }),
        expect.objectContaining({ type: 'GOAL_DEADLINE', amount: null, direction: 'MILESTONE' }),
      ]),
    );

    expect(data.items.filter((item) => item.type === 'CARD_STATEMENT')).toHaveLength(1);
    expect(data.items.some((item) => item.title === 'Compra cartão')).toBe(false);
  });

  it('keeps currency isolation', async () => {
    const owner = await fixtures.user({ name: 'Currency Owner' });
    const [brl, usd, category] = await Promise.all([
      fixtures.account(owner.id, { currency: 'BRL' }),
      fixtures.account(owner.id, { currency: 'USD' }),
      fixtures.category(owner.id, { type: 'EXPENSE' }),
    ]);

    await Promise.all([
      fixtures.transaction({
        userId: owner.id,
        accountId: brl.id,
        categoryId: category.id,
        overrides: { status: 'PENDING', amount: 1_000, year: 2028, month: 4, day: 15 },
      }),
      fixtures.transaction({
        userId: owner.id,
        accountId: usd.id,
        categoryId: category.id,
        overrides: { status: 'PENDING', amount: 9_000, year: 2028, month: 4, day: 15 },
      }),
    ]);

    const data = await getFinancialCommitmentsForUser(
      owner.id,
      { currency: 'BRL', days: 30 },
      new Date('2028-04-10T12:00:00.000Z'),
    );

    expect(data.totals.payable.amount).toBe(1_000);
    expect(data.items.every((item) => item.currency === 'BRL')).toBe(true);
  });
});
