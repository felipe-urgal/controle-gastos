import type { TagDTO, TagReportHistory } from '@/app/types/tag';

export type TagStatusFilter = 'all' | 'active' | 'archived';

export function statusFilterParam(filter: TagStatusFilter) {
  if (filter === 'all') return undefined;
  return filter === 'active' ? 'true' : 'false';
}

/** Texto do gasto do mês na linha da tag: moedas diferentes não são somadas. */
export function monthExpenseLabel(
  entries: TagDTO['monthExpenses'],
  format: (cents: number, currency: string) => string,
) {
  if (!entries || entries.length === 0) return null;
  if (entries.length === 1) return format(entries[0].expense, entries[0].currency);
  return `${entries.length} moedas`;
}

const monthNames = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

export type TagHistoryBar = { key: string; label: string; expense: number; heightPercent: number; current: boolean };

/** Altura das barras pela maior despesa da janela (mínimo de 4% para meses com gasto). */
export function buildTagHistoryBars(points: TagReportHistory['points']): TagHistoryBar[] {
  const max = Math.max(...points.map((point) => point.expense), 1);
  return points.map((point, index) => ({
    key: `${point.year}-${point.month}`,
    label: monthNames[point.month - 1],
    expense: point.expense,
    heightPercent: point.expense <= 0 ? 0 : Math.max(4, Math.round((point.expense / max) * 100)),
    current: index === points.length - 1,
  }));
}

export function hasHistory(points: TagReportHistory['points']) {
  return points.some((point) => point.expense > 0);
}

export const reportPeriodOptions = [
  { value: 'month', label: 'Mês' },
  { value: 'year', label: 'Ano' },
  { value: 'all', label: 'Tudo' },
] as const;
