import type { SupportedCurrency } from '@/app/types/financial-summary';

export type ComparisonMonth = { year: number; month: number };
export type ComparisonRange = { from: ComparisonMonth; to: ComparisonMonth };
export type ComparisonLogicalDate = { year: number; month: number; day: number };

export type FinancialComparisonCategorySide = {
  amount: number;
  averageMonthlyAmount: number;
};

export type FinancialComparisonSide = {
  range: ComparisonRange;
  months: number;
  income: number;
  expense: number;
  balance: number;
  averageMonthlyIncome: number;
  averageMonthlyExpense: number;
  averageMonthlyBalance: number;
  netWorthEnd: number | null;
  netWorthAsOf: ComparisonLogicalDate;
  categories: Array<{
    id: string;
    name: string;
    color: string;
    icon: string;
    amount: number;
    averageMonthlyAmount: number;
  }>;
};

export type FinancialComparisonMetric = {
  difference: number;
  percentage: number | null;
};

export type FinancialComparisonData = {
  currency: SupportedCurrency;
  asOf: ComparisonLogicalDate;
  coverage: {
    sameLength: boolean;
    overlaps: boolean;
  };
  netWorthMethodology: {
    basis: 'TRANSACTION_BALANCE';
    description: string;
  };
  a: FinancialComparisonSide;
  b: FinancialComparisonSide;
  difference: {
    income: FinancialComparisonMetric;
    expense: FinancialComparisonMetric;
    balance: FinancialComparisonMetric;
    averageMonthlyIncome: FinancialComparisonMetric;
    averageMonthlyExpense: FinancialComparisonMetric;
    averageMonthlyBalance: FinancialComparisonMetric;
    netWorthEnd: FinancialComparisonMetric | null;
  };
  categories: Array<{
    id: string;
    name: string;
    color: string;
    icon: string;
    a: FinancialComparisonCategorySide;
    b: FinancialComparisonCategorySide;
    difference: FinancialComparisonMetric;
    averageDifference: FinancialComparisonMetric;
  }>;
};
