export type DashboardPeriod = {
  year: number;
  month: number;
};

export type DashboardSummary = {
  income: number;
  expense: number;
  balance: number;
};

export type DashboardComparisonMetric = {
  difference: number;
  percentage: number | null;
};

export type DashboardComparison = {
  previousPeriod: DashboardPeriod;
  income: DashboardComparisonMetric;
  expense: DashboardComparisonMetric;
  balance: DashboardComparisonMetric;
};

export type DashboardAccountBalance = {
  id: string;
  name: string;
  currency: string;
  isActive: boolean;
  color: string;
  icon: string;
  balance: number;
};

export type DashboardCategorySpending = {
  id: string;
  name: string;
  color: string;
  icon: string;
  realized: number;
  sharePercentage: number;
};

export type DashboardMonthlyFlow = DashboardPeriod & DashboardSummary;

export type DashboardCategoryLimit = {
  category: {
    id: string;
    name: string;
    color: string;
    icon: string;
  };
  amount: number;
  realized: number;
  remaining: number;
  percentage: number;
};

export type MonthlyDashboard = {
  period: DashboardPeriod;
  summary: DashboardSummary;
  comparison: DashboardComparison;
  accounts: DashboardAccountBalance[];
  categories: DashboardCategorySpending[];
  flow: DashboardMonthlyFlow[];
  limits: DashboardCategoryLimit[];
};
