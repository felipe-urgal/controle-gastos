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


export type NetWorthRealReturnStatus =
  | "AVAILABLE"
  | "BASELINE_NOT_POSITIVE"
  | "INFLATION_INCOMPLETE";

export type NetWorthRealReturnData = {
  period: {
    start: NetWorthPeriod;
    end: NetWorthPeriod;
    months: number;
  };
  inflation: {
    seriesCode: 433;
    source: "BCB_SGS";
    sourceLabel: "Banco Central do Brasil · SGS";
    percentage: number | null;
    complete: boolean;
    expectedMonths: number;
    availableMonths: number;
    latestReferenceDate: string | null;
  };
  byCurrency: Array<{
    currency: SupportedCurrency;
    initial: number;
    current: number;
    nominalPercentage: number | null;
    inflationPercentage: number | null;
    realPercentage: number | null;
    status: NetWorthRealReturnStatus;
  }>;
  formula: "(1 + retorno nominal) / (1 + inflação) - 1";
  rounding: "Percentuais arredondados para 6 casas decimais";
};
