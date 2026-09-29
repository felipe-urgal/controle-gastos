import type { DashboardComparison, DashboardPeriod, DashboardSummary } from '@/app/types/dashboard';
import type { SupportedCurrency } from '@/app/types/financial-summary';

export type MonthlyClosingData = {
  period: DashboardPeriod;
  currency: SupportedCurrency;
  summary: DashboardSummary;
  comparison: DashboardComparison;
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
  topCategories: Array<{
    id: string;
    name: string;
    color: string;
    icon: string;
    realized: number;
    sharePercentage: number;
  }>;
  netWorth: {
    previous: number;
    current: number;
    difference: number;
  } | null;
};
