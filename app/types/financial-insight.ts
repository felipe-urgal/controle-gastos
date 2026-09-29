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

export type FinancialInsight =
  | CategoryBudgetInsight
  | UpcomingPendingInsight
  | RecurringShareInsight
  | SpendingAnomalyInsight
  | ForecastBalanceInsight;

export type FinancialInsightsData = {
  period: FinancialInsightPeriod;
  currency: SupportedCurrency;
  items: FinancialInsight[];
  limit: number;
};
