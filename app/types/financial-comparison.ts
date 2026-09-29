import type { SupportedCurrency } from '@/app/types/financial-summary';

export type ComparisonMonth = { year: number; month: number };
export type ComparisonRange = { from: ComparisonMonth; to: ComparisonMonth };

export type FinancialComparisonSide = {
  range: ComparisonRange;
  months: number;
  income: number;
  expense: number;
  balance: number;
  averageMonthlyExpense: number;
  netWorthEnd: number | null;
  categories: Array<{ id: string; name: string; color: string; icon: string; amount: number }>;
};

export type FinancialComparisonMetric = { difference: number; percentage: number | null };

export type FinancialComparisonData = {
  currency: SupportedCurrency;
  a: FinancialComparisonSide;
  b: FinancialComparisonSide;
  difference: {
    income: FinancialComparisonMetric;
    expense: FinancialComparisonMetric;
    balance: FinancialComparisonMetric;
    averageMonthlyExpense: FinancialComparisonMetric;
    netWorthEnd: FinancialComparisonMetric | null;
  };
  categories: Array<{
    id: string;
    name: string;
    color: string;
    icon: string;
    a: number;
    b: number;
    difference: FinancialComparisonMetric;
  }>;
};
