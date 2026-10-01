import type { SupportedCurrency } from '@/app/types/financial-summary';
import type {
  CategoryBudgetInsight,
  FinancialInsight,
  FinancialInsightLogicalDate,
  FinancialInsightPeriod,
  ForecastBalanceInsight,
  RecurringShareInsight,
  SpendingAnomalyInsight,
  UpcomingPendingInsight,
} from '@/app/types/financial-insight';

export const FINANCIAL_INSIGHT_LIMIT = 5;
export const CATEGORY_BUDGET_INSIGHT_LIMIT = 2;
export const CATEGORY_BUDGET_NEAR_PERCENTAGE = 80;
export const SPENDING_ANOMALY_MIN_SAMPLE = 4;
export const SPENDING_ANOMALY_MIN_INCREASE_PERCENTAGE = 50;
export const SPENDING_ANOMALY_MIN_DIFFERENCE = 1_000;
export const SPENDING_ANOMALY_MODIFIED_Z_SCORE_THRESHOLD = 3.5;
export const SPENDING_ANOMALY_MODIFIED_Z_SCORE_FACTOR = 0.6745;
export const SPENDING_ANOMALY_LIMIT = 2;

type CategoryBudgetInput = {
  category: { id: string; name: string };
  budget: number;
  consumption: number;
};

type PendingExpenseInput = {
  amount: number;
  date: FinancialInsightLogicalDate;
};

type ForecastAccountInput = {
  realizedBalance: number;
  projectedBalance: number;
};

type CategorySpendingSeriesInput = {
  category: { id: string; name: string };
  currentAmount: number;
  history: readonly number[];
};

export type BuildFinancialInsightsInput = {
  period: FinancialInsightPeriod;
  currency: SupportedCurrency;
  asOf: FinancialInsightLogicalDate;
  categoryBudgets: readonly CategoryBudgetInput[];
  pendingExpenses: readonly PendingExpenseInput[];
  recurringMonthlyEquivalent: number | null;
  knownMonthlyExpense: number | null;
  forecastAccounts: readonly ForecastAccountInput[];
  categorySpendingSeries?: readonly CategorySpendingSeriesInput[];
};

function roundPercentage(numerator: number, denominator: number) {
  if (denominator <= 0) return null;
  return Math.round((numerator / denominator) * 1000) / 10;
}

function addDays(
  date: FinancialInsightLogicalDate,
  days: number,
): FinancialInsightLogicalDate {
  const value = new Date(Date.UTC(date.year, date.month - 1, date.day + days));
  return {
    year: value.getUTCFullYear(),
    month: value.getUTCMonth() + 1,
    day: value.getUTCDate(),
  };
}

function logicalDateKey(date: FinancialInsightLogicalDate) {
  return date.year * 10_000 + date.month * 100 + date.day;
}

function isCurrentPeriod(
  period: FinancialInsightPeriod,
  asOf: FinancialInsightLogicalDate,
) {
  return period.year === asOf.year && period.month === asOf.month;
}

export function buildCategoryBudgetInsights(args: {
  period: FinancialInsightPeriod;
  currency: SupportedCurrency;
  categoryBudgets: readonly CategoryBudgetInput[];
}): CategoryBudgetInsight[] {
  return [...args.categoryBudgets]
    .sort((left, right) =>
      left.category.name.localeCompare(right.category.name, 'pt-BR'),
    )
    .flatMap((item): CategoryBudgetInsight[] => {
      if (
        !Number.isInteger(item.budget) ||
        item.budget <= 0 ||
        !Number.isInteger(item.consumption) ||
        item.consumption < 0
      ) {
        return [];
      }

      const percentage = roundPercentage(item.consumption, item.budget);
      if (percentage === null || percentage < CATEGORY_BUDGET_NEAR_PERCENTAGE) {
        return [];
      }

      const state = item.consumption > item.budget ? 'OVER' : 'NEAR';

      return [{
        id: `category-budget:${item.category.id}`,
        type: 'CATEGORY_BUDGET',
        period: args.period,
        currency: args.currency,
        message:
          state === 'OVER'
            ? `${item.category.name} está em ${percentage}% do orçamento do período.`
            : `${item.category.name} atingiu ${percentage}% do orçamento do período.`,
        href: '/categorias',
        data: {
          categoryId: item.category.id,
          categoryName: item.category.name,
          state,
          budget: item.budget,
          consumption: item.consumption,
          percentage,
        },
      }];
    })
    .slice(0, CATEGORY_BUDGET_INSIGHT_LIMIT);
}

export function buildUpcomingPendingInsight(args: {
  period: FinancialInsightPeriod;
  currency: SupportedCurrency;
  asOf: FinancialInsightLogicalDate;
  pendingExpenses: readonly PendingExpenseInput[];
}): UpcomingPendingInsight | null {
  if (!isCurrentPeriod(args.period, args.asOf)) return null;

  const through = addDays(args.asOf, 6);
  const fromKey = logicalDateKey(args.asOf);
  const throughKey = logicalDateKey(through);
  const eligible = args.pendingExpenses.filter((item) => {
    const key = logicalDateKey(item.date);
    return (
      Number.isInteger(item.amount) &&
      item.amount > 0 &&
      key >= fromKey &&
      key <= throughKey
    );
  });

  if (eligible.length === 0) return null;

  return {
    id: 'upcoming-pending:7d',
    type: 'UPCOMING_PENDING' as const,
    period: args.period,
    currency: args.currency,
    message: `${eligible.length} despesa(s) pendente(s) vence(m) nos próximos 7 dias.`,
    href: '/calendario',
    data: {
      count: eligible.length,
      amount: eligible.reduce((sum, item) => sum + item.amount, 0),
      from: args.asOf,
      through,
    },
  };
}

export function buildRecurringShareInsight(args: {
  period: FinancialInsightPeriod;
  currency: SupportedCurrency;
  asOf: FinancialInsightLogicalDate;
  recurringMonthlyEquivalent: number | null;
  knownMonthlyExpense: number | null;
}): RecurringShareInsight | null {
  if (!isCurrentPeriod(args.period, args.asOf)) return null;
  if (
    args.recurringMonthlyEquivalent === null ||
    args.knownMonthlyExpense === null ||
    !Number.isInteger(args.recurringMonthlyEquivalent) ||
    !Number.isInteger(args.knownMonthlyExpense) ||
    args.recurringMonthlyEquivalent <= 0 ||
    args.knownMonthlyExpense <= 0
  ) {
    return null;
  }

  const percentage = roundPercentage(
    args.recurringMonthlyEquivalent,
    args.knownMonthlyExpense,
  );
  if (percentage === null) return null;

  return {
    id: 'recurring-share',
    type: 'RECURRING_SHARE' as const,
    period: args.period,
    currency: args.currency,
    message: `Recorrências equivalem a ${percentage}% das despesas conhecidas do período.`,
    href: '/recorrencias',
    data: {
      monthlyEquivalent: args.recurringMonthlyEquivalent,
      knownMonthlyExpense: args.knownMonthlyExpense,
      percentage,
    },
  };
}


function median(values: readonly number[]) {
  const sorted = [...values].sort((left, right) => left - right);
  if (sorted.length === 0) return null;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? Math.round((sorted[middle - 1] + sorted[middle]) / 2)
    : sorted[middle];
}

function medianAbsoluteDeviation(
  values: readonly number[],
  baselineMedian: number,
) {
  return median(values.map((value) => Math.abs(value - baselineMedian)));
}

function modifiedZScore(difference: number, mad: number) {
  if (mad <= 0) return null;
  return (
    Math.round(
      ((SPENDING_ANOMALY_MODIFIED_Z_SCORE_FACTOR * difference) / mad) * 10,
    ) / 10
  );
}

export function buildSpendingAnomalyInsights(args: {
  period: FinancialInsightPeriod;
  currency: SupportedCurrency;
  categorySpendingSeries: readonly CategorySpendingSeriesInput[];
}): SpendingAnomalyInsight[] {
  return args.categorySpendingSeries
    .flatMap((item): SpendingAnomalyInsight[] => {
      if (!Number.isInteger(item.currentAmount) || item.currentAmount <= 0) return [];

      const history = item.history.filter(
        (amount) => Number.isInteger(amount) && amount > 0,
      );
      if (history.length < SPENDING_ANOMALY_MIN_SAMPLE) return [];

      const baselineMedian = median(history);
      if (baselineMedian === null || baselineMedian <= 0) return [];

      const difference = item.currentAmount - baselineMedian;
      const percentageDifference = roundPercentage(difference, baselineMedian);
      if (
        percentageDifference === null ||
        difference < SPENDING_ANOMALY_MIN_DIFFERENCE ||
        percentageDifference < SPENDING_ANOMALY_MIN_INCREASE_PERCENTAGE
      ) {
        return [];
      }

      const baselineMad = medianAbsoluteDeviation(history, baselineMedian);
      if (baselineMad === null) return [];

      const score = modifiedZScore(difference, baselineMad);
      const rule =
        baselineMad === 0
          ? 'ZERO_MAD_MATERIAL_INCREASE'
          : 'MODIFIED_Z_SCORE';

      if (
        rule === 'MODIFIED_Z_SCORE' &&
        (score === null || score < SPENDING_ANOMALY_MODIFIED_Z_SCORE_THRESHOLD)
      ) {
        return [];
      }

      const explanation =
        rule === 'MODIFIED_Z_SCORE'
          ? `MAD de ${baselineMad} e z-score modificado de ${score}.`
          : 'O histórico elegível não teve dispersão (MAD = 0).';

      return [{
        id: `spending-anomaly:${item.category.id}`,
        type: 'SPENDING_ANOMALY',
        period: args.period,
        currency: args.currency,
        message: `${item.category.name} está ${percentageDifference}% acima da mediana de ${history.length} meses com histórico. ${explanation}`,
        href: `/transacoes?year=${args.period.year}&month=${args.period.month}&categoryId=${encodeURIComponent(item.category.id)}`,
        data: {
          categoryId: item.category.id,
          categoryName: item.category.name,
          currentAmount: item.currentAmount,
          baselineMedian,
          difference,
          percentageDifference,
          sampleSize: history.length,
          baselineMad,
          modifiedZScore: score,
          rule,
        },
      }];
    })
    .sort((left, right) => right.data.percentageDifference - left.data.percentageDifference)
    .slice(0, SPENDING_ANOMALY_LIMIT);
}

export function buildForecastBalanceInsight(args: {
  period: FinancialInsightPeriod;
  currency: SupportedCurrency;
  asOf: FinancialInsightLogicalDate;
  forecastAccounts: readonly ForecastAccountInput[];
}): ForecastBalanceInsight | null {
  if (!isCurrentPeriod(args.period, args.asOf)) return null;
  if (args.forecastAccounts.length === 0) return null;

  const currentBalance = args.forecastAccounts.reduce(
    (sum, account) => sum + account.realizedBalance,
    0,
  );
  const projectedBalance = args.forecastAccounts.reduce(
    (sum, account) => sum + account.projectedBalance,
    0,
  );
  const difference = projectedBalance - currentBalance;

  if (difference === 0) return null;

  return {
    id: 'forecast-balance:30d',
    type: 'FORECAST_BALANCE' as const,
    period: args.period,
    currency: args.currency,
    message: 'O forecast de 30 dias projeta uma mudança no saldo consolidado.',
    href: '/dashboard',
    data: {
      horizonDays: 30 as const,
      currentBalance,
      projectedBalance,
      difference,
    },
  };
}

export function buildFinancialInsights(
  input: BuildFinancialInsightsInput,
): FinancialInsight[] {
  const items: FinancialInsight[] = [
    ...buildCategoryBudgetInsights({
      period: input.period,
      currency: input.currency,
      categoryBudgets: input.categoryBudgets,
    }),
  ];

  if (input.categorySpendingSeries) {
    items.push(
      ...buildSpendingAnomalyInsights({
        period: input.period,
        currency: input.currency,
        categorySpendingSeries: input.categorySpendingSeries,
      }),
    );
  }

  const upcoming = buildUpcomingPendingInsight(input);
  if (upcoming) items.push(upcoming);

  const recurring = buildRecurringShareInsight(input);
  if (recurring) items.push(recurring);

  const forecast = buildForecastBalanceInsight(input);
  if (forecast) items.push(forecast);

  return items.slice(0, FINANCIAL_INSIGHT_LIMIT);
}
