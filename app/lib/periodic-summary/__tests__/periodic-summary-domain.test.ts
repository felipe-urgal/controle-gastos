import { describe, expect, it } from 'vitest';

import {
  buildWeeklyFinancialSummary,
  getCompletedWeeklySummaryPeriod,
  weeklyPeriodDates,
  type PeriodicSummaryTransaction,
} from '@/app/lib/periodic-summary/periodic-summary-domain';
import { realizedCashFlow } from '@/app/lib/dashboard/realized-cash-flow';

const period = {
  start: { year: 2026, month: 9, day: 28 },
  end: { year: 2026, month: 10, day: 4 },
};

const account = (type: PeriodicSummaryTransaction['account']['type']) => ({ type });
const transaction = (
  amount: number,
  type: 'INCOME' | 'EXPENSE',
  accountType: PeriodicSummaryTransaction['account']['type'],
  category: PeriodicSummaryTransaction['category'] = null,
): PeriodicSummaryTransaction => ({
  amount,
  type,
  account: account(accountType),
  category,
  allocations: [],
});

describe('periodic summary domain', () => {
  it('uses the previous completed Monday-Sunday week in UTC logical dates', () => {
    expect(getCompletedWeeklySummaryPeriod(new Date('2026-10-01T23:59:59Z'))).toEqual({
      start: { year: 2026, month: 9, day: 21 },
      end: { year: 2026, month: 9, day: 27 },
    });
    expect(getCompletedWeeklySummaryPeriod(new Date('2026-10-05T00:30:00Z'))).toEqual(period);
  });

  it('enumerates exactly seven logical dates across a month boundary', () => {
    const dates = weeklyPeriodDates(period);
    expect(dates).toHaveLength(7);
    expect(dates[0]).toEqual(period.start);
    expect(dates[6]).toEqual(period.end);
  });

  it('uses the canonical realized flow for cash, card purchase and card refund', () => {
    const food = { id: 'food', name: 'Alimentação' };
    const summary = buildWeeklyFinancialSummary({
      period,
      currency: 'BRL',
      transactions: [
        transaction(100_000, 'INCOME', 'CREDIT_DEBIT'),
        transaction(20_000, 'EXPENSE', 'CREDIT_DEBIT', food),
        transaction(30_000, 'EXPENSE', 'CREDIT_CARD', food),
        transaction(7_000, 'INCOME', 'CREDIT_CARD', food),
        {
          ...transaction(5_000, 'EXPENSE', 'CREDIT_DEBIT'),
          allocations: [
            { amount: 4_000, category: { id: 'home', name: 'Casa' } },
            { amount: 1_000, category: { id: 'health', name: 'Saúde' } },
          ],
        },
        transaction(1_000, 'EXPENSE', 'CREDIT_DEBIT'),
      ],
    });

    expect(summary.totals).toEqual({ income: 100_000, expense: 49_000, balance: 51_000 });
    expect(summary.topCategories).toEqual([
      { categoryId: 'food', categoryName: 'Alimentação', amount: 43_000 },
      { categoryId: 'home', categoryName: 'Casa', amount: 4_000 },
      { categoryId: 'health', categoryName: 'Saúde', amount: 1_000 },
      { categoryId: '__uncategorized__', categoryName: 'Sem categoria', amount: 1_000 },
    ]);
    expect(Object.keys(summary).sort()).toEqual(
      ['frequency', 'currency', 'period', 'totals', 'topCategories'].sort(),
    );
    expect(realizedCashFlow({ amount: 7_000, type: 'INCOME', accountType: 'CREDIT_CARD' }))
      .toEqual({ income: 0, expense: -7_000 });
  });

  it('never mutates the input transactions', () => {
    const input = [transaction(2_000, 'EXPENSE', 'CREDIT_CARD')];
    buildWeeklyFinancialSummary({ period, currency: 'USD', transactions: input });
    expect(input[0]?.amount).toBe(2_000);
  });
});
