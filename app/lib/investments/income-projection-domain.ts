/**
 * Proventos projetados: para cada um dos próximos meses, o que o mesmo mês pagou 12 meses atrás, só dos ativos que
 * ainda estão em carteira. É uma referência pelo histórico (sem crescimento, sem mudança de quantidade, sem proventos
 * novos), não uma promessa. Puro: centavos inteiros, uma moeda por vez.
 */

export type ProjectionMonth = { year: number; month: number };

export type IncomeForProjection = {
  assetId: string;
  year: number;
  month: number;
  netAmountCents: number;
};

export type ProjectedIncomeMonth = ProjectionMonth & {
  /** Proventos líquidos do mesmo mês, um ano antes, dos ativos ainda em carteira. */
  amountCents: number;
  /** Ativos que pagaram naquele mês. */
  assetCount: number;
};

export type IncomeProjection = {
  months: ProjectedIncomeMonth[];
  totalCents: number;
  /** Quantos dos 12 meses de referência tiveram algum provento dos ativos em carteira. */
  referenceMonthsWithIncome: number;
};

export const PROJECTION_HORIZON_MONTHS = 12;

function monthIndex({ year, month }: ProjectionMonth) {
  return year * 12 + (month - 1);
}

function fromIndex(index: number): ProjectionMonth {
  return { year: Math.floor(index / 12), month: (index % 12) + 1 };
}

export function projectIncomes(args: {
  incomes: readonly IncomeForProjection[];
  /** Ativos com posição aberta hoje; os vendidos não rendem mais nada. */
  openAssetIds: ReadonlySet<string>;
  /** Mês atual: a projeção começa no mês seguinte. */
  asOf: ProjectionMonth;
  horizon?: number;
}): IncomeProjection {
  const horizon = args.horizon ?? PROJECTION_HORIZON_MONTHS;
  const byMonth = new Map<number, { amount: number; assets: Set<string> }>();
  for (const income of args.incomes) {
    if (!args.openAssetIds.has(income.assetId)) continue;
    const key = monthIndex(income);
    const entry = byMonth.get(key) ?? { amount: 0, assets: new Set<string>() };
    entry.amount += income.netAmountCents;
    entry.assets.add(income.assetId);
    byMonth.set(key, entry);
  }

  const start = monthIndex(args.asOf) + 1;
  const months: ProjectedIncomeMonth[] = Array.from({ length: horizon }, (_, offset) => {
    const target = start + offset;
    const reference = byMonth.get(target - 12);
    return { ...fromIndex(target), amountCents: reference?.amount ?? 0, assetCount: reference?.assets.size ?? 0 };
  });

  return {
    months,
    totalCents: months.reduce((sum, item) => sum + item.amountCents, 0),
    referenceMonthsWithIncome: months.filter((item) => item.amountCents > 0).length,
  };
}
