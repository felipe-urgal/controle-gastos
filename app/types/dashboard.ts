import type { FinancialCommitmentsData } from '@/app/types/financial-commitment';
import type { FinancialInsightsData } from '@/app/types/financial-insight';
import type { SupportedCurrency } from '@/app/types/financial-summary';
import type { ForecastData, ForecastLogicalDate } from '@/app/types/forecast';
import type {
  TransactionKind,
  TransactionStatus,
  TransactionType,
  TransferRole,
} from '@/app/types/transaction';

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

export type DashboardSection<T> =
  | {
      status: 'SUCCESS';
      data: T;
    }
  | {
      status: 'ERROR';
      message: string;
    };

export type DashboardPeriodRelation = 'PAST' | 'CURRENT' | 'FUTURE';

export type DashboardCashAccount = {
  id: string;
  name: string;
  currency: SupportedCurrency;
  color: string;
  icon: string;
  balance: number;
};

export type DashboardRecentTransaction = {
  id: string;
  amount: number;
  type: TransactionType;
  kind: TransactionKind;
  description: string;
  status: TransactionStatus;
  year: number;
  month: number;
  day: number;
  transferRole: TransferRole | null;
  account: {
    id: string;
    name: string;
    currency: SupportedCurrency;
  };
  counterpartAccount: {
    id: string;
    name: string;
    currency: SupportedCurrency;
  } | null;
  category: {
    id: string;
    name: string;
    color: string;
    icon: string;
  } | null;
};

export type DashboardNetWorthSummary = {
  currency: SupportedCurrency;
  total: number | null;
  accountCount: number;
};

export type DashboardHome = {
  monthly: MonthlyDashboard;
  scope: {
    selectedPeriod: DashboardPeriod;
    selectedPeriodRelation: DashboardPeriodRelation;
    currentAsOf: ForecastLogicalDate;
  };
  current: {
    cash: {
      total: number;
      accounts: DashboardCashAccount[];
    };
    forecast: DashboardSection<ForecastData>;
    commitments: DashboardSection<FinancialCommitmentsData>;
  };
  recentTransactions: DashboardSection<DashboardRecentTransaction[]>;
  netWorth: DashboardSection<DashboardNetWorthSummary>;
  insights: DashboardSection<FinancialInsightsData>;
};
