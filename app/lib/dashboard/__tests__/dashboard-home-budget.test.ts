import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  monthly: vi.fn(),
  forecast: vi.fn(),
  commitments: vi.fn(),
  insights: vi.fn(),
  netWorth: vi.fn(),
  recentTransactions: vi.fn(),
}));

vi.mock('@/app/lib/dashboard/monthly-dashboard', () => ({
  getMonthlyDashboardForUser: mocks.monthly,
}));

vi.mock('@/app/lib/forecast/forecast', () => ({
  getForecastForUser: mocks.forecast,
}));

vi.mock('@/app/lib/commitments/financial-commitments', () => ({
  getFinancialCommitmentsFromForecastForUser: mocks.commitments,
}));

vi.mock('@/app/lib/insights/financial-insights', () => ({
  getFinancialInsightsFromContext: mocks.insights,
}));

vi.mock('@/app/lib/net-worth/net-worth', () => ({
  getNetWorthForUser: mocks.netWorth,
}));

vi.mock('@/app/lib/prisma', () => ({
  prisma: {
    transaction: {
      findMany: mocks.recentTransactions,
    },
  },
}));

import { getDashboardHomeForUser } from '@/app/lib/dashboard/dashboard-home';

const SOURCE_READ_BUDGET = 6;

function monthlyFixture() {
  return {
    period: { year: 2026, month: 10 },
    currency: 'BRL',
    summary: { income: 100_000, expense: 40_000, balance: 60_000 },
    comparison: {
      previousPeriod: { year: 2026, month: 9 },
      income: { difference: 0, percentage: 0 },
      expense: { difference: 0, percentage: 0 },
      balance: { difference: 0, percentage: 0 },
    },
    accounts: [
      {
        id: 'cash-1',
        name: 'Conta',
        type: 'CREDIT_DEBIT',
        currency: 'BRL',
        isActive: true,
        color: '#000000',
        icon: 'wallet',
        balance: 60_000,
      },
    ],
    cards: [],
    goals: [],
    categories: [],
    flow: [],
    limits: [],
    planning: {
      budget: 0,
      realized: 40_000,
      committed: 0,
      available: -40_000,
      overBudgetCategories: 0,
      realizedIncome: 100_000,
      expectedIncome: 0,
      totalIncome: 100_000,
    },
  };
}

function forecastFixture() {
  return {
    currency: 'BRL',
    asOf: { year: 2026, month: 10, day: 6 },
    horizonDays: 30,
    horizonEnd: { year: 2026, month: 11, day: 5 },
    accounts: [],
    overdue: [],
    upcoming: [],
    cardCommitments: { overdue: [], upcoming: [] },
    safeToSpend: {
      realizedBalance: 60_000,
      pendingExpenses: 0,
      cardCommitments: 0,
      transferNet: 0,
      safeToSpend: 60_000,
      accounts: [],
    },
  };
}

describe('dashboard home read budget', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.monthly.mockResolvedValue(monthlyFixture());
    mocks.forecast.mockResolvedValue(forecastFixture());
    mocks.recentTransactions.mockResolvedValue([]);
    mocks.netWorth.mockResolvedValue({
      byCurrency: [
        {
          currency: 'BRL',
          total: 60_000,
          accounts: [],
        },
      ],
    });
    mocks.commitments.mockResolvedValue({
      asOf: { year: 2026, month: 10, day: 6 },
      through: { year: 2026, month: 11, day: 5 },
      currency: 'BRL',
      days: 30,
      items: [],
      totals: {
        payable: { count: 0, amount: 0 },
        receivable: { count: 0, amount: 0 },
        milestoneCount: 0,
        overdueCount: 0,
      },
    });
    mocks.insights.mockResolvedValue({
      period: { year: 2026, month: 10 },
      currency: 'BRL',
      items: [],
      limit: 10,
    });
  });

  it('does not duplicate primary reads while composing the dashboard home', async () => {
    await getDashboardHomeForUser(
      'user-1',
      { year: 2026, month: 10 },
      'BRL',
      new Date('2026-10-06T12:00:00.000Z'),
    );

    expect(mocks.monthly).toHaveBeenCalledTimes(1);
    expect(mocks.forecast).toHaveBeenCalledTimes(1);
    expect(mocks.recentTransactions).toHaveBeenCalledTimes(1);
    expect(mocks.netWorth).toHaveBeenCalledTimes(1);
    expect(mocks.commitments).toHaveBeenCalledTimes(1);
    expect(mocks.insights).toHaveBeenCalledTimes(1);

    const sourceReads = [
      mocks.monthly,
      mocks.forecast,
      mocks.recentTransactions,
      mocks.netWorth,
      mocks.commitments,
      mocks.insights,
    ].reduce((total, mock) => total + mock.mock.calls.length, 0);

    expect(sourceReads).toBeLessThanOrEqual(SOURCE_READ_BUDGET);
  });
});
