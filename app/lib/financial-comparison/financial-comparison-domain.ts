import type {
  ComparisonMonth,
  ComparisonRange,
  FinancialComparisonMetric,
} from '@/app/types/financial-comparison';

export const MAX_COMPARISON_MONTHS = 24;

export function parseComparisonMonth(value: string): ComparisonMonth | null {
  const match = /^(\d{4})-(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (
    !Number.isInteger(year) ||
    year < 2000 ||
    year > 2100 ||
    month < 1 ||
    month > 12
  ) {
    return null;
  }
  return { year, month };
}

export function comparisonMonthIndex(value: ComparisonMonth) {
  return value.year * 12 + value.month - 1;
}

export function compareComparisonMonths(
  left: ComparisonMonth,
  right: ComparisonMonth,
) {
  return Math.sign(comparisonMonthIndex(left) - comparisonMonthIndex(right));
}

export function isComparisonRangeInFuture(
  range: ComparisonRange,
  currentMonth: ComparisonMonth,
) {
  return compareComparisonMonths(range.to, currentMonth) > 0;
}

export function comparisonRangesOverlap(
  left: ComparisonRange,
  right: ComparisonRange,
) {
  const leftStart = comparisonMonthIndex(left.from);
  const leftEnd = comparisonMonthIndex(left.to);
  const rightStart = comparisonMonthIndex(right.from);
  const rightEnd = comparisonMonthIndex(right.to);

  return Math.max(leftStart, rightStart) <= Math.min(leftEnd, rightEnd);
}

export function isComparisonMonthInRange(
  month: ComparisonMonth,
  range: ComparisonRange,
) {
  const value = comparisonMonthIndex(month);
  return (
    value >= comparisonMonthIndex(range.from) &&
    value <= comparisonMonthIndex(range.to)
  );
}

export function enumerateComparisonMonths(range: ComparisonRange) {
  const start = comparisonMonthIndex(range.from);
  const end = comparisonMonthIndex(range.to);
  if (end < start) {
    throw new Error('O fim do período deve ser igual ou posterior ao início');
  }
  const count = end - start + 1;
  if (count > MAX_COMPARISON_MONTHS) {
    throw new Error(
      `Cada período pode ter no máximo ${MAX_COMPARISON_MONTHS} meses`,
    );
  }
  return Array.from({ length: count }, (_, index) => {
    const value = start + index;
    return { year: Math.floor(value / 12), month: (value % 12) + 1 };
  });
}

export function uncategorizedComparisonAmount(
  expense: number,
  categoryAmounts: number[],
) {
  return expense - categoryAmounts.reduce((sum, amount) => sum + amount, 0);
}

export function averageComparisonAmount(total: number, months: number) {
  if (!Number.isInteger(months) || months <= 0) {
    throw new Error('Quantidade de meses inválida');
  }
  return Math.round(total / months);
}

export function financialComparisonMetric(
  current: number,
  baseline: number,
): FinancialComparisonMetric {
  const difference = current - baseline;
  return {
    difference,
    percentage:
      baseline === 0
        ? null
        : Math.round((difference / Math.abs(baseline)) * 1000) / 10,
  };
}
