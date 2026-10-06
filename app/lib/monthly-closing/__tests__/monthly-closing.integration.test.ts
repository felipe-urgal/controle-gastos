import { randomUUID } from 'node:crypto';
import { afterAll, afterEach, describe, expect, it } from 'vitest';

import { getMonthlyClosingForUser } from '@/app/lib/monthly-closing/monthly-closing';
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

async function createUsers() {
  const suffix = randomUUID();
  const [owner, other] = await Promise.all([
    prisma.user.create({
      data: {
        name: 'Monthly Closing Owner',
        email: 'monthly-closing-owner-' + suffix + '@example.com',
        password: 'test-hash',
      },
    }),
    prisma.user.create({
      data: {
        name: 'Monthly Closing Other',
        email: 'monthly-closing-other-' + suffix + '@example.com',
        password: 'test-hash',
      },
    }),
  ]);
  createdUserIds.push(owner.id, other.id);
  return { owner, other };
}

describe('monthly closing integration', () => {
  it('does not calculate a retrospective for a future period', async () => {
    const data = await getMonthlyClosingForUser(
      'unused-user-id',
      { year: 2026, month: 11 },
      'BRL',
      new Date('2026-10-06T12:00:00Z'),
    );

    expect(data).toEqual({
      period: { year: 2026, month: 11 },
      currency: 'BRL',
      asOf: { year: 2026, month: 10, day: 6 },
      status: 'FUTURE',
      retrospective: null,
    });
  });

  it('builds readiness from owned pending items, reconciliation and card statements', async () => {
    const { owner, other } = await createUsers();

    const [
      reconciledAccount,
      unreconciledAccount,
      usdAccount,
      card,
      foreignAccount,
    ] = await Promise.all([
      prisma.account.create({
        data: {
          name: 'Conta reconciliada',
          type: 'CREDIT_DEBIT',
          currency: 'BRL',
          userId: owner.id,
        },
      }),
      prisma.account.create({
        data: {
          name: 'Conta pendente de reconciliação',
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
      prisma.account.create({
        data: {
          name: 'Cartão BRL',
          type: 'CREDIT_CARD',
          currency: 'BRL',
          creditLimit: 100_000,
          statementClosingDay: 5,
          statementDueDay: 12,
          userId: owner.id,
        },
      }),
      prisma.account.create({
        data: {
          name: 'Conta outro usuário',
          type: 'CREDIT_DEBIT',
          currency: 'BRL',
          userId: other.id,
        },
      }),
    ]);

    const reconciledAt = new Date('2026-09-30T18:00:00Z');

    await prisma.transaction.createMany({
      data: [
        {
          amount: 100_000,
          year: 2026,
          month: 9,
          day: 2,
          type: 'INCOME',
          kind: 'NORMAL',
          description: 'Receita sem categoria',
          status: 'COMPLETED',
          reconciliationStatus: 'RECONCILED',
          reconciledAt,
          accountId: reconciledAccount.id,
          userId: owner.id,
        },
        {
          amount: 10_000,
          year: 2026,
          month: 9,
          day: 3,
          type: 'EXPENSE',
          kind: 'NORMAL',
          description: 'Despesa concluída',
          status: 'COMPLETED',
          accountId: unreconciledAccount.id,
          userId: owner.id,
        },
        {
          amount: 7_500,
          year: 2026,
          month: 9,
          day: 20,
          type: 'EXPENSE',
          kind: 'NORMAL',
          description: 'Despesa pendente BRL',
          status: 'PENDING',
          accountId: reconciledAccount.id,
          userId: owner.id,
        },
        {
          amount: 99_000,
          year: 2026,
          month: 9,
          day: 20,
          type: 'EXPENSE',
          kind: 'NORMAL',
          description: 'Pendente em outra moeda',
          status: 'PENDING',
          accountId: usdAccount.id,
          userId: owner.id,
        },
        {
          amount: 12_000,
          year: 2026,
          month: 9,
          day: 1,
          type: 'EXPENSE',
          kind: 'NORMAL',
          description: 'Compra no cartão',
          status: 'COMPLETED',
          accountId: card.id,
          userId: owner.id,
        },
        {
          amount: 999_999,
          year: 2026,
          month: 9,
          day: 2,
          type: 'INCOME',
          kind: 'NORMAL',
          description: 'Outro usuário',
          status: 'COMPLETED',
          accountId: foreignAccount.id,
          userId: other.id,
        },
      ],
    });

    await prisma.accountReconciliationEvent.create({
      data: {
        action: 'CONFIRMED',
        batchReconciledAt: reconciledAt,
        transactionCount: 1,
        cutoffYear: 2026,
        cutoffMonth: 9,
        cutoffDay: 30,
        statementBalance: 100_000,
        userId: owner.id,
        accountId: reconciledAccount.id,
      },
    });

    const data = await getMonthlyClosingForUser(
      owner.id,
      { year: 2026, month: 9 },
      'BRL',
      new Date('2026-10-06T12:00:00Z'),
    );

    expect(data.status).toBe('REVIEWABLE');
    expect(data.retrospective).not.toBeNull();
    if (!data.retrospective) throw new Error('retrospective expected');

    expect(data.retrospective.summary).toEqual({
      income: 100_000,
      expense: 22_000,
      balance: 78_000,
    });

    expect(data.retrospective.readiness.pendingTransactions).toMatchObject({
      checked: true,
      totalCount: 1,
      income: { count: 0, amount: 0 },
      expense: { count: 1, amount: 7_500 },
    });

    expect(data.retrospective.readiness.reconciliation).toMatchObject({
      checked: true,
      accountCount: 2,
      reconciledCount: 1,
      issueCount: 1,
    });
    expect(
      data.retrospective.readiness.reconciliation.accounts,
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          accountId: reconciledAccount.id,
          status: 'RECONCILED',
          latestCutoff: { year: 2026, month: 9, day: 30 },
        }),
        expect.objectContaining({
          accountId: unreconciledAccount.id,
          status: 'NEVER_RECONCILED',
          unreconciledCount: 1,
        }),
      ]),
    );

    expect(data.retrospective.readiness.cardStatements).toMatchObject({
      checked: true,
      count: 1,
      paidCount: 0,
      openCount: 0,
      overdueCount: 1,
    });
    expect(data.retrospective.readiness.cardStatements.items[0]).toMatchObject({
      cardId: card.id,
      amount: 12_000,
      state: 'OVERDUE',
      closingDate: { year: 2026, month: 9, day: 5 },
      dueDate: { year: 2026, month: 9, day: 12 },
    });

    expect(data.retrospective.readiness.status).toBe('HAS_PENDING_ITEMS');
  });
});
