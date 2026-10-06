import {
  compareLogicalDates,
  type LogicalDate,
} from '@/app/lib/date/logical-date';
import type { NetWorthHistoryPoint } from '@/app/types/net-worth';
import type { SupportedCurrency } from '@/app/types/financial-summary';
import type {
  MonthlyClosingPeriodStatus,
  MonthlyClosingReadinessStatus,
  MonthlyClosingReconciliationStatus,
} from '@/app/types/monthly-closing';

export function deriveMonthlyNetWorthChange(
  history: NetWorthHistoryPoint[],
  currency: SupportedCurrency,
) {
  if (history.length < 2) return null;
  const previous = history.at(-2)?.totals[currency];
  const current = history.at(-1)?.totals[currency];
  if (previous === undefined || current === undefined) return null;
  return { previous, current, difference: current - previous };
}

function periodNumber(period: { year: number; month: number }) {
  return period.year * 12 + period.month;
}

export function deriveMonthlyClosingPeriodStatus(
  period: { year: number; month: number },
  asOf: Pick<LogicalDate, 'year' | 'month'>,
): MonthlyClosingPeriodStatus {
  const selected = periodNumber(period);
  const current = periodNumber(asOf);

  if (selected > current) return 'FUTURE';
  if (selected === current) return 'IN_PROGRESS';
  return 'REVIEWABLE';
}

export function deriveMonthlyClosingReadinessStatus(input: {
  pendingTransactionCount: number;
  reconciliationIssueCount: number;
  openCardStatementCount: number;
  overdueCardStatementCount: number;
}): MonthlyClosingReadinessStatus {
  return input.pendingTransactionCount > 0 ||
    input.reconciliationIssueCount > 0 ||
    input.openCardStatementCount > 0 ||
    input.overdueCardStatementCount > 0
    ? 'HAS_PENDING_ITEMS'
    : 'READY';
}

export function deriveMonthlyClosingReconciliationStatus(input: {
  hasReconciliation: boolean;
  latestCutoff: LogicalDate | null;
  periodEnd: LogicalDate;
  unreconciledCount: number;
}): MonthlyClosingReconciliationStatus {
  if (!input.hasReconciliation) return 'NEVER_RECONCILED';
  if (!input.latestCutoff) return 'PARTIAL';

  if (compareLogicalDates(input.latestCutoff, input.periodEnd) < 0) {
    return 'PARTIAL';
  }

  if (input.unreconciledCount > 0) {
    return 'UNRECONCILED_ITEMS';
  }

  return 'RECONCILED';
}
