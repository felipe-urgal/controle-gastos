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
export type InvestmentFiscalEventType =
  | "BUY"
  | "SELL"
  | "CUSTODY_TRANSFER_IN"
  | "CUSTODY_TRANSFER_OUT"
  | "BONUS"
  | "SPLIT"
  | "REVERSE_SPLIT"
  | "OTHER";
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
  fiscalEvent: {
    id: string;
    type: InvestmentFiscalEventType;
    originalType: InvestmentFiscalEventType;
    classificationSource: "SYSTEM" | "USER";
    sourceInstitution: string | null;
    destinationInstitution: string | null;
    reclassificationNote: string | null;
    updatedAt: string;
  } | null;
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

export type InvestmentFiscalPosition = {
  assetId: string;
  symbol: string;
  name: string | null;
  assetType: InvestmentAssetType;
  currency: SupportedCurrency;
  quantity: string;
  economicQuantity: string;
  costBasisCents: number;
  averageUnitCostCents: number | null;
  economicCostCents: number;
  marketValueCents: number | null;
  status: "OK" | "PENDING";
  pending: Array<{
    code:
      | "MISSING_OPERATION_VALUE"
      | "INSUFFICIENT_FISCAL_POSITION"
      | "UNSUPPORTED_FISCAL_EVENT"
      | "FISCAL_QUANTITY_MISMATCH";
    eventId: string | null;
    message: string;
  }>;
  lastAdjustmentId: string | null;
};

export type InvestmentFiscalCostAdjustment = {
  id: string;
  assetId: string;
  symbol: string;
  quantity: string;
  costBasisCents: number;
  date: string;
  reason: string;
  sourceInstitution: string | null;
  createdAt: string;
};

export type InvestmentPortfolio = {
  accounts: InvestmentAccountOption[];
  assets: InvestmentAsset[];
  positions: InvestmentPosition[];
  fiscalPositions: InvestmentFiscalPosition[];
  fiscalCostAdjustments: InvestmentFiscalCostAdjustment[];
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


export type InvestmentFiscalSnapshotItem = {
  assetId: string;
  symbol: string;
  name: string | null;
  assetType: InvestmentAssetType;
  currency: SupportedCurrency;
  quantity: string;
  economicQuantity: string;
  costBasisCents: number;
  averageUnitCostCents: number | null;
  status: "OK" | "PENDING";
  pending: Array<{
    code:
      | "MISSING_OPERATION_VALUE"
      | "INSUFFICIENT_FISCAL_POSITION"
      | "UNSUPPORTED_FISCAL_EVENT"
      | "FISCAL_QUANTITY_MISMATCH";
    eventId: string | null;
    message: string;
  }>;
  institutions: string[];
};

export type InvestmentFiscalSnapshotPeriod = {
  year: number;
  referenceDate: string;
  items: InvestmentFiscalSnapshotItem[];
  totalsByCurrency: Partial<Record<SupportedCurrency, number>>;
};

export type InvestmentFiscalYearEndSnapshot = {
  current: InvestmentFiscalSnapshotPeriod;
  previous: InvestmentFiscalSnapshotPeriod;
  comparison: Array<{
    assetId: string;
    symbol: string;
    currency: SupportedCurrency;
    previousQuantity: string;
    currentQuantity: string;
    previousCostBasisCents: number;
    currentCostBasisCents: number;
    status: "OK" | "PENDING";
  }>;
};


export type InvestmentAnnualIncomeReport = {
  year: number;
  eventCount: number;
  groupCount: number;
  totalsByCurrency: Partial<Record<SupportedCurrency, number>>;
  totalsByTypeAndCurrency: Partial<
    Record<SupportedCurrency, Partial<Record<InvestmentIncomeType, number>>>
  >;
  status: "OK" | "PENDING";
  pending: Array<{
    code: "UNCLASSIFIED_INCOME_TYPE";
    assetId: string;
    symbol: string;
    incomeType: InvestmentIncomeType;
    institutionId: string;
    institutionName: string;
    message: string;
  }>;
  items: Array<{
    assetId: string;
    symbol: string;
    name: string | null;
    assetType: InvestmentAssetType;
    currency: SupportedCurrency;
    incomeType: InvestmentIncomeType;
    institutionId: string;
    institutionName: string;
    eventCount: number;
    netAmountCents: number;
    pending: Array<{
      code: "UNCLASSIFIED_INCOME_TYPE";
      message: string;
    }>;
    events: Array<{
      id: string;
      date: string;
      quantity: string;
      unitValueCents: number;
      netAmountCents: number;
      note: string | null;
    }>;
  }>;
};


export type InvestmentRealizedSale = {
  eventId: string;
  assetId: string;
  symbol: string;
  assetType: InvestmentAssetType;
  currency: SupportedCurrency;
  year: number;
  month: number;
  day: number;
  quantity: string;
  grossProceedsCents: number;
  feesCents: number;
  netProceedsCents: number;
  allocatedCostCents: number;
  realizedResultCents: number;
  status: "OK" | "PENDING";
  pending: string[];
};

export type InvestmentRealizedResultReport = {
  year: number;
  saleCount: number;
  groupCount: number;
  status: "OK" | "PENDING";
  pending: Array<{
    eventId: string;
    assetId: string;
    symbol: string;
    month: number;
    assetType: InvestmentAssetType;
    currency: SupportedCurrency;
    message: string;
  }>;
  monthlyGroups: Array<{
    year: number;
    month: number;
    assetType: InvestmentAssetType;
    currency: SupportedCurrency;
    saleCount: number;
    grossProceedsCents: number;
    feesCents: number;
    netProceedsCents: number;
    allocatedCostCents: number;
    realizedResultCents: number;
    status: "OK" | "PENDING";
    sales: InvestmentRealizedSale[];
  }>;
};


export type InvestmentTaxLossLedgerRow = {
  year: number;
  month: number;
  assetType: InvestmentAssetType;
  currency: SupportedCurrency;
  openingLossCents: number;
  realizedResultCents: number;
  generatedLossCents: number;
  compensatedLossCents: number;
  taxableResultAfterCompensationCents: number;
  closingLossCents: number;
  status: "OK" | "PENDING";
  adjustment: {
    id: string;
    amountCents: number;
    reason: string;
  } | null;
};

export type InvestmentTaxLossReport = {
  year: number;
  strategy: "EXACT_ASSET_TYPE_V1";
  status: "OK" | "PENDING";
  pending: Array<{
    year: number;
    month: number;
    assetType: InvestmentAssetType;
    currency: SupportedCurrency;
    message: string;
  }>;
  rows: InvestmentTaxLossLedgerRow[];
  closingBalances: Array<{
    assetType: InvestmentAssetType;
    currency: SupportedCurrency;
    closingLossCents: number;
  }>;
  adjustments: Array<{
    id: string;
    assetType: InvestmentAssetType;
    currency: SupportedCurrency;
    amountCents: number;
    year: number;
    month: number;
    reason: string;
    createdAt: string;
  }>;
};


export type InvestmentTaxWithholding = {
  id: string;
  assetType: InvestmentAssetType;
  currency: SupportedCurrency;
  amountCents: number;
  year: number;
  month: number;
  day: number;
  source: "MANUAL" | "IMPORT";
  note: string | null;
  assetId: string | null;
  operationId: string | null;
  createdAt: string;
};

export type InvestmentTaxPayment = {
  id: string;
  assetType: InvestmentAssetType;
  currency: SupportedCurrency;
  amountCents: number;
  competenceYear: number;
  competenceMonth: number;
  code: string;
  paidYear: number;
  paidMonth: number;
  paidDay: number;
  note: string | null;
  receiptReference: string | null;
  createdAt: string;
};

export type InvestmentTaxControlReport = {
  year: number;
  status: "PENDING" | "WAITING_RULES";
  ruleDependency: "#742";
  totalsByCurrency: Partial<
    Record<
      SupportedCurrency,
      {
        withholdingCents: number;
        paidDarfCents: number;
      }
    >
  >;
  rows: Array<{
    year: number;
    month: number;
    assetType: InvestmentAssetType;
    currency: SupportedCurrency;
    taxableResultAfterCompensationCents: number;
    withholdingCents: number;
    paidDarfCents: number;
    taxDueCents: null;
    openTaxBalanceCents: null;
    status: "WAITING_RULES" | "PENDING_APURACAO";
    withholdings: InvestmentTaxWithholding[];
    payments: InvestmentTaxPayment[];
  }>;
};
