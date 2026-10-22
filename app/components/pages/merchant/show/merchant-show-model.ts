import type { MerchantActivity } from '@/app/types/merchant';

const shortNames = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const longNames = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

export const shortMonthLabel = (month: number) => shortNames[month - 1];
export const longMonthLabel = (month: number) => longNames[month - 1];

export type HistoryBar = { key: string; label: string; expense: number; heightPercent: number; current: boolean };

/** Altura das barras pela maior despesa da janela (mínimo de 4% para meses com gasto). */
export function buildHistoryBars(history: MerchantActivity['history']): HistoryBar[] {
  const max = Math.max(...history.map((point) => point.expense), 1);
  return history.map((point, index) => ({
    key: `${point.year}-${point.month}`,
    label: shortMonthLabel(point.month),
    expense: point.expense,
    heightPercent: point.expense <= 0 ? 0 : Math.max(4, Math.round((point.expense / max) * 100)),
    current: index === history.length - 1,
  }));
}

function percentDiff(value: number, base: number) {
  return Math.round((Math.abs(value - base) / base) * 100);
}

/** Frases sobre o mês: variação contra o mês anterior e contra a média dos meses anteriores. */
export function describeMonth(args: {
  month: MerchantActivity['month'];
  previousAverage: number;
  money: (cents: number) => string;
}) {
  const { month, previousAverage, money } = args;
  const parts: string[] = [];

  if (month.expense > 0 && month.previousExpense > 0 && month.expense !== month.previousExpense) {
    const direction = month.expense > month.previousExpense ? 'acima' : 'abaixo';
    parts.push(`${percentDiff(month.expense, month.previousExpense)}% ${direction} de ${shortMonthLabelBefore(month.month)} (${money(month.previousExpense)})`);
  } else if (month.expense > 0 && month.previousExpense <= 0) {
    parts.push('Sem gastos no mês anterior');
  }

  if (previousAverage > 0 && month.expense > 0) {
    const diff = percentDiff(month.expense, previousAverage);
    if (diff >= 10) parts.push(`${diff}% ${month.expense > previousAverage ? 'acima' : 'abaixo'} da média dos meses anteriores`);
  }

  return parts;
}

function shortMonthLabelBefore(month: number) {
  return longMonthLabel(month === 1 ? 12 : month - 1);
}

const operatorLabels = { EQUALS: 'igual a', STARTS_WITH: 'começa com', CONTAINS: 'contém' } as const;

export function aliasOperatorLabel(operator: keyof typeof operatorLabels) {
  return operatorLabels[operator];
}
