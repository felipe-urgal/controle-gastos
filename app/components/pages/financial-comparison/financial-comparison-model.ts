import type {
  ComparisonMonth,
  FinancialComparisonData,
  FinancialComparisonMetric,
} from '@/app/types/financial-comparison';
import type { SupportedCurrency } from '@/app/types/financial-summary';

export type ComparisonFilters = {
  aFrom: string;
  aTo: string;
  bFrom: string;
  bTo: string;
  currency: SupportedCurrency;
};

export type ComparisonPreset = 'previous' | 'year-over-year' | 'ytd' | 'closed-year';
export type ComparisonBasis = 'total' | 'average';
export type DeltaTone = 'good' | 'bad' | 'flat';

export type VerdictSegment = { text: string; tone?: DeltaTone; money?: boolean };

type Money = (cents: number) => string;

/** Percentual no padrão pt-BR (vírgula decimal), com no máximo uma casa. */
export function formatPercent(value: number) {
  return value.toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + '%';
}

export function monthValue(period: ComparisonMonth) {
  return `${period.year}-${String(period.month).padStart(2, '0')}`;
}

export function shiftMonth(period: ComparisonMonth, offset: number): ComparisonMonth {
  const absolute = period.year * 12 + period.month - 1 + offset;
  return { year: Math.floor(absolute / 12), month: (((absolute % 12) + 12) % 12) + 1 };
}

export function defaultFilters(current: ComparisonMonth): ComparisonFilters {
  return presetFilters('ytd', {
    aFrom: '', aTo: '', bFrom: '', bTo: '', currency: 'BRL',
  }, current);
}

/** Filtros de cada atalho; a moeda atual é preservada. */
export function presetFilters(
  preset: ComparisonPreset,
  filters: ComparisonFilters,
  current: ComparisonMonth,
): ComparisonFilters {
  const month = (year: number, m: number) => monthValue({ year, month: m });

  if (preset === 'previous') {
    const previous = shiftMonth(current, -1);
    return { ...filters, aFrom: monthValue(previous), aTo: monthValue(previous), bFrom: monthValue(current), bTo: monthValue(current) };
  }
  if (preset === 'year-over-year') {
    const sameMonthLastYear = month(current.year - 1, current.month);
    return { ...filters, aFrom: sameMonthLastYear, aTo: sameMonthLastYear, bFrom: monthValue(current), bTo: monthValue(current) };
  }
  if (preset === 'ytd') {
    return {
      ...filters,
      aFrom: month(current.year - 1, 1),
      aTo: month(current.year - 1, current.month),
      bFrom: month(current.year, 1),
      bTo: monthValue(current),
    };
  }
  return {
    ...filters,
    aFrom: month(current.year - 2, 1),
    aTo: month(current.year - 2, 12),
    bFrom: month(current.year - 1, 1),
    bTo: month(current.year - 1, 12),
  };
}

export function activePreset(filters: ComparisonFilters, current: ComparisonMonth): ComparisonPreset | null {
  const presets: ComparisonPreset[] = ['previous', 'year-over-year', 'ytd', 'closed-year'];
  return (
    presets.find((preset) => {
      const expected = presetFilters(preset, filters, current);
      return (
        expected.aFrom === filters.aFrom &&
        expected.aTo === filters.aTo &&
        expected.bFrom === filters.bFrom &&
        expected.bTo === filters.bTo
      );
    }) ?? null
  );
}

/** Tom da variação; `lowerIsBetter` vale para despesas. */
export function deltaTone(metric: FinancialComparisonMetric, lowerIsBetter = false): DeltaTone {
  if (metric.difference === 0) return 'flat';
  const up = metric.difference > 0;
  return up !== lowerIsBetter ? 'good' : 'bad';
}

export function deltaLabel(metric: FinancialComparisonMetric, money: Money) {
  if (metric.difference === 0) return 'Sem mudança';
  const up = metric.difference > 0;
  const percentage = metric.percentage === null ? 'sem base percentual' : formatPercent(Math.abs(metric.percentage));
  return `${up ? '▲' : '▼'} ${percentage} · ${up ? '+' : '−'} ${money(Math.abs(metric.difference))}`;
}

/** Larguras (0–100) das duas barras, na mesma escala. */
export function pairWidths(a: number, b: number): [number, number] {
  const max = Math.max(Math.abs(a), Math.abs(b));
  if (max === 0) return [0, 0];
  return [Math.round((Math.abs(a) / max) * 100), Math.round((Math.abs(b) / max) * 100)];
}

export function metricRows(data: FinancialComparisonData, basis: ComparisonBasis) {
  const average = basis === 'average';
  return [
    {
      key: 'income',
      label: 'Receitas',
      a: average ? data.a.averageMonthlyIncome : data.a.income,
      b: average ? data.b.averageMonthlyIncome : data.b.income,
      metric: average ? data.difference.averageMonthlyIncome : data.difference.income,
      lowerIsBetter: false,
    },
    {
      key: 'expense',
      label: 'Despesas',
      a: average ? data.a.averageMonthlyExpense : data.a.expense,
      b: average ? data.b.averageMonthlyExpense : data.b.expense,
      metric: average ? data.difference.averageMonthlyExpense : data.difference.expense,
      lowerIsBetter: true,
    },
    {
      key: 'balance',
      label: 'Resultado',
      a: average ? data.a.averageMonthlyBalance : data.a.balance,
      b: average ? data.b.averageMonthlyBalance : data.b.balance,
      metric: average ? data.difference.averageMonthlyBalance : data.difference.balance,
      lowerIsBetter: false,
    },
  ];
}

/** Frase de veredito em segmentos, para o chamador aplicar fonte numérica e cor. */
export function buildVerdict(
  data: FinancialComparisonData,
  basis: ComparisonBasis,
  money: Money,
  labels: { a: string; b: string },
): VerdictSegment[] {
  const [income, expense, balance] = metricRows(data, basis);
  if (income.a === 0 && income.b === 0 && expense.a === 0 && expense.b === 0) {
    return [{ text: 'Sem receitas ou despesas realizadas nos dois períodos.' }];
  }

  const average = basis === 'average';
  const expenseTone = deltaTone(expense.metric, true);
  const segments: VerdictSegment[] = [
    { text: `Em ${labels.b} você gastou${average ? ' em média ' : ' '}` },
    { text: money(expense.b), tone: expenseTone, money: true },
  ];
  if (average) segments.push({ text: ' por mês' });

  const { percentage } = expense.metric;
  if (percentage === null) {
    // Sem base em A: não inventa percentual.
  } else if (percentage === 0) {
    segments.push({ text: `, o mesmo que em ${labels.a}` });
  } else {
    segments.push({ text: ', ' }, { text: `${formatPercent(Math.abs(percentage))} ${percentage < 0 ? 'a menos' : 'a mais'}`, tone: expenseTone }, { text: ` que em ${labels.a}` });
  }

  const diff = balance.metric.difference;
  if (diff === 0) {
    segments.push({ text: ', e o resultado ficou igual.' });
  } else {
    segments.push(
      { text: diff > 0 ? ', e o resultado melhorou ' : ', e o resultado piorou ' },
      { text: money(Math.abs(diff)), tone: deltaTone(balance.metric), money: true },
      { text: '.' },
    );
  }
  return segments;
}

/** Categorias de despesa da maior para a menor diferença na base escolhida. */
export function sortedMovers(data: FinancialComparisonData, basis: ComparisonBasis) {
  const average = basis === 'average';
  return data.categories
    .map((category) => {
      const a = average ? category.a.averageMonthlyAmount : category.a.amount;
      const b = average ? category.b.averageMonthlyAmount : category.b.amount;
      return {
        id: category.id,
        name: category.name,
        color: category.color,
        icon: category.icon,
        a,
        b,
        metric: average ? category.averageDifference : category.difference,
        widths: pairWidths(a, b),
      };
    })
    .sort((left, right) => Math.abs(right.metric.difference) - Math.abs(left.metric.difference) || left.name.localeCompare(right.name, 'pt-BR'));
}
