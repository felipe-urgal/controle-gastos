import type { CurrencyConsolidationResult } from "@/app/types/exchange-rate";
import type { SupportedCurrency } from "@/app/types/financial-summary";

export type NetWorthAccount = {
  id: string;
  name: string;
  type: "CREDIT_DEBIT" | "INVESTMENT";
  currency: SupportedCurrency;
  isActive: boolean;
  color: string | null;
  icon: string | null;
  balance: number;
};

export type NetWorthPeriod = {
  year: number;
  month: number;
};

export type NetWorthHistoryPoint = NetWorthPeriod & {
  totals: Partial<Record<SupportedCurrency, number>>;
};

export type NetWorthData = {
  end: NetWorthPeriod;
  months: number;
  periods: NetWorthPeriod[];
  totals: Partial<Record<SupportedCurrency, number>>;
  byCurrency: Array<{
    currency: SupportedCurrency;
    total: number;
    accounts: NetWorthAccount[];
  }>;
  history: NetWorthHistoryPoint[];
  consolidation: (CurrencyConsolidationResult & {
    referenceDate: { year: number; month: number; day: number };
  }) | null;
};
