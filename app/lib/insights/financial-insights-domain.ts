import type { SupportedCurrency } from '@/app/types/financial-summary';
import type {
  CategoryBudgetInsight,
  FinancialInsight,
  FinancialInsightLogicalDate,
  FinancialInsightPeriod,
  ForecastBalanceInsight,
  GoalDelayedInsight,
  IncomeChangeInsight,
  PossibleSubscriptionInsight,
  RecurringShareInsight,
  SafeToSpendInsight,
  SpendingAnomalyInsight,
  SubscriptionPriceChangeInsight,
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
export const SAFE_TO_SPEND_LOW_PERCENTAGE = 10;
export const SUBSCRIPTION_SIGNAL_LIMIT = 1;
export const INCOME_DROP_MIN_PERCENTAGE = 20;
export const INCOME_DROP_MIN_DIFFERENCE = 1_000;
export const GOAL_DELAYED_INSIGHT_LIMIT = 1;

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

type SafeToSpendInput = {
  realizedBalance: number;
  pendingExpenses: number;
  cardCommitments: number;
  transferNet: number;
  safeToSpend: number;
};

type SubscriptionSignalInput = {
  id: string;
  status: 'CONFIRMED' | 'POSSIBLE';
  description: string;
  currency: SupportedCurrency;
  currentAmount: number;
  monthlyEquivalent: number;
  annualEquivalent: number;
  occurrenceCount: number;
  nextCharge: FinancialInsightLogicalDate;
  possiblyEnded: boolean;
  priceChange: {
    previousAmount: number;
    currentAmount: number;
    difference: number;
    percent: number;
  } | null;
};

type IncomeChangeInput = {
  currentIncome: number;
  previousIncome: number;
  previousPeriod: FinancialInsightPeriod;
};

type GoalInsightInput = {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  remainingAmount: number;
  targetDate: FinancialInsightLogicalDate | null;
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
  safeToSpend?: SafeToSpendInput | null;
  subscriptions?: readonly SubscriptionSignalInput[];
  incomeChange?: IncomeChangeInput | null;
  goals?: readonly GoalInsightInput[];
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
  return args.categoryBudgets
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
    .sort((left, right) => {
      if (left.data.state !== right.data.state) {
        return left.data.state === 'OVER' ? -1 : 1;
      }
      if (left.data.percentage !== right.data.percentage) {
        return right.data.percentage - left.data.percentage;
      }
      return left.data.categoryName.localeCompare(
        right.data.categoryName,
        'pt-BR',
      );
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
    type: 'UPCOMING_PENDING',
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
    type: 'RECURRING_SHARE',
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
    type: 'FORECAST_BALANCE',
    period: args.period,
    currency: args.currency,
    message:
      projectedBalance < 0
        ? 'O forecast de 30 dias projeta saldo consolidado negativo.'
        : 'O forecast de 30 dias projeta uma mudança no saldo consolidado.',
    href: '/dashboard',
    data: {
      horizonDays: 30,
      currentBalance,
      projectedBalance,
      difference,
    },
  };
}

export function buildSafeToSpendInsight(args: {
  period: FinancialInsightPeriod;
  currency: SupportedCurrency;
  asOf: FinancialInsightLogicalDate;
  safeToSpend: SafeToSpendInput | null;
}): SafeToSpendInsight | null {
  if (!isCurrentPeriod(args.period, args.asOf) || !args.safeToSpend) return null;

  const values = [
    args.safeToSpend.realizedBalance,
    args.safeToSpend.pendingExpenses,
    args.safeToSpend.cardCommitments,
    args.safeToSpend.transferNet,
    args.safeToSpend.safeToSpend,
  ];
  if (!values.every(Number.isInteger)) return null;

  const percentageOfRealized = roundPercentage(
    args.safeToSpend.safeToSpend,
    args.safeToSpend.realizedBalance,
  );

  const state =
    args.safeToSpend.safeToSpend < 0
      ? 'NEGATIVE'
      : percentageOfRealized !== null &&
          percentageOfRealized <= SAFE_TO_SPEND_LOW_PERCENTAGE
        ? 'LOW'
        : null;

  if (!state) return null;

  return {
    id: 'safe-to-spend:30d',
    type: 'SAFE_TO_SPEND',
    period: args.period,
    currency: args.currency,
    message:
      state === 'NEGATIVE'
        ? 'O disponível para gastar nos próximos 30 dias está negativo.'
        : `O disponível para gastar caiu para ${percentageOfRealized}% do saldo realizado.`,
    href: '/dashboard',
    data: {
      horizonDays: 30,
      state,
      ...args.safeToSpend,
      percentageOfRealized,
    },
  };
}

export function buildSubscriptionPriceInsights(args: {
  period: FinancialInsightPeriod;
  currency: SupportedCurrency;
  asOf: FinancialInsightLogicalDate;
  subscriptions: readonly SubscriptionSignalInput[];
}): SubscriptionPriceChangeInsight[] {
  if (!isCurrentPeriod(args.period, args.asOf)) return [];

  return args.subscriptions
    .flatMap((item): SubscriptionPriceChangeInsight[] => {
      const change = item.priceChange;
      if (
        item.currency !== args.currency ||
        item.possiblyEnded ||
        !change ||
        !Number.isInteger(change.previousAmount) ||
        !Number.isInteger(change.currentAmount) ||
        !Number.isInteger(change.difference) ||
        change.previousAmount <= 0 ||
        change.currentAmount <= 0 ||
        change.difference <= 0 ||
        change.percent <= 0
      ) {
        return [];
      }

      return [{
        id: `subscription-price:${item.id}`,
        type: 'SUBSCRIPTION_PRICE_CHANGE',
        period: args.period,
        currency: args.currency,
        message: `${item.description} aumentou ${change.percent}% em relação ao valor anterior.`,
        href: '/recorrencias',
        data: {
          subscriptionId: item.id,
          description: item.description,
          status: item.status,
          previousAmount: change.previousAmount,
          currentAmount: change.currentAmount,
          difference: change.difference,
          percentage: change.percent,
        },
      }];
    })
    .sort((left, right) => {
      if (left.data.percentage !== right.data.percentage) {
        return right.data.percentage - left.data.percentage;
      }
      return left.id.localeCompare(right.id);
    })
    .slice(0, SUBSCRIPTION_SIGNAL_LIMIT);
}

export function buildPossibleSubscriptionInsights(args: {
  period: FinancialInsightPeriod;
  currency: SupportedCurrency;
  asOf: FinancialInsightLogicalDate;
  subscriptions: readonly SubscriptionSignalInput[];
}): PossibleSubscriptionInsight[] {
  if (!isCurrentPeriod(args.period, args.asOf)) return [];

  return args.subscriptions
    .flatMap((item): PossibleSubscriptionInsight[] => {
      if (
        item.currency !== args.currency ||
        item.status !== 'POSSIBLE' ||
        item.possiblyEnded ||
        !Number.isInteger(item.currentAmount) ||
        !Number.isInteger(item.monthlyEquivalent) ||
        !Number.isInteger(item.occurrenceCount) ||
        item.currentAmount <= 0 ||
        item.monthlyEquivalent <= 0 ||
        item.occurrenceCount < 3
      ) {
        return [];
      }

      return [{
        id: `possible-subscription:${item.id}`,
        type: 'POSSIBLE_SUBSCRIPTION',
        period: args.period,
        currency: args.currency,
        message: `Possível nova assinatura detectada: ${item.description}.`,
        href: '/recorrencias',
        data: {
          subscriptionId: item.id,
          description: item.description,
          currentAmount: item.currentAmount,
          monthlyEquivalent: item.monthlyEquivalent,
          occurrenceCount: item.occurrenceCount,
          nextCharge: item.nextCharge,
        },
      }];
    })
    .sort((left, right) => {
      if (left.data.monthlyEquivalent !== right.data.monthlyEquivalent) {
        return right.data.monthlyEquivalent - left.data.monthlyEquivalent;
      }
      return left.id.localeCompare(right.id);
    })
    .slice(0, SUBSCRIPTION_SIGNAL_LIMIT);
}

export function buildIncomeChangeInsight(args: {
  period: FinancialInsightPeriod;
  currency: SupportedCurrency;
  asOf: FinancialInsightLogicalDate;
  incomeChange: IncomeChangeInput | null;
}): IncomeChangeInsight | null {
  if (isCurrentPeriod(args.period, args.asOf)) return null;

  const input = args.incomeChange;
  if (
    !input ||
    !Number.isInteger(input.currentIncome) ||
    !Number.isInteger(input.previousIncome) ||
    input.currentIncome < 0 ||
    input.previousIncome <= 0
  ) {
    return null;
  }

  const difference = input.currentIncome - input.previousIncome;
  if (difference >= 0 || Math.abs(difference) < INCOME_DROP_MIN_DIFFERENCE) {
    return null;
  }

  const percentage = roundPercentage(Math.abs(difference), input.previousIncome);
  if (percentage === null || percentage < INCOME_DROP_MIN_PERCENTAGE) {
    return null;
  }

  return {
    id: 'income-change:previous-period',
    type: 'INCOME_CHANGE',
    period: args.period,
    currency: args.currency,
    message: `A receita caiu ${percentage}% em relação ao período anterior.`,
    href: `/comparar?year=${args.period.year}&month=${args.period.month}`,
    data: {
      currentIncome: input.currentIncome,
      previousIncome: input.previousIncome,
      difference,
      percentage,
      previousPeriod: input.previousPeriod,
    },
  };
}

export function buildGoalDelayedInsights(args: {
  period: FinancialInsightPeriod;
  currency: SupportedCurrency;
  asOf: FinancialInsightLogicalDate;
  goals: readonly GoalInsightInput[];
}): GoalDelayedInsight[] {
  if (!isCurrentPeriod(args.period, args.asOf)) return [];

  const asOfKey = logicalDateKey(args.asOf);
  return args.goals
    .flatMap((goal): GoalDelayedInsight[] => {
      if (
        !goal.targetDate ||
        !Number.isInteger(goal.targetAmount) ||
        !Number.isInteger(goal.currentAmount) ||
        !Number.isInteger(goal.remainingAmount) ||
        goal.targetAmount <= 0 ||
        goal.currentAmount < 0 ||
        goal.remainingAmount <= 0 ||
        logicalDateKey(goal.targetDate) >= asOfKey
      ) {
        return [];
      }

      return [{
        id: `goal-delayed:${goal.id}`,
        type: 'GOAL_DELAYED',
        period: args.period,
        currency: args.currency,
        message: `A meta ${goal.name} passou do prazo e ainda não foi concluída.`,
        href: '/metas',
        data: {
          goalId: goal.id,
          goalName: goal.name,
          targetAmount: goal.targetAmount,
          currentAmount: goal.currentAmount,
          remainingAmount: goal.remainingAmount,
          targetDate: goal.targetDate,
        },
      }];
    })
    .sort((left, right) => {
      const byDate =
        logicalDateKey(left.data.targetDate) - logicalDateKey(right.data.targetDate);
      return byDate !== 0 ? byDate : left.id.localeCompare(right.id);
    })
    .slice(0, GOAL_DELAYED_INSIGHT_LIMIT);
}

function priorityVector(
  insight: FinancialInsight,
): readonly [number, number, number, number] {
  const actionability = insight.href ? 1 : 0;

  switch (insight.type) {
    case 'SAFE_TO_SPEND':
      return [
        insight.data.state === 'NEGATIVE' ? 5 : 3,
        actionability,
        insight.data.state === 'NEGATIVE'
          ? Math.abs(insight.data.safeToSpend)
          : Math.max(0, insight.data.realizedBalance - insight.data.safeToSpend),
        1,
      ];
    case 'FORECAST_BALANCE':
      return [
        insight.data.projectedBalance < 0
          ? 5
          : insight.data.difference < 0
            ? 3
            : 1,
        actionability,
        Math.abs(insight.data.difference),
        1,
      ];
    case 'CATEGORY_BUDGET':
      return [
        insight.data.state === 'OVER' ? 4 : 2,
        actionability,
        Math.max(0, insight.data.consumption - insight.data.budget),
        1,
      ];
    case 'SPENDING_ANOMALY':
      return [4, actionability, insight.data.difference, 2];
    case 'GOAL_DELAYED':
      return [4, actionability, insight.data.remainingAmount, 1];
    case 'INCOME_CHANGE':
      return [4, actionability, Math.abs(insight.data.difference), 2];
    case 'UPCOMING_PENDING':
      return [3, actionability, insight.data.amount, 1];
    case 'SUBSCRIPTION_PRICE_CHANGE':
      return [3, actionability, insight.data.difference, 2];
    case 'POSSIBLE_SUBSCRIPTION':
      return [2, actionability, insight.data.monthlyEquivalent, 2];
    case 'RECURRING_SHARE':
      return [1, actionability, insight.data.monthlyEquivalent, 1];
  }
}

function comparePriority(left: FinancialInsight, right: FinancialInsight) {
  const leftVector = priorityVector(left);
  const rightVector = priorityVector(right);

  for (let index = 0; index < leftVector.length; index += 1) {
    const difference = rightVector[index] - leftVector[index];
    if (difference !== 0) return difference;
  }

  const byType = left.type.localeCompare(right.type);
  return byType !== 0 ? byType : left.id.localeCompare(right.id);
}

function dedupeKey(insight: FinancialInsight) {
  if (
    insight.type === 'SUBSCRIPTION_PRICE_CHANGE' ||
    insight.type === 'POSSIBLE_SUBSCRIPTION'
  ) {
    return `subscription:${insight.data.subscriptionId}`;
  }
  return insight.id;
}

export function prioritizeFinancialInsights(
  insights: readonly FinancialInsight[],
  limit = FINANCIAL_INSIGHT_LIMIT,
) {
  const seen = new Set<string>();
  const prioritized: FinancialInsight[] = [];

  for (const insight of [...insights].sort(comparePriority)) {
    const key = dedupeKey(insight);
    if (seen.has(key)) continue;
    seen.add(key);
    prioritized.push(insight);
    if (prioritized.length >= limit) break;
  }

  return prioritized;
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

  if (input.safeToSpend !== undefined) {
    const safeToSpend = buildSafeToSpendInsight({
      period: input.period,
      currency: input.currency,
      asOf: input.asOf,
      safeToSpend: input.safeToSpend,
    });
    if (safeToSpend) items.push(safeToSpend);
  }

  if (input.subscriptions) {
    items.push(
      ...buildSubscriptionPriceInsights({
        period: input.period,
        currency: input.currency,
        asOf: input.asOf,
        subscriptions: input.subscriptions,
      }),
      ...buildPossibleSubscriptionInsights({
        period: input.period,
        currency: input.currency,
        asOf: input.asOf,
        subscriptions: input.subscriptions,
      }),
    );
  }

  if (input.incomeChange !== undefined) {
    const incomeChange = buildIncomeChangeInsight({
      period: input.period,
      currency: input.currency,
      asOf: input.asOf,
      incomeChange: input.incomeChange,
    });
    if (incomeChange) items.push(incomeChange);
  }

  if (input.goals) {
    items.push(
      ...buildGoalDelayedInsights({
        period: input.period,
        currency: input.currency,
        asOf: input.asOf,
        goals: input.goals,
      }),
    );
  }

  return prioritizeFinancialInsights(items);
}
