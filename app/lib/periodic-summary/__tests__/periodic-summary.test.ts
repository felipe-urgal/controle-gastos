import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  user: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
  },
  account: {
    findMany: vi.fn(),
  },
  transaction: {
    findMany: vi.fn(),
  },
  periodicFinancialSummary: {
    findFirst: vi.fn(),
    create: vi.fn(),
    deleteMany: vi.fn(),
  },
}));

vi.mock('@/app/lib/prisma', () => ({
  prisma: {
    user: mocks.user,
    account: mocks.account,
    transaction: mocks.transaction,
    periodicFinancialSummary: mocks.periodicFinancialSummary,
  },
}));

vi.mock('@/app/lib/forecast/forecast', () => ({
  logicalDateFromUtcInstant: vi.fn((now: Date) => ({
    year: now.getUTCFullYear(),
    month: now.getUTCMonth() + 1,
    day: now.getUTCDate(),
  })),
  getForecastForUser: vi.fn(),
}));

vi.mock('@/app/lib/insights/financial-insights', () => ({
  getFinancialInsightsForUser: vi.fn(),
}));

vi.mock('@/app/lib/subscriptions/subscriptions', () => ({
  getSubscriptionsForUser: vi.fn(),
}));

import {
  getPeriodicSummaryStateForUser,
  materializeWeeklySummaryForUser,
  runPeriodicSummaryCron,
} from '@/app/lib/periodic-summary/periodic-summary';

const now = new Date('2026-10-05T06:00:00Z');
const stored = {
  id: 'summary-1',
  generatedAt: new Date('2026-10-05T06:01:00Z'),
  content: {
    frequency: 'WEEKLY',
    currency: 'BRL',
    period: {
      start: { year: 2026, month: 9, day: 28 },
      end: { year: 2026, month: 10, day: 4 },
    },
    totals: { income: 1, expense: 1, balance: 0 },
    topCategories: [],
    upcomingCommitments: {
      count: 0,
      amount: 0,
      through: { year: 2026, month: 10, day: 11 },
      items: [],
    },
    insights: [],
    safeToSpend: null,
    subscriptions: { priceChanges: [], possibleNewCount: 0 },
  },
};

describe('periodic financial summary service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.user.update.mockResolvedValue({ id: 'updated' });
  });

  it('replays the materialized summary instead of creating a duplicate', async () => {
    mocks.periodicFinancialSummary.findFirst.mockResolvedValue(stored);

    const result = await materializeWeeklySummaryForUser('user-1', 'BRL', now);

    expect(result.id).toBe('summary-1');
    expect(mocks.periodicFinancialSummary.create).not.toHaveBeenCalled();
  });

  it('respects opt-out without materializing anything', async () => {
    mocks.user.findFirst.mockResolvedValue({
      periodicSummaryEnabled: false,
      periodicSummaryFrequency: 'WEEKLY',
    });

    const result = await getPeriodicSummaryStateForUser('user-1', 'BRL', now);

    expect(result).toEqual({
      enabled: false,
      frequency: 'WEEKLY',
      summary: null,
    });
    expect(mocks.periodicFinancialSummary.findFirst).not.toHaveBeenCalled();
    expect(mocks.periodicFinancialSummary.create).not.toHaveBeenCalled();
    expect(mocks.periodicFinancialSummary.deleteMany).not.toHaveBeenCalled();
  });

  it('continues the cron batch when one user fails', async () => {
    mocks.user.findMany
      .mockResolvedValueOnce([{ id: 'user-fail' }, { id: 'user-ok' }])
      .mockResolvedValueOnce([]);

    mocks.account.findMany.mockImplementation(async ({ where }: { where: { userId: string } }) => {
      if (where.userId === 'user-fail') throw new Error('boom');
      return [{ currency: 'BRL' }];
    });
    mocks.periodicFinancialSummary.findFirst.mockResolvedValue(stored);

    const result = await runPeriodicSummaryCron(now);

    expect(result).toMatchObject({
      selectedUsers: 2,
      processedUsers: 1,
      failedUsers: 1,
      summaries: 1,
    });
    expect(mocks.user.update).toHaveBeenCalledTimes(2);
  });
});
