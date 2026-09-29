import type { NetWorthHistoryPoint } from '@/app/types/net-worth';
import type { SupportedCurrency } from '@/app/types/financial-summary';

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
