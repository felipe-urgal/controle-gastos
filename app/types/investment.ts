import type { SupportedCurrency } from "@/app/types/financial-summary";

export type InvestmentAssetType =
  | "STOCK"
  | "FII"
  | "ETF"
  | "FIXED_INCOME"
  | "CRYPTO"
  | "FUND"
  | "OTHER";

export type InvestmentOperationType = "BUY" | "SELL";
export type InvestmentIncomeType = "INCOME" | "DIVIDEND" | "INTEREST" | "OTHER";

export type InvestmentQuote = {
  priceCents: number;
  currency: SupportedCurrency;
  referenceAt: string;
  fetchedAt: string;
  source: "BRAPI";
  isStale: boolean;
};

export type InvestmentAsset = {
  id: string;
  symbol: string;
  name: string | null;
  type: InvestmentAssetType;
  currency: SupportedCurrency;
  market: string | null;
  operationCount: number;
  incomeCount: number;
  createdAt: string;
  updatedAt: string;
};

export type InvestmentAccountOption = {
  id: string;
  name: string;
  currency: SupportedCurrency;
  isActive: boolean;
  color: string | null;
  icon: string | null;
};

export type InvestmentOperation = {
  id: string;
  type: InvestmentOperationType;
  quantity: string;
  unitPriceCents: number;
  feesCents: number;
  date: string;
  note: string | null;
  account: {
    id: string;
    name: string;
    currency: SupportedCurrency;
  };
  asset: {
    id: string;
    symbol: string;
    name: string | null;
    type: InvestmentAssetType;
    currency: SupportedCurrency;
  };
  createdAt: string;
};

export type InvestmentIncome = {
  id: string;
  type: InvestmentIncomeType;
  quantity: string;
  unitValueCents: number;
  netAmountCents: number;
  date: string;
  note: string | null;
  account: {
    id: string;
    name: string;
    currency: SupportedCurrency;
  };
  asset: {
    id: string;
    symbol: string;
    name: string | null;
    type: InvestmentAssetType;
    currency: SupportedCurrency;
  };
  createdAt: string;
};

export type InvestmentPosition = {
  accountId: string;
  accountName: string;
  assetId: string;
  symbol: string;
  name: string | null;
  assetType: InvestmentAssetType;
  currency: SupportedCurrency;
  quantity: string;
  investedCents: number;
  averageUnitCostCents: number;
  marketValueCents: number | null;
  quote: InvestmentQuote | null;
};

export type InvestmentPortfolio = {
  accounts: InvestmentAccountOption[];
  assets: InvestmentAsset[];
  positions: InvestmentPosition[];
  totalsByCurrency: Partial<Record<SupportedCurrency, number>>;
  incomeTotalsByCurrency: Partial<Record<SupportedCurrency, number>>;
  operations: InvestmentOperation[];
  incomes: InvestmentIncome[];
};

export type InvestmentQuoteRefreshResult = {
  refreshed: number;
  cached: number;
  failed: Array<{
    assetId: string;
    symbol: string;
    message: string;
  }>;
};
