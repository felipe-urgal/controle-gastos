import type { PayrollSummary } from '@/app/types/payroll';

export type YearTotals = {
  /** Soma do líquido das competências com líquido conhecido; as demais ficam fora (desconhecido não vira zero). */
  netPaidCents: number;
  netKnownCount: number;
  netUnknownCount: number;
  grossCents: number;
  grossKnownCount: number;
  irrfCents: number;
  irrfMissingCount: number;
  /** Média do líquido das competências conhecidas; `null` sem nenhuma. */
  averageNetCents: number | null;
  reviewCount: number;
};

const known = (value: number | null, complete: boolean) => (complete && value !== null ? value : null);

export function summarizeYear(items: PayrollSummary[]): YearTotals {
  let net = 0;
  let gross = 0;
  let irrf = 0;
  let netKnown = 0;
  let grossKnown = 0;
  let irrfMissing = 0;

  for (const item of items) {
    const itemNet = known(item.netPaidCents, item.netPaidComplete);
    if (itemNet !== null) {
      net += itemNet;
      netKnown += 1;
    }
    const itemGross = known(item.grossIncomeCents, item.grossIncomeComplete);
    if (itemGross !== null) {
      gross += itemGross;
      grossKnown += 1;
    }
    const itemIrrf = known(item.irrfCents, item.irrfComplete);
    if (itemIrrf !== null) irrf += itemIrrf;
    else irrfMissing += 1;
  }

  return {
    netPaidCents: net,
    netKnownCount: netKnown,
    netUnknownCount: items.length - netKnown,
    grossCents: gross,
    grossKnownCount: grossKnown,
    irrfCents: irrf,
    irrfMissingCount: irrfMissing,
    averageNetCents: netKnown > 0 ? Math.round(net / netKnown) : null,
    reviewCount: items.filter((item) => item.reviewRequired).length,
  };
}

export type MonthPoint = {
  month: number;
  status: 'EMPTY' | 'COMPLETE' | 'INCOMPLETE';
  /** Líquido do mês somando empregadores; `null` se algum valor for desconhecido ou não houver documento. */
  netPaidCents: number | null;
  grossCents: number | null;
  irrfCents: number | null;
  advanceCents: number | null;
  /** Altura da barra: líquido quando conhecido; senão o adiantamento já pago (mês incompleto). */
  barCents: number;
};

function sumKnown(values: Array<number | null>): number | null {
  return values.every((value) => value !== null) ? values.reduce<number>((sum, value) => sum + (value ?? 0), 0) : null;
}

/** Os 12 meses do ano, agregando empregadores. Mês sem documento é `EMPTY`; com valor desconhecido é `INCOMPLETE`. */
export function monthlySeries(items: PayrollSummary[], year: number): MonthPoint[] {
  return Array.from({ length: 12 }, (_, index) => {
    const month = index + 1;
    const own = items.filter((item) => item.year === year && item.month === month);
    if (own.length === 0) {
      return { month, status: 'EMPTY', netPaidCents: null, grossCents: null, irrfCents: null, advanceCents: null, barCents: 0 };
    }
    const netPaid = sumKnown(own.map((item) => known(item.netPaidCents, item.netPaidComplete)));
    const advance = sumKnown(own.map((item) => known(item.advanceNetPaidCents, item.advanceNetPaidComplete)));
    return {
      month,
      status: netPaid === null ? 'INCOMPLETE' : 'COMPLETE',
      netPaidCents: netPaid,
      grossCents: sumKnown(own.map((item) => known(item.grossIncomeCents, item.grossIncomeComplete))),
      irrfCents: sumKnown(own.map((item) => known(item.irrfCents, item.irrfComplete))),
      advanceCents: advance,
      barCents: netPaid ?? advance ?? 0,
    };
  });
}

/** Meses visíveis no gráfico: o ano todo, ou só os últimos `count` até o mês mais recente com documento (celular). */
export function visibleMonths(series: MonthPoint[], count: number | null): MonthPoint[] {
  if (count === null) return series;
  const last = series.reduce((latest, point) => (point.status !== 'EMPTY' ? point.month : latest), 0) || series.length;
  const start = Math.max(1, last - count + 1);
  return series.filter((point) => point.month >= start && point.month <= start + count - 1);
}

/** Competências mais recentes primeiro. */
export function recentFirst(items: PayrollSummary[]): PayrollSummary[] {
  return [...items].sort((left, right) => right.year - left.year || right.month - left.month || left.employerName.localeCompare(right.employerName));
}

export function reviewQueue(items: PayrollSummary[]): PayrollSummary[] {
  return recentFirst(items).filter((item) => item.reviewRequired);
}
