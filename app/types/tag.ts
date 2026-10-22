import type { SupportedCurrency } from "@/app/types/financial-summary";

export type TagDTO = {
  id: string;
  name: string;
  isActive: boolean;
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

export type TagReport = {
  tag: { id: string; name: string };
  period: TagReportPeriod;
  currencies: TagReportCurrency[];
  history: TagReportHistory[];
};
