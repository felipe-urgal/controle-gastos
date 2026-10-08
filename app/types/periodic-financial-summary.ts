import type { SupportedCurrency } from '@/app/types/financial-summary';

export type PeriodicSummaryFrequency = 'WEEKLY';
export type PeriodicSummaryLogicalDate = { year: number; month: number; day: number };

/** Snapshot congelado da semana concluída. Dados futuros pertencem ao Dashboard atual. */
export type PeriodicFinancialSummaryContent = {
  frequency: PeriodicSummaryFrequency;
  currency: SupportedCurrency;
  period: {
    start: PeriodicSummaryLogicalDate;
    end: PeriodicSummaryLogicalDate;
  };
  totals: { income: number; expense: number; balance: number };
  topCategories: Array<{
    categoryId: string;
    categoryName: string;
    amount: number;
  }>;
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
