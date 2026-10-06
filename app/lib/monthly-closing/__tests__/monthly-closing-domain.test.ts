import { describe, expect, it } from 'vitest';

import {
  deriveMonthlyClosingPeriodStatus,
  deriveMonthlyClosingReadinessStatus,
  deriveMonthlyClosingReconciliationStatus,
  deriveMonthlyNetWorthChange,
} from '@/app/lib/monthly-closing/monthly-closing-domain';

describe('monthly closing domain', () => {
  it('calculates the change only when both monthly points exist', () => {
    expect(deriveMonthlyNetWorthChange([
      { year: 2028, month: 3, totals: { BRL: 100_000 } },
      { year: 2028, month: 4, totals: { BRL: 125_000 } },
    ], 'BRL')).toEqual({ previous: 100_000, current: 125_000, difference: 25_000 });

    expect(deriveMonthlyNetWorthChange([
      { year: 2028, month: 3, totals: { USD: 100_000 } },
      { year: 2028, month: 4, totals: { USD: 125_000 } },
    ], 'BRL')).toBeNull();
  });

  it('does not invent a previous point when history is insufficient', () => {
    expect(deriveMonthlyNetWorthChange([
      { year: 2028, month: 4, totals: { BRL: 125_000 } },
    ], 'BRL')).toBeNull();
  });

  it('distinguishes current, past and future periods using the logical date', () => {
    const asOf = { year: 2026, month: 1, day: 1 };

    expect(
      deriveMonthlyClosingPeriodStatus({ year: 2025, month: 12 }, asOf),
    ).toBe('REVIEWABLE');
    expect(
      deriveMonthlyClosingPeriodStatus({ year: 2026, month: 1 }, asOf),
    ).toBe('IN_PROGRESS');
    expect(
      deriveMonthlyClosingPeriodStatus({ year: 2026, month: 2 }, asOf),
    ).toBe('FUTURE');
  });

  it('marks readiness only when every known check has no pending item', () => {
    expect(deriveMonthlyClosingReadinessStatus({
      pendingTransactionCount: 0,
      reconciliationIssueCount: 0,
      openCardStatementCount: 0,
      overdueCardStatementCount: 0,
    })).toBe('READY');

    expect(deriveMonthlyClosingReadinessStatus({
      pendingTransactionCount: 1,
      reconciliationIssueCount: 0,
      openCardStatementCount: 0,
      overdueCardStatementCount: 0,
    })).toBe('HAS_PENDING_ITEMS');

    expect(deriveMonthlyClosingReadinessStatus({
      pendingTransactionCount: 0,
      reconciliationIssueCount: 1,
      openCardStatementCount: 0,
      overdueCardStatementCount: 0,
    })).toBe('HAS_PENDING_ITEMS');

    expect(deriveMonthlyClosingReadinessStatus({
      pendingTransactionCount: 0,
      reconciliationIssueCount: 0,
      openCardStatementCount: 1,
      overdueCardStatementCount: 0,
    })).toBe('HAS_PENDING_ITEMS');
  });

  it('classifies reconciliation coverage without inventing a closed month', () => {
    const periodEnd = { year: 2026, month: 9, day: 30 };

    expect(deriveMonthlyClosingReconciliationStatus({
      hasReconciliation: false,
      latestCutoff: null,
      periodEnd,
      unreconciledCount: 0,
    })).toBe('NEVER_RECONCILED');

    expect(deriveMonthlyClosingReconciliationStatus({
      hasReconciliation: true,
      latestCutoff: { year: 2026, month: 9, day: 15 },
      periodEnd,
      unreconciledCount: 0,
    })).toBe('PARTIAL');

    expect(deriveMonthlyClosingReconciliationStatus({
      hasReconciliation: true,
      latestCutoff: { year: 2026, month: 9, day: 30 },
      periodEnd,
      unreconciledCount: 1,
    })).toBe('UNRECONCILED_ITEMS');

    expect(deriveMonthlyClosingReconciliationStatus({
      hasReconciliation: true,
      latestCutoff: { year: 2026, month: 10, day: 1 },
      periodEnd,
      unreconciledCount: 0,
    })).toBe('RECONCILED');
  });
});
