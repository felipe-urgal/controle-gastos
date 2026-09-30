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

export type NetWorthDebt = {
  id: string;
  name: string;
  currency: SupportedCurrency;
  balance: number;
  institution: string | null;
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
  assetsTotals: Partial<Record<SupportedCurrency, number>>;
  liabilitiesTotals: Partial<Record<SupportedCurrency, number>>;
  totals: Partial<Record<SupportedCurrency, number>>;
  byCurrency: Array<{
    currency: SupportedCurrency;
    assetsTotal: number;
    liabilitiesTotal: number;
    total: number;
    accounts: NetWorthAccount[];
    debts: NetWorthDebt[];
  }>;
  history: NetWorthHistoryPoint[];
  consolidation: (CurrencyConsolidationResult & {
    referenceDate: { year: number; month: number; day: number };
  }) | null;
};
