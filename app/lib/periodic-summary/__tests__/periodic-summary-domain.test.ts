import { describe, expect, it } from 'vitest';

import {
  buildWeeklyFinancialSummary,
  getCompletedWeeklySummaryPeriod,
  weeklyPeriodDates,
} from '@/app/lib/periodic-summary/periodic-summary-domain';

describe('periodic summary domain', () => {
  it('uses the previous completed Monday-Sunday week in UTC logical dates', () => {
    expect(getCompletedWeeklySummaryPeriod(new Date('2026-10-01T23:59:59Z'))).toEqual({
      start: { year: 2026, month: 9, day: 21 },
      end: { year: 2026, month: 9, day: 27 },
    });

    expect(getCompletedWeeklySummaryPeriod(new Date('2026-10-05T00:30:00Z'))).toEqual({
      start: { year: 2026, month: 9, day: 28 },
      end: { year: 2026, month: 10, day: 4 },
    });
  });

  it('enumerates exactly the seven logical dates even across month boundaries', () => {
    const dates = weeklyPeriodDates({
      start: { year: 2026, month: 9, day: 28 },
      end: { year: 2026, month: 10, day: 4 },
    });

    expect(dates).toHaveLength(7);
    expect(dates[0]).toEqual({ year: 2026, month: 9, day: 28 });
    expect(dates[6]).toEqual({ year: 2026, month: 10, day: 4 });
  });

  it('builds deterministic totals, split categories and upcoming commitments', () => {
    const summary = buildWeeklyFinancialSummary({
      period: {
        start: { year: 2026, month: 9, day: 28 },
        end: { year: 2026, month: 10, day: 4 },
      },
      currency: 'BRL',
      transactions: [
        {
          amount: 100_000,
          type: 'INCOME',
          category: { id: 'salary', name: 'Salário' },
          allocations: [],
        },
        {
          amount: 30_000,
          type: 'EXPENSE',
          category: { id: 'food', name: 'Alimentação' },
          allocations: [],
        },
        {
          amount: 20_000,
          type: 'EXPENSE',
          category: null,
          allocations: [
            { amount: 15_000, category: { id: 'home', name: 'Casa' } },
            { amount: 5_000, category: { id: 'health', name: 'Saúde' } },
          ],
        },
      ],
      forecast: {
        currency: 'BRL',
        asOf: { year: 2026, month: 10, day: 5 },
        horizonDays: 30,
        horizonEnd: { year: 2026, month: 11, day: 3 },
        accounts: [],
        overdue: [],
        upcoming: [
          {
            id: 'pending',
            accountId: 'account',
            amount: 8_000,
            type: 'EXPENSE',
            kind: 'NORMAL',
            status: 'PENDING',
            description: 'Internet',
            year: 2026,
            month: 10,
            day: 8,
          },
          {
            id: 'later',
            accountId: 'account',
            amount: 9_000,
            type: 'EXPENSE',
            kind: 'NORMAL',
            status: 'PENDING',
            description: 'Depois',
            year: 2026,
            month: 10,
            day: 20,
          },
        ],
        cardCommitments: {
          overdue: [],
          upcoming: [
            {
              cardId: 'card',
              cardName: 'Cartão',
              amount: 12_000,
              closingDate: { year: 2026, month: 10, day: 2 },
              dueDate: { year: 2026, month: 10, day: 10 },
              transactionCount: 2,
            },
          ],
        },
        safeToSpend: {
          realizedBalance: 80_000,
          pendingExpenses: 8_000,
          cardCommitments: 12_000,
          transferNet: 0,
          safeToSpend: 60_000,
          accounts: [],
        },
      },
      insights: {
        period: { year: 2026, month: 10 },
        currency: 'BRL',
        items: [],
        limit: 5,
      },
      subscriptions: {
        confirmed: [],
        possible: [],
        priceChanges: [],
        totals: [],
        windowMonths: 6,
      },
    });

    expect(summary.totals).toEqual({
      income: 100_000,
      expense: 50_000,
      balance: 50_000,
    });
    expect(summary.topCategories).toEqual([
      { categoryId: 'food', categoryName: 'Alimentação', amount: 30_000 },
      { categoryId: 'home', categoryName: 'Casa', amount: 15_000 },
      { categoryId: 'health', categoryName: 'Saúde', amount: 5_000 },
    ]);
    expect(summary.upcomingCommitments).toMatchObject({
      count: 2,
      amount: 20_000,
      through: { year: 2026, month: 10, day: 11 },
    });
    expect(summary.safeToSpend?.safeToSpend).toBe(60_000);
  });
});
