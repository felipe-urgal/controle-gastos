import { afterAll, afterEach, describe, expect, it } from 'vitest';

import {
  getPeriodicSummaryStateForUser,
  materializeWeeklySummaryForUser,
  runPeriodicSummaryCron,
} from '@/app/lib/periodic-summary/periodic-summary';
import { prisma } from '@/app/lib/prisma';
import { FinancialTestFactory } from '@/tests/support/financial-test-factory';

const fixtures = new FinancialTestFactory();
const now = new Date('2026-10-05T06:00:00Z');

afterEach(async () => {
  await fixtures.cleanup();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('periodic summary persistence integration', () => {
  it('enables, materializes, replays, keeps currencies separate and hides on opt-out', async () => {
    const owner = await fixtures.user({ periodicSummaryEnabled: true });
    const [cash, card, usd, inactiveEur, category] = await Promise.all([
      fixtures.account(owner.id, { currency: 'BRL' }),
      fixtures.account(owner.id, {
        type: 'CREDIT_CARD',
        currency: 'BRL',
        creditLimit: 100_000,
        statementClosingDay: 5,
        statementDueDay: 12,
      }),
      fixtures.account(owner.id, { currency: 'USD' }),
      fixtures.account(owner.id, { currency: 'EUR', isActive: false }),
      fixtures.category(owner.id, { type: 'EXPENSE' }),
    ]);

    const t = (accountId: string, amount: number, type: 'INCOME' | 'EXPENSE' = 'EXPENSE') =>
      fixtures.transaction({
        userId: owner.id,
        accountId,
        categoryId: type === 'EXPENSE' ? category.id : undefined,
        overrides: { year: 2026, month: 9, day: 30, amount, type },
      });

    await Promise.all([
      t(cash.id, 100_000, 'INCOME'),
      t(cash.id, 5_000),
      t(card.id, 20_000),
      t(card.id, 7_000, 'INCOME'),
      t(usd.id, 9_000),
      t(inactiveEur.id, 2_000),
    ]);

    const cron = await runPeriodicSummaryCron(now);
    expect(cron.processedUsers).toBeGreaterThanOrEqual(1);

    const state = await getPeriodicSummaryStateForUser(owner.id, 'BRL', now);
    expect(state.enabled).toBe(true);
    expect(state.summary?.content.totals).toEqual({
      income: 100_000,
      expense: 18_000,
      balance: 82_000,
    });
    expect(state.summary?.content).not.toHaveProperty('upcomingCommitments');

    const usdState = await getPeriodicSummaryStateForUser(owner.id, 'USD', now);
    expect(usdState.summary?.content.totals).toEqual({
      income: 0, expense: 9_000, balance: -9_000,
    });
    const eurSummary = await prisma.periodicFinancialSummary.findFirst({
      where: { userId: owner.id, currency: 'EUR' },
    });
    expect(eurSummary).toBeNull();

    // A política é snapshot congelado: correções posteriores não alteram passado.
    await prisma.transaction.updateMany({
      where: { userId: owner.id, accountId: cash.id, type: 'EXPENSE' },
      data: { amount: 15_000 },
    });
    const replay = await materializeWeeklySummaryForUser(owner.id, 'BRL', now);
    expect(replay.content.totals.expense).toBe(18_000);
    expect(await prisma.periodicFinancialSummary.count({
      where: { userId: owner.id, currency: 'BRL' },
    })).toBe(1);

    await prisma.user.update({
      where: { id: owner.id },
      data: { periodicSummaryEnabled: false },
    });
    expect(await getPeriodicSummaryStateForUser(owner.id, 'BRL', now)).toMatchObject({
      enabled: false, summary: null,
    });
    expect(await prisma.periodicFinancialSummary.count({
      where: { userId: owner.id },
    })).toBe(2);
  });

  it('handles concurrent first materializations with a single row', async () => {
    const owner = await fixtures.user({ periodicSummaryEnabled: true });
    await fixtures.account(owner.id);
    const [first, second] = await Promise.all([
      materializeWeeklySummaryForUser(owner.id, 'BRL', now),
      materializeWeeklySummaryForUser(owner.id, 'BRL', now),
    ]);
    expect(first.id).toBe(second.id);
    expect(await prisma.periodicFinancialSummary.count({
      where: { userId: owner.id, currency: 'BRL' },
    })).toBe(1);
  });
});
