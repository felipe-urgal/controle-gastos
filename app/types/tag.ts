import type { SupportedCurrency } from "@/app/types/financial-summary";

export type TagDTO = {
  id: string;
  name: string;
  isActive: boolean;
  transactionCount: number;
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

export type TagReport = {
  tag: { id: string; name: string };
  currencies: TagReportCurrency[];
};
