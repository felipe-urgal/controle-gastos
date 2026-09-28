import type { SupportedCurrency } from '@/app/types/financial-summary';
import type {
  CategoryBudgetInsight,
  FinancialInsight,
  FinancialInsightLogicalDate,
  FinancialInsightPeriod,
  ForecastBalanceInsight,
  RecurringShareInsight,
  UpcomingPendingInsight,
} from '@/app/types/financial-insight';

export const FINANCIAL_INSIGHT_LIMIT = 5;
export const CATEGORY_BUDGET_INSIGHT_LIMIT = 2;
export const CATEGORY_BUDGET_NEAR_PERCENTAGE = 80;

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

export type BuildFinancialInsightsInput = {
  period: FinancialInsightPeriod;
  currency: SupportedCurrency;
  asOf: FinancialInsightLogicalDate;
  categoryBudgets: readonly CategoryBudgetInput[];
  pendingExpenses: readonly PendingExpenseInput[];
  recurringMonthlyEquivalent: number | null;
  knownMonthlyExpense: number | null;
  forecastAccounts: readonly ForecastAccountInput[];
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

  const upcoming = buildUpcomingPendingInsight(input);
  if (upcoming) items.push(upcoming);

  const recurring = buildRecurringShareInsight(input);
  if (recurring) items.push(recurring);

  const forecast = buildForecastBalanceInsight(input);
  if (forecast) items.push(forecast);

  return items.slice(0, FINANCIAL_INSIGHT_LIMIT);
}
