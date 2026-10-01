import type { SupportedCurrency } from '@/app/types/financial-summary';

export type FinancialInsightPeriod = {
  year: number;
  month: number;
};

export type FinancialInsightLogicalDate = FinancialInsightPeriod & {
  day: number;
};

type FinancialInsightBase = {
  id: string;
  period: FinancialInsightPeriod;
  currency: SupportedCurrency;
  message: string;
  href: string | null;
};

export type CategoryBudgetInsight = FinancialInsightBase & {
  type: 'CATEGORY_BUDGET';
  data: {
    categoryId: string;
    categoryName: string;
    state: 'NEAR' | 'OVER';
    budget: number;
    consumption: number;
    percentage: number;
  };
};

export type UpcomingPendingInsight = FinancialInsightBase & {
  type: 'UPCOMING_PENDING';
  data: {
    count: number;
    amount: number;
    from: FinancialInsightLogicalDate;
    through: FinancialInsightLogicalDate;
  };
};

export type RecurringShareInsight = FinancialInsightBase & {
  type: 'RECURRING_SHARE';
  data: {
    monthlyEquivalent: number;
    knownMonthlyExpense: number;
    percentage: number;
  };
};

export type SpendingAnomalyInsight = FinancialInsightBase & {
  type: 'SPENDING_ANOMALY';
  data: {
    categoryId: string;
    categoryName: string;
    currentAmount: number;
    baselineMedian: number;
    difference: number;
    percentageDifference: number;
    sampleSize: number;
    baselineMad: number;
    modifiedZScore: number | null;
    rule: 'MODIFIED_Z_SCORE' | 'ZERO_MAD_MATERIAL_INCREASE';
  };
};

export type ForecastBalanceInsight = FinancialInsightBase & {
  type: 'FORECAST_BALANCE';
  data: {
    horizonDays: 30;
    currentBalance: number;
    projectedBalance: number;
    difference: number;
  };
};

export type SafeToSpendInsight = FinancialInsightBase & {
  type: 'SAFE_TO_SPEND';
  data: {
    horizonDays: 30;
    state: 'LOW' | 'NEGATIVE';
    safeToSpend: number;
    realizedBalance: number;
    pendingExpenses: number;
    cardCommitments: number;
    transferNet: number;
    percentageOfRealized: number | null;
  };
};

export type SubscriptionPriceChangeInsight = FinancialInsightBase & {
  type: 'SUBSCRIPTION_PRICE_CHANGE';
  data: {
    subscriptionId: string;
    description: string;
    status: 'CONFIRMED' | 'POSSIBLE';
    previousAmount: number;
    currentAmount: number;
    difference: number;
    percentage: number;
  };
};

export type PossibleSubscriptionInsight = FinancialInsightBase & {
  type: 'POSSIBLE_SUBSCRIPTION';
  data: {
    subscriptionId: string;
    description: string;
    currentAmount: number;
    monthlyEquivalent: number;
    occurrenceCount: number;
    nextCharge: FinancialInsightLogicalDate;
  };
};

export type IncomeChangeInsight = FinancialInsightBase & {
  type: 'INCOME_CHANGE';
  data: {
    currentIncome: number;
    previousIncome: number;
    difference: number;
    percentage: number;
    previousPeriod: FinancialInsightPeriod;
  };
};

export type GoalDelayedInsight = FinancialInsightBase & {
  type: 'GOAL_DELAYED';
  data: {
    goalId: string;
    goalName: string;
    targetAmount: number;
    currentAmount: number;
    remainingAmount: number;
    targetDate: FinancialInsightLogicalDate;
  };
};

export type FinancialInsight =
  | CategoryBudgetInsight
  | UpcomingPendingInsight
  | RecurringShareInsight
  | SpendingAnomalyInsight
  | ForecastBalanceInsight
  | SafeToSpendInsight
  | SubscriptionPriceChangeInsight
  | PossibleSubscriptionInsight
  | IncomeChangeInsight
  | GoalDelayedInsight;

export type FinancialInsightsData = {
  period: FinancialInsightPeriod;
  currency: SupportedCurrency;
  items: FinancialInsight[];
  limit: number;
};
