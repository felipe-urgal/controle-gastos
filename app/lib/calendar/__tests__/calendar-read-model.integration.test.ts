import { afterAll, afterEach, describe, expect, it } from 'vitest';

import { getCalendarForUser } from '@/app/lib/calendar/calendar-read-model';
import { prisma } from '@/app/lib/prisma';
import { createTransferForUser } from '@/app/lib/transfers/create-transfer';
import { FinancialTestFactory } from '@/tests/support/financial-test-factory';

const fixtures = new FinancialTestFactory();

afterEach(async () => {
  await fixtures.cleanup();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('calendar read model integration', () => {
  it('combines realized movements with canonical commitments without double counting', async () => {
    const owner = await fixtures.user({ name: 'Calendar Owner' });
    const [
      cash,
      destination,
      card,
      incomeCategory,
      expenseCategory,
    ] = await Promise.all([
      fixtures.account(owner.id, {
        name: 'Conta principal',
        currency: 'BRL',
      }),
      fixtures.account(owner.id, {
        name: 'Conta destino',
        currency: 'BRL',
      }),
      fixtures.account(owner.id, {
        name: 'Cartão calendário',
        type: 'CREDIT_CARD',
        currency: 'BRL',
        creditLimit: 100_000,
        statementClosingDay: 5,
        statementDueDay: 12,
      }),
      fixtures.category(owner.id, {
        name: 'Receitas calendário',
        type: 'INCOME',
      }),
      fixtures.category(owner.id, {
        name: 'Despesas calendário',
        type: 'EXPENSE',
      }),
    ]);

    await prisma.transaction.createMany({
      data: [
        {
          userId: owner.id,
          accountId: cash.id,
          categoryId: incomeCategory.id,
          amount: 10_000,
          description: 'Salário realizado',
          type: 'INCOME',
          status: 'COMPLETED',
          year: 2028,
          month: 4,
          day: 3,
        },
        {
          userId: owner.id,
          accountId: cash.id,
          categoryId: expenseCategory.id,
          amount: 2_500,
          description: 'Despesa realizada',
          type: 'EXPENSE',
          status: 'COMPLETED',
          year: 2028,
          month: 4,
          day: 4,
        },
        {
          userId: owner.id,
          accountId: cash.id,
          categoryId: expenseCategory.id,
          amount: 3_000,
          description: 'Conta pendente',
          type: 'EXPENSE',
          status: 'PENDING',
          year: 2028,
          month: 4,
          day: 15,
        },
        {
          userId: owner.id,
          accountId: card.id,
          categoryId: expenseCategory.id,
          amount: 6_000,
          description: 'Compra do cartão',
          type: 'EXPENSE',
          status: 'COMPLETED',
          year: 2028,
          month: 4,
          day: 4,
        },
      ],
    });

    await createTransferForUser(
      owner.id,
      {
        sourceAccountId: cash.id,
        destinationAccountId: destination.id,
        amountCents: 4_000,
        year: 2028,
        month: 4,
        day: 5,
        description: 'Reserva mensal',
        status: 'COMPLETED',
      },
      'calendar-transfer',
    );

    await prisma.debt.create({
      data: {
        userId: owner.id,
        name: 'Financiamento',
        currency: 'BRL',
        balance: 70_000,
        installmentAmount: 7_000,
        dueYear: 2028,
        dueMonth: 4,
        dueDay: 16,
        remainingInstallments: 10,
      },
    });

    await prisma.financialGoal.create({
      data: {
        userId: owner.id,
        name: 'Reserva de viagem',
        targetAmount: 100_000,
        currency: 'BRL',
        targetYear: 2028,
        targetMonth: 4,
        targetDay: 20,
      },
    });

    const data = await getCalendarForUser(
      owner.id,
      { year: 2028, month: 4 },
      new Date('2028-04-10T12:00:00.000Z'),
    );

    expect(data.summary).toEqual([
      {
        currency: 'BRL',
        income: 10_000,
        expense: 8_500,
        balance: 1_500,
      },
    ]);

    expect(
      data.days
        .flatMap((day) => day.events)
        .filter((event) => event.sourceKind === 'TRANSFER'),
    ).toHaveLength(1);

    expect(data.commitments).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          title: 'Conta pendente',
          direction: 'EXPENSE',
        }),
        expect.objectContaining({
          sourceKind: 'CARD_STATEMENT',
          title: 'Fatura · Cartão calendário',
          amount: 6_000,
        }),
        expect.objectContaining({
          sourceKind: 'DEBT_INSTALLMENT',
          amount: 7_000,
        }),
        expect.objectContaining({
          sourceKind: 'GOAL_DEADLINE',
          direction: 'MILESTONE',
          amount: null,
        }),
      ]),
    );

    expect(
      data.commitments.some((item) => item.title === 'Compra do cartão'),
    ).toBe(false);

    const filtered = await getCalendarForUser(
      owner.id,
      { year: 2028, month: 4, accountId: cash.id },
      new Date('2028-04-10T12:00:00.000Z'),
    );

    expect(filtered.summary).toEqual([
      {
        currency: 'BRL',
        income: 10_000,
        expense: 2_500,
        balance: 7_500,
      },
    ]);
    expect(
      filtered.commitments.map((item) => item.sourceKind),
    ).toEqual(['TRANSACTION']);
    expect(
      filtered.days
        .flatMap((day) => day.events)
        .filter((event) => event.sourceKind === 'TRANSFER'),
    ).toHaveLength(1);
  });

  it('enforces account ownership without leaking foreign account data', async () => {
    const owner = await fixtures.user({ name: 'Calendar Owner' });
    const stranger = await fixtures.user({ name: 'Calendar Stranger' });
    const foreignAccount = await fixtures.account(stranger.id);

    await expect(
      getCalendarForUser(owner.id, {
        year: 2028,
        month: 4,
        accountId: foreignAccount.id,
      }),
    ).rejects.toMatchObject({
      status: 404,
      code: 'ACCOUNT_NOT_FOUND',
    });
  });

  it('does not truncate months with more than 1000 movements', async () => {
    const owner = await fixtures.user({ name: 'Calendar Scale Owner' });
    const [account, category] = await Promise.all([
      fixtures.account(owner.id, { currency: 'BRL' }),
      fixtures.category(owner.id, { type: 'EXPENSE' }),
    ]);

    await prisma.transaction.createMany({
      data: Array.from({ length: 1001 }, (_, index) => ({
        userId: owner.id,
        accountId: account.id,
        categoryId: category.id,
        amount: 100,
        description: `Movimento ${index + 1}`,
        type: 'EXPENSE' as const,
        status: 'CANCELLED' as const,
        year: 2028,
        month: 4,
        day: 1 + (index % 28),
      })),
    });

    const data = await getCalendarForUser(
      owner.id,
      { year: 2028, month: 4, accountId: account.id },
      new Date('2028-04-10T12:00:00.000Z'),
    );

    expect(data.days.flatMap((day) => day.events)).toHaveLength(1001);
    expect(data.summary).toEqual([]);
  });
});
