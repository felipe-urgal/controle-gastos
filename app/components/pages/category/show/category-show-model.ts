import type { CategoryActivity } from '@/app/types/category';

export type LimitState = 'NO_LIMIT' | 'OK' | 'NEAR' | 'OVER';

const monthNames = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const longMonthNames = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

export function shortMonthLabel(month: number) {
  return monthNames[month - 1];
}

export function longMonthLabel(month: number) {
  return longMonthNames[month - 1];
}

/** Estado do mês contra o limite: perto a partir de 90% (realizado mais comprometido). */
export function limitState(month: Pick<CategoryActivity['month'], 'realized' | 'committed' | 'limit'>): LimitState {
  if (month.limit === null) return 'NO_LIMIT';
  const consumed = month.realized + month.committed;
  if (consumed > month.limit) return 'OVER';
  return month.limit > 0 && consumed >= month.limit * 0.9 ? 'NEAR' : 'OK';
}

/** Percentual do limite consumido (realizado mais comprometido); null sem limite. */
export function limitPercent(month: Pick<CategoryActivity['month'], 'realized' | 'committed' | 'limit'>) {
  if (month.limit === null) return null;
  if (month.limit === 0) return month.realized + month.committed > 0 ? 100 : 0;
  return Math.round(((month.realized + month.committed) / month.limit) * 100);
}

export function daysInMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export type HistoryBar = { key: string; label: string; realized: number; heightPercent: number; current: boolean };

/** Altura de cada barra em relação ao maior valor entre os meses e o limite (mínimo 4% para meses com gasto). */
export function buildHistoryBars(history: CategoryActivity['history'], limit: number | null) {
  const max = Math.max(...history.map((point) => point.realized), limit ?? 0, 1);
  const bars: HistoryBar[] = history.map((point, index) => ({
    key: `${point.year}-${point.month}`,
    label: shortMonthLabel(point.month),
    realized: point.realized,
    heightPercent: point.realized === 0 ? 0 : Math.max(4, Math.round((point.realized / max) * 100)),
    current: index === history.length - 1,
  }));
  const limitPercentOfScale = limit === null ? null : Math.round((limit / max) * 100);
  return { bars, limitPercentOfScale };
}

/** Frases sobre o mês: o limite e a comparação com a média dos meses anteriores. */
export function describeMonth(args: {
  month: CategoryActivity['month'];
  previousAverage: number;
  today: { year: number; month: number; day: number };
  type: 'INCOME' | 'EXPENSE';
  /** Formata centavos na moeda da categoria (e respeita ocultar valores). */
  money: (cents: number) => string;
}) {
  const { month, previousAverage, today, type, money } = args;
  const sameMonth = today.year === month.year && today.month === month.month;
  const remainingDays = sameMonth ? daysInMonth(month.year, month.month) - today.day : 0;
  const state = limitState(month);
  const consumed = month.realized + month.committed;
  const parts: string[] = [];

  if (type === 'EXPENSE') {
    if (state === 'OVER' && month.limit !== null) {
      parts.push(`Passou ${money(consumed - month.limit)} do limite`);
    } else if (month.limit !== null) {
      parts.push(`Faltam ${money(month.limit - consumed)} para o limite`);
    }
    if (remainingDays > 0) parts.push(`${remainingDays} ${remainingDays === 1 ? 'dia' : 'dias'} pela frente`);
  }

  if (previousAverage > 0 && month.realized > 0) {
    const diff = Math.round(((month.realized - previousAverage) / previousAverage) * 100);
    if (Math.abs(diff) >= 10) parts.push(`${Math.abs(diff)}% ${diff > 0 ? 'acima' : 'abaixo'} da média dos meses anteriores`);
  }

  return parts;
}
