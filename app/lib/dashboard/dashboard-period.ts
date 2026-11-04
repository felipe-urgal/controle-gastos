import { lastDayOfMonth, type LogicalDate } from '@/app/lib/date/logical-date';
import type { DashboardPeriod, DashboardPeriodRelation } from '@/app/types/dashboard';

export function dashboardPeriodRelation(
  selected: DashboardPeriod,
  current: DashboardPeriod,
): DashboardPeriodRelation {
  const selectedKey = selected.year * 12 + selected.month;
  const currentKey = current.year * 12 + current.month;
  if (selectedKey < currentKey) return 'PAST';
  if (selectedKey > currentKey) return 'FUTURE';
  return 'CURRENT';
}

/**
 * Data de referência do mês escolhido: mês passado é visto como estava no último dia dele
 * (saldos, faturas, metas); mês atual e futuro usam hoje, já que só o realizado existe.
 */
export function dashboardReferenceDate(
  period: DashboardPeriod,
  asOf: LogicalDate,
): LogicalDate {
  return dashboardPeriodRelation(period, { year: asOf.year, month: asOf.month }) === 'PAST'
    ? lastDayOfMonth({ year: period.year, month: period.month, day: 1 })
    : asOf;
}
