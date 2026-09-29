import type { ComparisonMonth, ComparisonRange, FinancialComparisonMetric } from '@/app/types/financial-comparison';

export const MAX_COMPARISON_MONTHS = 24;

export function parseComparisonMonth(value: string): ComparisonMonth | null {
  const match = /^(\d{4})-(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (!Number.isInteger(year) || year < 2000 || year > 2100 || month < 1 || month > 12) return null;
  return { year, month };
}

function absoluteMonth(value: ComparisonMonth) {
  return value.year * 12 + value.month - 1;
}

export function enumerateComparisonMonths(range: ComparisonRange) {
  const start = absoluteMonth(range.from);
  const end = absoluteMonth(range.to);
  if (end < start) throw new Error('O fim do período deve ser igual ou posterior ao início');
  const count = end - start + 1;
  if (count > MAX_COMPARISON_MONTHS) throw new Error(`Cada período pode ter no máximo ${MAX_COMPARISON_MONTHS} meses`);
  return Array.from({ length: count }, (_, index) => {
    const value = start + index;
    return { year: Math.floor(value / 12), month: (value % 12) + 1 };
  });
}

export function financialComparisonMetric(current: number, baseline: number): FinancialComparisonMetric {
  const difference = current - baseline;
  return {
    difference,
    percentage: baseline === 0 ? null : Math.round((difference / Math.abs(baseline)) * 1000) / 10,
  };
}
