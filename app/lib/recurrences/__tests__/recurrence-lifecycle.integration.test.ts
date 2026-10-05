import { afterAll, afterEach, describe, expect, it } from 'vitest';

import { endRecurrenceSeriesForUser } from '@/app/lib/recurrences/end-series';
import { prisma } from '@/app/lib/prisma';
import { syncTransactionSeriesMetadata } from '@/app/lib/transactions/transaction-series-metadata';
import { FinancialTestFactory } from '@/tests/support/financial-test-factory';

const fixtures = new FinancialTestFactory();

afterEach(async () => {
  await fixtures.cleanup();
});

afterAll(async () => {
  await prisma.$disconnect();
});

async function createSeries(userId: string, sourceKey = 'test:series') {
  return prisma.transactionSeries.create({
    data: {
      userId,
      type: 'RECURRING',
      frequency: 'MONTHLY',
      interval: 1,
      description: 'Série de teste',
      anchorDay: 10,
      startYear: 2028,
      startMonth: 3,
      startDay: 10,
      endYear: 2028,
      endMonth: 5,
      endDay: 10,
      occurrenceCount: 3,
      sourceKey,
    },
  });
}

describe('recurrence lifecycle integration', () => {
  it('ends a series by cancelling only future pending occurrences and preserving history', async () => {
    const owner = await fixtures.user();
    const [account, category] = await Promise.all([
      fixtures.account(owner.id),
      fixtures.category(owner.id, { type: 'EXPENSE' }),
    ]);
    const series = await createSeries(owner.id);

    await prisma.transaction.createMany({
      data: [
        {
          userId: owner.id,
          accountId: account.id,
          categoryId: category.id,
          seriesId: series.id,
          seriesIndex: 1,
          amount: 1_000,
          description: 'Histórico',
          type: 'EXPENSE',
          status: 'COMPLETED',
          year: 2028,
          month: 3,
          day: 10,
        },
        {
          userId: owner.id,
          accountId: account.id,
          categoryId: category.id,
          seriesId: series.id,
          seriesIndex: 2,
          amount: 1_000,
          description: 'Vencida pendente',
          type: 'EXPENSE',
          status: 'PENDING',
          year: 2028,
          month: 4,
          day: 5,
        },
        {
          userId: owner.id,
          accountId: account.id,
          categoryId: category.id,
          seriesId: series.id,
          seriesIndex: 3,
          amount: 1_000,
          description: 'Futura',
          type: 'EXPENSE',
          status: 'PENDING',
          year: 2028,
          month: 5,
          day: 10,
        },
      ],
    });

    const ended = await endRecurrenceSeriesForUser(
      owner.id,
      series.id,
      new Date('2028-04-10T12:00:00.000Z'),
    );

    expect(ended).toMatchObject({
      id: series.id,
      cancelledPendingCount: 1,
      preservedCompletedCount: 1,
    });

    const occurrences = await prisma.transaction.findMany({
      where: { seriesId: series.id },
      orderBy: { seriesIndex: 'asc' },
      select: { status: true },
    });
    expect(occurrences.map((item) => item.status)).toEqual([
      'COMPLETED',
      'PENDING',
      'CANCELLED',
    ]);

    const stored = await prisma.transactionSeries.findUniqueOrThrow({
      where: { id: series.id },
      select: { endedAt: true, sourceKey: true },
    });
    expect(stored.endedAt).not.toBeNull();
    expect(stored.sourceKey).toBeNull();

    const replay = await endRecurrenceSeriesForUser(
      owner.id,
      series.id,
      new Date('2028-04-10T12:00:00.000Z'),
    );
    expect(replay.cancelledPendingCount).toBe(0);
  });

  it('refuses to end a series when a future card occurrence belongs to a paid statement', async () => {
    const owner = await fixtures.user();
    const [cash, card, category] = await Promise.all([
      fixtures.account(owner.id),
      fixtures.account(owner.id, {
        type: 'CREDIT_CARD',
        creditLimit: 100_000,
        statementClosingDay: 5,
        statementDueDay: 12,
      }),
      fixtures.category(owner.id, { type: 'EXPENSE' }),
    ]);
    const series = await createSeries(owner.id, 'test:card-series');

    await prisma.transaction.create({
      data: {
        userId: owner.id,
        accountId: card.id,
        categoryId: category.id,
        seriesId: series.id,
        seriesIndex: 1,
        amount: 2_000,
        description: 'Compra futura',
        type: 'EXPENSE',
        status: 'PENDING',
        year: 2028,
        month: 4,
        day: 4,
      },
    });

    const paymentTransaction = await prisma.transaction.create({
      data: {
        userId: owner.id,
        accountId: cash.id,
        categoryId: null,
        amount: 2_000,
        description: 'Pagamento de fatura',
        type: 'EXPENSE',
        kind: 'CARD_PAYMENT',
        status: 'COMPLETED',
        year: 2028,
        month: 4,
        day: 1,
      },
    });

    await prisma.creditCardPayment.create({
      data: {
        amount: 2_000,
        closingYear: 2028,
        closingMonth: 4,
        closingDay: 5,
        idempotencyKeyHash: 'c'.repeat(64),
        requestHash: 'd'.repeat(64),
        userId: owner.id,
        cardAccountId: card.id,
        sourceAccountId: cash.id,
        sourceTransactionId: paymentTransaction.id,
      },
    });

    await expect(
      endRecurrenceSeriesForUser(
        owner.id,
        series.id,
        new Date('2028-04-01T12:00:00.000Z'),
      ),
    ).rejects.toMatchObject({
      status: 409,
      code: 'CREDIT_CARD_STATEMENT_PAID',
    });

    expect(
      await prisma.transactionSeries.findUniqueOrThrow({
        where: { id: series.id },
        select: { endedAt: true },
      }),
    ).toEqual({ endedAt: null });
  });

  it('recomputes stored series bounds after an occurrence is edited or removed', async () => {
    const owner = await fixtures.user();
    const [account, category] = await Promise.all([
      fixtures.account(owner.id),
      fixtures.category(owner.id),
    ]);
    const series = await createSeries(owner.id, 'test:metadata');

    const first = await fixtures.transaction({
      userId: owner.id,
      accountId: account.id,
      categoryId: category.id,
      overrides: {
        seriesId: series.id,
        seriesIndex: 1,
        status: 'PENDING',
        year: 2028,
        month: 4,
        day: 10,
      },
    });
    const second = await fixtures.transaction({
      userId: owner.id,
      accountId: account.id,
      categoryId: category.id,
      overrides: {
        seriesId: series.id,
        seriesIndex: 2,
        status: 'PENDING',
        year: 2028,
        month: 5,
        day: 10,
      },
    });

    await prisma.$transaction(async (tx) => {
      await tx.transaction.delete({ where: { id: second.id } });
      await tx.transaction.update({
        where: { id: first.id },
        data: { day: 12 },
      });
      await syncTransactionSeriesMetadata(tx, owner.id, series.id);
    });

    expect(
      await prisma.transactionSeries.findUniqueOrThrow({
        where: { id: series.id },
        select: {
          occurrenceCount: true,
          startYear: true,
          startMonth: true,
          startDay: true,
          endYear: true,
          endMonth: true,
          endDay: true,
        },
      }),
    ).toEqual({
      occurrenceCount: 1,
      startYear: 2028,
      startMonth: 4,
      startDay: 12,
      endYear: 2028,
      endMonth: 4,
      endDay: 12,
    });
  });
});
