import type { SupportedCurrency } from "@/app/types/financial-summary";

export type LocalAssistantInsightFact = {
  type: string;
  subject: string | null;
  values: Record<string, number | string | null>;
};

export type FinancialContext = {
  period: { year: number; month: number };
  currency: SupportedCurrency;
  summary: {
    income: number;
    expense: number;
    balance: number;
  };
  comparison: {
    previousPeriod: { year: number; month: number };
    incomePercentage: number | null;
    expensePercentage: number | null;
    balancePercentage: number | null;
  };
  planning: {
    budget: number;
    realized: number;
    committed: number;
    available: number;
    expectedIncome: number;
    overBudgetCategories: number;
  };
  topCategories: Array<{
    name: string;
    realized: number;
    sharePercentage: number;
  }>;
  insights: LocalAssistantInsightFact[];
  forecast: {
    asOf: string;
    horizonEnd: string;
    horizonDays: number;
    safeToSpend: number;
    realizedBalance: number;
    pendingExpenses: number;
    cardCommitments: number;
    transferNet: number;
    overdueCount: number;
    upcomingCount: number;
  } | null;
  goals: Array<{
    name: string;
    targetAmount: number;
    currentAmount: number;
    remainingAmount: number;
    percentage: number;
    targetDate: string | null;
  }>;
};

export type LocalAssistantProgress = {
  progress: number;
  text: string;
};
