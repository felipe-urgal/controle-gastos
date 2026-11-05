import type { SupportedCurrency } from "@/app/types/financial-summary";

export type TagDTO = {
  id: string;
  name: string;
  isActive: boolean;
  /** Orçamento do projeto (valor e moeda juntos, ou ambos nulos). */
  budgetAmount: number | null;
  budgetCurrency: SupportedCurrency | null;
  transactionCount: number;
  /** Despesa do mês atual por moeda; só vem na listagem. */
  monthExpenses?: Array<{ currency: SupportedCurrency; expense: number }>;
  createdAt: string;
  updatedAt: string;
};

export type TagReportCurrency = {
  currency: SupportedCurrency;
  transactionCount: number;
  income: number;
  expense: number;
  balance: number;
};

export type TagReportPeriod = "month" | "year" | "all";

export type TagReportHistory = {
  currency: SupportedCurrency;
  /** Seis meses, do mais antigo para o atual. */
  points: Array<{ year: number; month: number; income: number; expense: number }>;
};

export type TagBudgetStatus = {
  currency: SupportedCurrency;
  amount: number;
  /** Despesa líquida da tag, em toda a vida, na moeda do orçamento. */
  spent: number;
  /** Quanto ainda cabe; negativo quando estourou. */
  remaining: number;
  /** Consumo arredondado (pode passar de 100). */
  percentage: number;
  over: boolean;
};

export type TagReport = {
  tag: { id: string; name: string };
  /** Orçamento do projeto contra a despesa de toda a vida da tag; `null` sem orçamento. */
  budget: TagBudgetStatus | null;
  period: TagReportPeriod;
  currencies: TagReportCurrency[];
  history: TagReportHistory[];
};
