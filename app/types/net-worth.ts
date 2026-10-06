import type { CurrencyConsolidationResult } from "@/app/types/exchange-rate";
import type { SupportedCurrency } from "@/app/types/financial-summary";

export type NetWorthLogicalDate = {
  year: number;
  month: number;
  day: number;
};

export type NetWorthValuationBasis =
  | "TRANSACTION_BALANCE"
  | "POSITION_COST"
  | "POSITION_MARKET"
  | "MIXED";

export type NetWorthValuationQuality = {
  basis: NetWorthValuationBasis;
  asOf: NetWorthLogicalDate;
  positionAccountCount: number;
  positionCount: number;
  marketPositionCount: number;
  costPositionCount: number;
  staleMarketPositionCount: number;
  quoteCoveragePercentage: number;
  oldestQuoteReferenceAt: string | null;
  latestQuoteReferenceAt: string | null;
  comparableToHistory: boolean;
};

export type NetWorthAccount = {
  id: string;
  name: string;
  type: "CREDIT_DEBIT" | "INVESTMENT";
  currency: SupportedCurrency;
  isActive: boolean;
  color: string | null;
  icon: string | null;
  balance: number;
  cashBalance?: number;
  valuationBasis: NetWorthValuationBasis;
  positionCount?: number;
  marketPositionCount?: number;
  costPositionCount?: number;
  staleMarketPositionCount?: number;
  quoteCoveragePercentage?: number;
  oldestQuoteReferenceAt?: string | null;
  latestQuoteReferenceAt?: string | null;
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
  asOf: NetWorthLogicalDate;
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
    valuation: NetWorthValuationQuality;
    accounts: NetWorthAccount[];
    debts: NetWorthDebt[];
  }>;
  history: NetWorthHistoryPoint[];
  historyValuation: {
    basis: "TRANSACTION_BALANCE";
    currentPointAsOf: NetWorthLogicalDate;
    description: string;
  };
  consolidation: (CurrencyConsolidationResult & {
    referenceDate: NetWorthLogicalDate;
  }) | null;
  realEvolution?: {
    data: NetWorthRealReturnData | null;
    error: string | null;
  };
};

export type NetWorthRealReturnStatus =
  | "AVAILABLE"
  | "BASELINE_NOT_POSITIVE"
  | "INFLATION_INCOMPLETE"
  | "NOMINAL_ONLY";

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
  semantic: "EVOLUCAO_PATRIMONIAL";
};
