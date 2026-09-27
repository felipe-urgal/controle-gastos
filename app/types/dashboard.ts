import type { SupportedCurrency } from '@/app/types/financial-summary';

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
  type: 'CREDIT_DEBIT' | 'INVESTMENT';
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
  currency: SupportedCurrency;
  realized: number;
  sharePercentage: number;
};

export type DashboardMonthlyFlow = DashboardPeriod & DashboardSummary & {
  currency: SupportedCurrency;
};

export type DashboardCreditCard = {
  id: string;
  name: string;
  currency: SupportedCurrency;
  color: string;
  icon: string;
  creditLimit: number;
  usedLimit: number;
  availableLimit: number;
  overLimit: number;
  nextStatement: {
    amount: number;
    closingDate: DashboardPeriod & { day: number };
    dueDate: DashboardPeriod & { day: number };
    transactionCount: number;
  } | null;
};

export type DashboardFinancialGoal = {
  id: string;
  name: string;
  currency: SupportedCurrency;
  targetAmount: number;
  currentAmount: number;
  remainingAmount: number;
  percentage: number;
  targetDate: string | null;
  monthlyContributionSuggestion: number | null;
};

export type DashboardCategoryLimit = {
  category: {
    id: string;
    name: string;
    color: string;
    icon: string;
  };
  currency: SupportedCurrency;
  amount: number;
  realized: number;
  committed: number;
  consumption: number;
  remaining: number;
  available: number;
  percentage: number;
  planningPercentage: number | null;
  isOverBudget: boolean;
};

export type MonthlyDashboard = {
  period: DashboardPeriod;
  currency: SupportedCurrency;
  summary: DashboardSummary;
  comparison: DashboardComparison;
  accounts: DashboardAccountBalance[];
  cards: DashboardCreditCard[];
  goals: DashboardFinancialGoal[];
  categories: DashboardCategorySpending[];
  flow: DashboardMonthlyFlow[];
  limits: DashboardCategoryLimit[];
  planning: {
    budget: number;
    realized: number;
    committed: number;
    available: number;
    overBudgetCategories: number;
    realizedIncome: number;
    expectedIncome: number;
    totalIncome: number;
  };
};
