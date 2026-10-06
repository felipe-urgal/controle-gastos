import type { MonthlyDashboard } from "@/app/types/dashboard";
import type {
  FinancialInsight,
  FinancialInsightsData,
} from "@/app/types/financial-insight";
import type { ForecastData } from "@/app/types/forecast";
import type {
  FinancialContext,
  LocalAssistantInsightFact,
} from "@/app/types/local-financial-assistant";

export const LOCAL_ASSISTANT_CATEGORY_LIMIT = 5;
export const LOCAL_ASSISTANT_INSIGHT_LIMIT = 6;
export const LOCAL_ASSISTANT_GOAL_LIMIT = 5;
export const LOCAL_ASSISTANT_LABEL_LIMIT = 72;

export function sanitizeFinancialContextLabel(value: string) {
  return value
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, LOCAL_ASSISTANT_LABEL_LIMIT);
}

function insightFact(insight: FinancialInsight): LocalAssistantInsightFact {
  switch (insight.type) {
    case "CATEGORY_BUDGET":
      return {
        type: insight.type,
        subject: sanitizeFinancialContextLabel(insight.data.categoryName),
        values: {
          state: insight.data.state,
          budget: insight.data.budget,
          consumption: insight.data.consumption,
          percentage: insight.data.percentage,
        },
      };
    case "UPCOMING_PENDING":
      return {
        type: insight.type,
        subject: null,
        values: {
          count: insight.data.count,
          amount: insight.data.amount,
          through: `${insight.data.through.year}-${String(insight.data.through.month).padStart(2, "0")}-${String(insight.data.through.day).padStart(2, "0")}`,
        },
      };
    case "RECURRING_SHARE":
      return {
        type: insight.type,
        subject: null,
        values: {
          monthlyEquivalent: insight.data.monthlyEquivalent,
          knownMonthlyExpense: insight.data.knownMonthlyExpense,
          percentage: insight.data.percentage,
        },
      };
    case "SPENDING_ANOMALY":
      return {
        type: insight.type,
        subject: sanitizeFinancialContextLabel(insight.data.categoryName),
        values: {
          currentAmount: insight.data.currentAmount,
          baselineMedian: insight.data.baselineMedian,
          difference: insight.data.difference,
          percentageDifference: insight.data.percentageDifference,
          sampleSize: insight.data.sampleSize,
        },
      };
    case "FORECAST_BALANCE":
      return {
        type: insight.type,
        subject: null,
        values: {
          horizonDays: insight.data.horizonDays,
          currentBalance: insight.data.currentBalance,
          projectedBalance: insight.data.projectedBalance,
          difference: insight.data.difference,
        },
      };
    case "SAFE_TO_SPEND":
      return {
        type: insight.type,
        subject: null,
        values: {
          state: insight.data.state,
          safeToSpend: insight.data.safeToSpend,
          realizedBalance: insight.data.realizedBalance,
          pendingExpenses: insight.data.pendingExpenses,
          cardCommitments: insight.data.cardCommitments,
          transferNet: insight.data.transferNet,
          percentageOfRealized: insight.data.percentageOfRealized,
        },
      };
    case "SUBSCRIPTION_PRICE_CHANGE":
      return {
        type: insight.type,
        subject: sanitizeFinancialContextLabel(insight.data.description),
        values: {
          status: insight.data.status,
          previousAmount: insight.data.previousAmount,
          currentAmount: insight.data.currentAmount,
          difference: insight.data.difference,
          percentage: insight.data.percentage,
        },
      };
    case "POSSIBLE_SUBSCRIPTION":
      return {
        type: insight.type,
        subject: sanitizeFinancialContextLabel(insight.data.description),
        values: {
          currentAmount: insight.data.currentAmount,
          monthlyEquivalent: insight.data.monthlyEquivalent,
          occurrenceCount: insight.data.occurrenceCount,
        },
      };
    case "INCOME_CHANGE":
      return {
        type: insight.type,
        subject: null,
        values: {
          currentIncome: insight.data.currentIncome,
          previousIncome: insight.data.previousIncome,
          difference: insight.data.difference,
          percentage: insight.data.percentage,
        },
      };
    case "GOAL_DELAYED":
      return {
        type: insight.type,
        subject: sanitizeFinancialContextLabel(insight.data.goalName),
        values: {
          targetAmount: insight.data.targetAmount,
          currentAmount: insight.data.currentAmount,
          remainingAmount: insight.data.remainingAmount,
        },
      };
  }
}

export function buildFinancialContext(args: {
  dashboard: MonthlyDashboard;
  insights: FinancialInsightsData | null;
  forecast: ForecastData | null;
}): FinancialContext {
  const { dashboard, insights, forecast } = args;

  return {
    period: dashboard.period,
    currency: dashboard.currency,
    summary: {
      income: dashboard.summary.income,
      expense: dashboard.summary.expense,
      balance: dashboard.summary.balance,
    },
    comparison: {
      previousPeriod: dashboard.comparison.previousPeriod,
      incomePercentage: dashboard.comparison.income.percentage,
      expensePercentage: dashboard.comparison.expense.percentage,
      balancePercentage: dashboard.comparison.balance.percentage,
    },
    planning: {
      budget: dashboard.planning.budget,
      realized: dashboard.planning.realized,
      committed: dashboard.planning.committed,
      available: dashboard.planning.available,
      expectedIncome: dashboard.planning.expectedIncome,
      overBudgetCategories: dashboard.planning.overBudgetCategories,
    },
    topCategories: dashboard.categories
      .filter((category) => category.realized > 0)
      .slice()
      .sort((left, right) => right.realized - left.realized)
      .slice(0, LOCAL_ASSISTANT_CATEGORY_LIMIT)
      .map((category) => ({
        name: sanitizeFinancialContextLabel(category.name),
        realized: category.realized,
        sharePercentage: category.sharePercentage,
      })),
    insights: (insights?.items ?? [])
      .slice(0, LOCAL_ASSISTANT_INSIGHT_LIMIT)
      .map(insightFact),
    forecast: forecast
      ? {
          asOf: `${forecast.asOf.year}-${String(forecast.asOf.month).padStart(2, "0")}-${String(forecast.asOf.day).padStart(2, "0")}`,
          horizonEnd: `${forecast.horizonEnd.year}-${String(forecast.horizonEnd.month).padStart(2, "0")}-${String(forecast.horizonEnd.day).padStart(2, "0")}`,
          horizonDays: forecast.horizonDays,
          safeToSpend: forecast.safeToSpend.safeToSpend,
          realizedBalance: forecast.safeToSpend.realizedBalance,
          pendingExpenses: forecast.safeToSpend.pendingExpenses,
          cardCommitments: forecast.safeToSpend.cardCommitments,
          transferNet: forecast.safeToSpend.transferNet,
          overdueCount:
            forecast.overdue.length + forecast.cardCommitments.overdue.length,
          upcomingCount:
            forecast.upcoming.length + forecast.cardCommitments.upcoming.length,
        }
      : null,
    goals: dashboard.goals.slice(0, LOCAL_ASSISTANT_GOAL_LIMIT).map((goal) => ({
      name: sanitizeFinancialContextLabel(goal.name),
      targetAmount: goal.targetAmount,
      currentAmount: goal.currentAmount,
      remainingAmount: goal.remainingAmount,
      percentage: goal.percentage,
      targetDate: goal.targetDate,
    })),
  };
}
