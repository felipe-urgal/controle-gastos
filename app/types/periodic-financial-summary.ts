import type { SupportedCurrency } from '@/app/types/financial-summary';

export type PeriodicSummaryFrequency = 'WEEKLY';
export type PeriodicSummaryLogicalDate = { year: number; month: number; day: number };

/**
 * Versão do formato/algoritmo do snapshot. Linhas sem versão são a v1 legada
 * (crédito de cartão tratado como receita) e permanecem imutáveis.
 */
export const PERIODIC_SUMMARY_CONTENT_VERSION = 2;

/** Snapshot congelado da semana concluída. Dados futuros pertencem ao Dashboard atual. */
export type PeriodicFinancialSummaryContent = {
  contentVersion: number;
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
