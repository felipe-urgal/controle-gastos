import type { FinancialInsight } from '@/app/types/financial-insight';
import type { SupportedCurrency } from '@/app/types/financial-summary';

export type PeriodicSummaryFrequency = 'WEEKLY';

export type PeriodicSummaryLogicalDate = {
  year: number;
  month: number;
  day: number;
};

export type PeriodicFinancialSummaryContent = {
  frequency: PeriodicSummaryFrequency;
  currency: SupportedCurrency;
  period: {
    start: PeriodicSummaryLogicalDate;
    end: PeriodicSummaryLogicalDate;
  };
  totals: {
    income: number;
    expense: number;
    balance: number;
  };
  topCategories: Array<{
    categoryId: string;
    categoryName: string;
    amount: number;
  }>;
  upcomingCommitments: {
    count: number;
    amount: number;
    through: PeriodicSummaryLogicalDate;
    items: Array<{
      id: string;
      description: string;
      amount: number;
      dueDate: PeriodicSummaryLogicalDate;
      source: 'TRANSACTION' | 'CARD_STATEMENT';
    }>;
  };
  insights: FinancialInsight[];
  safeToSpend: {
    realizedBalance: number;
    pendingExpenses: number;
    cardCommitments: number;
    transferNet: number;
    safeToSpend: number;
  } | null;
  subscriptions: {
    priceChanges: Array<{
      id: string;
      description: string;
      previousAmount: number;
      currentAmount: number;
      difference: number;
      percentage: number;
    }>;
    possibleNewCount: number;
  };
};

export type PeriodicFinancialSummary = {
  id: string;
  generatedAt: string;
  content: PeriodicFinancialSummaryContent;
};

export type PeriodicFinancialSummaryState = {
  enabled: boolean;
  frequency: PeriodicSummaryFrequency;
  summary: PeriodicFinancialSummary | null;
};
