import { Prisma } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  user: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    count: vi.fn(),
  },
  account: { findMany: vi.fn() },
  transaction: { findMany: vi.fn() },
  periodicFinancialSummary: { findFirst: vi.fn(), create: vi.fn() },
  logEvent: vi.fn(),
}));

vi.mock('@/app/lib/prisma', () => ({
  prisma: {
    user: mocks.user,
    account: mocks.account,
    transaction: mocks.transaction,
    periodicFinancialSummary: mocks.periodicFinancialSummary,
  },
}));

vi.mock('@/app/lib/observability', () => ({ logEvent: mocks.logEvent }));

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
    // Simula JSON legado que continha dados prospectivos congelados.
    upcomingCommitments: { count: 999 },
    safeToSpend: { safeToSpend: 1000 },
    insights: [],
    subscriptions: {},
  },
};

describe('periodic financial summary service', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.user.count.mockResolvedValue(0);
    mocks.user.update.mockResolvedValue({ id: 'updated' });
    mocks.account.findMany.mockResolvedValue([{ currency: 'BRL' }]);
    mocks.periodicFinancialSummary.findFirst.mockResolvedValue(stored);
    mocks.periodicFinancialSummary.create.mockResolvedValue(stored);
    mocks.transaction.findMany.mockResolvedValue([]);
  });

  it('replays the frozen summary and strips obsolete prospective legacy fields', async () => {
    const result = await materializeWeeklySummaryForUser('user-1', 'BRL', now);
    expect(result.id).toBe('summary-1');
    expect(result.content).not.toHaveProperty('safeToSpend');
    expect(result.content).not.toHaveProperty('upcomingCommitments');
    expect(mocks.periodicFinancialSummary.create).not.toHaveBeenCalled();
  });

  it('respects opt-out without reading or writing a summary', async () => {
    mocks.user.findFirst.mockResolvedValue({
      periodicSummaryEnabled: false,
      periodicSummaryFrequency: 'WEEKLY',
    });

    expect(await getPeriodicSummaryStateForUser('user-1', 'BRL', now)).toEqual({
      enabled: false,
      frequency: 'WEEKLY',
      summary: null,
    });
    expect(mocks.periodicFinancialSummary.findFirst).not.toHaveBeenCalled();
    expect(mocks.periodicFinancialSummary.create).not.toHaveBeenCalled();
  });

  it('uses a separately instrumented lazy fallback when cron has not written a snapshot', async () => {
    mocks.user.findFirst.mockResolvedValue({
      periodicSummaryEnabled: true,
      periodicSummaryFrequency: 'WEEKLY',
    });
    mocks.periodicFinancialSummary.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
    await getPeriodicSummaryStateForUser('user-1', 'BRL', now);
    expect(mocks.periodicFinancialSummary.create).toHaveBeenCalledOnce();
    expect(mocks.logEvent).toHaveBeenCalledWith(
      'info', 'periodic_summary.on_demand',
      expect.objectContaining({ currency: 'BRL', result: 'success' }),
    );
    expect(mocks.transaction.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ kind: 'NORMAL', status: 'COMPLETED' }),
      select: expect.objectContaining({ account: { select: { type: true } } }),
    }));
  });

  it('replays after a concurrent unique constraint conflict', async () => {
    mocks.periodicFinancialSummary.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce(stored);
    mocks.periodicFinancialSummary.create.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError('duplicate', {
        code: 'P2002',
        clientVersion: '7.10.0',
      }),
    );
    const result = await materializeWeeklySummaryForUser('user-1', 'BRL', now);
    expect(result.id).toBe('summary-1');
    expect(mocks.periodicFinancialSummary.findFirst).toHaveBeenCalledTimes(2);
  });

  it('does not advance lastProcessedAt when one user fails and continues the batch', async () => {
    mocks.user.count.mockResolvedValue(14);
    mocks.user.findMany.mockResolvedValueOnce([{ id: 'user-fail' }, { id: 'user-ok' }]);
    mocks.account.findMany.mockImplementation(async ({ where }: { where: { userId: string } }) => {
      if (where.userId === 'user-fail') throw new Error('boom');
      return [{ currency: 'BRL' }];
    });

    const result = await runPeriodicSummaryCron(now);
    expect(result).toMatchObject({
      selectedUsers: 2,
      processedUsers: 1,
      failedUsers: 1,
      summaries: 1,
      backlog: 14,
    });
    expect(mocks.user.update).toHaveBeenCalledTimes(1);
    expect(mocks.user.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'user-ok' },
    }));
  });

  it('counts a partial failure across currencies as user failure and preserves the marker', async () => {
    mocks.user.count.mockResolvedValue(7);
    mocks.user.findMany.mockResolvedValueOnce([{ id: 'user-1' }]);
    mocks.account.findMany.mockResolvedValue([
      { currency: 'BRL' }, { currency: 'USD' }, { currency: 'EUR' },
    ]);
    mocks.periodicFinancialSummary.findFirst.mockImplementation(
      async ({ where }: { where: { currency: string } }) => {
        if (where.currency === 'USD') throw new Error('USD unavailable');
        return stored;
      },
    );
    const result = await runPeriodicSummaryCron(now);
    expect(result).toMatchObject({
      processedUsers: 0,
      failedUsers: 1,
      summaries: 1,
      backlogRemaining: 7,
    });
    expect(mocks.user.update).not.toHaveBeenCalled();
  });

  it('retries a failed user on the next daily cron without losing queue priority', async () => {
    mocks.user.count.mockResolvedValue(7);
    mocks.user.findMany
      .mockResolvedValueOnce([{ id: 'user-retry' }])
      .mockResolvedValueOnce([{ id: 'user-retry' }]);
    mocks.account.findMany
      .mockRejectedValueOnce(new Error('transient failure'))
      .mockResolvedValueOnce([{ currency: 'BRL' }]);

    const first = await runPeriodicSummaryCron(now);
    expect(first).toMatchObject({ processedUsers: 0, failedUsers: 1 });
    expect(mocks.user.update).not.toHaveBeenCalled();

    const retryAt = new Date('2026-10-06T06:00:00Z');
    const retry = await runPeriodicSummaryCron(retryAt);
    expect(retry).toMatchObject({ processedUsers: 1, failedUsers: 0 });
    expect(mocks.user.update).toHaveBeenCalledTimes(1);
    expect(mocks.user.update).toHaveBeenCalledWith({
      where: { id: 'user-retry' },
      data: { periodicSummaryLastProcessedAt: retryAt },
      select: { id: true },
    });
  });

  it('distinguishes a successful summary from a failed rotation marker', async () => {
    mocks.user.count.mockResolvedValue(7);
    mocks.user.findMany.mockResolvedValueOnce([{ id: 'user-1' }]);
    mocks.user.update.mockRejectedValueOnce(new Error('marker failed'));
    const result = await runPeriodicSummaryCron(now);
    expect(result).toMatchObject({
      processedUsers: 1,
      failedUsers: 0,
      markerFailures: 1,
      backlogRemaining: 7,
    });
  });

  it('can rotate 42 enabled users within seven daily executions', async () => {
    const markers = new Map(Array.from({ length: 42 }, (_, i) => [`u-${i}`, null as Date | null]));
    mocks.user.count.mockImplementation(async () =>
      [...markers.values()].filter((date) => date === null || date < new Date('2026-10-05T00:00:00Z')).length,
    );
    mocks.user.findMany.mockImplementation(async ({ where, take }: {
      where: { periodicSummaryLastProcessedAt: null | { not: null; lt: Date } };
      take: number;
    }) => {
      const never = where.periodicSummaryLastProcessedAt === null;
      return [...markers.entries()]
        .filter(([, date]) => never ? date === null : date !== null && date < new Date('2026-10-05T00:00:00Z'))
        .slice(0, take)
        .map(([id]) => ({ id }));
    });
    mocks.user.update.mockImplementation(async ({ where, data }: {
      where: { id: string };
      data: { periodicSummaryLastProcessedAt: Date };
    }) => {
      markers.set(where.id, data.periodicSummaryLastProcessedAt);
      return { id: where.id };
    });
    for (let offset = 0; offset < 7; offset += 1) {
      const current = new Date(Date.UTC(2026, 9, 5 + offset, 6));
      const result = await runPeriodicSummaryCron(current);
      expect(result.processedUsers).toBe(6);
    }
    expect([...markers.values()].filter(Boolean)).toHaveLength(42);
  });

  it('selects only active-account currencies for cron work', async () => {
    mocks.user.count.mockResolvedValue(7);
    mocks.user.findMany.mockResolvedValueOnce([{ id: 'user-1' }]);
    mocks.account.findMany.mockResolvedValue([{ currency: 'BRL' }, { currency: 'BRL' }]);
    await runPeriodicSummaryCron(now);
    expect(mocks.account.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId: 'user-1', isActive: true },
    }));
    expect(mocks.periodicFinancialSummary.findFirst).toHaveBeenCalledTimes(1);
  });
});
