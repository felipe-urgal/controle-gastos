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


export type AnnualFinancialStatementPosition = {
  type: "CASH" | "FIXED_INCOME" | "FII" | "CRYPTO" | "OTHER";
  symbol: string | null;
  description: string;
  currency: SupportedCurrency;
  previousYearQuantity: string | null;
  currentYearQuantity: string | null;
  previousYearCostCents: number | null;
  currentYearCostCents: number | null;
  previousYearBalanceCents: number | null;
  currentYearBalanceCents: number | null;
  sourceInstitution: string | null;
  sourceInstitutionCnpj: string | null;
  category: string | null;
};

export type AnnualFinancialStatementIncome = {
  symbol: string | null;
  description: string;
  incomeType: InvestmentIncomeType;
  currency: SupportedCurrency;
  amountCents: number | null;
  payerName: string | null;
  payerCnpj: string | null;
  category: string | null;
};

export type AnnualFinancialTaxStatementPreview = {
  calendarYear: number;
  sourceInstitution: string;
  sourceInstitutionCnpj: string | null;
  documentType: "NUBANK_ANNUAL_FINANCIAL_STATEMENT";
  positions: AnnualFinancialStatementPosition[];
  incomes: AnnualFinancialStatementIncome[];
  taxWithholdings: Array<{
    symbol: string | null;
    description: string;
    currency: SupportedCurrency;
    amountCents: number | null;
  }>;
  notes: string[];
  warnings: string[];
  errors: string[];
  fingerprint: string;
  duplicate: boolean;
};

export type AnnualFinancialTaxStatement = {
  id: string;
  calendarYear: number;
  sourceInstitution: string;
  sourceInstitutionCnpj: string | null;
  documentType: string;
  positions: AnnualFinancialStatementPosition[];
  incomes: AnnualFinancialStatementIncome[];
  taxWithholdings: Array<{
    symbol: string | null;
    description: string;
    currency: SupportedCurrency;
    amountCents: number | null;
  }>;
  notes: string[];
  warnings: string[];
  createdAt: string;
};

export type AnnualStatementReconciliationStatus =
  | "MATCHED"
  | "MISMATCH"
  | "MISSING_INTERNAL"
  | "MISSING_STATEMENT_DATA"
  | "REVIEW_REQUIRED";

export type AnnualFinancialStatementReconciliation = {
  year: number;
  statementCount: number;
  status: "MATCHED" | "REVIEW_REQUIRED";
  summary: {
    positions: {
      total: number;
      matched: number;
      mismatch: number;
      missingInternal: number;
      missingStatementData: number;
      reviewRequired: number;
    };
    incomes: {
      total: number;
      matched: number;
      mismatch: number;
      missingInternal: number;
      missingStatementData: number;
      reviewRequired: number;
    };
    reviewCount: number;
  };
  statements: Array<{
    id: string;
    sourceInstitution: string;
    sourceInstitutionCnpj: string | null;
    documentType: string;
    positionCount: number;
    incomeCount: number;
    createdAt: string;
  }>;
  positions: Array<{
    statementId: string | null;
    positionIndex: number | null;
    sourceInstitution: string | null;
    sourceInstitutionCnpj: string | null;
    description: string;
    type: string;
    symbol: string | null;
    currency: SupportedCurrency;
    internalAssetId: string | null;
    internalAssetType: InvestmentAssetType | null;
    status: AnnualStatementReconciliationStatus;
    reason: string | null;
    statementQuantity: string | null;
    internalQuantity: string | null;
    quantityDifference: string | null;
    statementCostCents: number | null;
    internalCostCents: number | null;
    costDifferenceCents: number | null;
    previousStatementQuantity: string | null;
    previousStatementCostCents: number | null;
    previousStatementBalanceCents: number | null;
    currentStatementBalanceCents: number | null;
    canApplyBaseline: boolean;
  }>;
  incomes: Array<{
    statementIds: string[];
    sourceInstitutions: string[];
    descriptions: string[];
    symbol: string | null;
    currency: SupportedCurrency;
    internalAssetId: string | null;
    status: AnnualStatementReconciliationStatus;
    reason: string | null;
    statementAmountCents: number | null;
    internalAmountCents: number | null;
    differenceCents: number | null;
    eventIds: string[];
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
  transactionId: string | null;
  createdAt: string;
};

export type InvestmentTaxPaymentTransactionCandidate = {
  id: string;
  amountCents: number;
  type: string;
  kind: string;
  status: string;
  description: string;
  date: string;
  reconciliationStatus: string;
  account: {
    id: string;
    name: string;
    currency: string;
  };
};

export type InvestmentTaxPaymentReconciliationItem = {
  paymentId: string;
  assetType: InvestmentAssetType;
  currency: SupportedCurrency;
  amountCents: number;
  competenceYear: number;
  competenceMonth: number;
  code: string;
  paidDate: string;
  note: string | null;
  receiptReference: string | null;
  status: "MATCHED" | "SUGGESTED" | "UNMATCHED" | "REVIEW_REQUIRED";
  reason: string | null;
  matchedTransaction: InvestmentTaxPaymentTransactionCandidate | null;
  candidates: InvestmentTaxPaymentTransactionCandidate[];
};

export type InvestmentTaxGroup = "GENERAL" | "FII_FIAGRO";

export type InvestmentTaxControlReport = {
  year: number;
  taxExercise: number;
  ruleSupported: boolean;
  status: "OK" | "PENDING" | "WAITING_RULES";
  ruleDependency: "TAX_RULE_CATALOG" | null;
  darfCode: string | null;
  minimumDarfCents: number | null;
  ruleSources: Array<{
    title: string;
    url: string;
    note: string;
  }>;
  unsupportedClasses: string[];
  unsupportedCurrencies: SupportedCurrency[];
  totalsByCurrency: Partial<
    Record<
      SupportedCurrency,
      {
        withholdingCents: number;
        paidDarfCents: number;
        taxDueCents: number;
        openTaxBalanceCents: number;
      }
    >
  >;
  rows: Array<{
    year: number;
    month: number;
    taxGroup: InvestmentTaxGroup;
    currency: SupportedCurrency;
    rateBps: number | null;
    grossSalesCents: number;
    exemptResultCents: number;
    taxableResultAfterCompensationCents: number;
    withholdingCents: number;
    withholdingAppliedCents: number;
    withholdingCarryforwardCents: number;
    grossTaxCents: number | null;
    taxDueCents: number | null;
    paidDarfCents: number;
    openTaxBalanceCents: number | null;
    minimumDarfCents: number;
    status:
      | "OK"
      | "EXEMPT"
      | "BELOW_MINIMUM"
      | "OPEN"
      | "WAITING_RULES"
      | "PENDING_APURACAO";
  }>;
};


export type PayrollAnnualReconciliationStatus =
  | "MATCHED"
  | "MISMATCH"
  | "INCOMPLETE"
  | "UNSUPPORTED_COMPONENT";

export type PayrollAnnualReconciliationReport = {
  year: number;
  status: "MATCHED" | "REVIEW_REQUIRED";
  summary: {
    groups: number;
    matchedGroups: number;
    reviewGroups: number;
    matchedComponents: number;
    reviewComponents: number;
  };
  items: Array<{
    employerName: string;
    employerCnpj: string;
    year: number;
    status: PayrollAnnualReconciliationStatus;
    statementIds: string[];
    documentCount: number;
    components: Array<{
      key: string;
      label: string;
      status: PayrollAnnualReconciliationStatus;
      payrollCents: number | null;
      statementCents: number | null;
      differenceCents: number | null;
      reason: string | null;
    }>;
  }>;
};


export type InvestmentFiscalPendingItem = {
  pendingKey: string;
  fingerprint: string;
  severity: "CRITICAL" | "WARNING";
  category:
    | "FISCAL_COST"
    | "YEAR_END_SNAPSHOT"
    | "INCOME_CLASSIFICATION"
    | "REALIZED_RESULT"
    | "TAX_APURATION"
    | "PAYROLL_RECONCILIATION"
    | "ANNUAL_STATEMENT_RECONCILIATION";
  source: string;
  entityType: string;
  entityId: string;
  title: string;
  message: string;
  suggestedAction: string;
  status: "ACTIVE" | "JUSTIFIED";
  resolution: {
    id: string;
    justification: string;
    createdAt: string;
    updatedAt: string;
  } | null;
};

export type InvestmentFiscalPendingCenter = {
  year: number;
  status: "COMPLETE" | "COMPLETE_WITH_JUSTIFICATIONS" | "INCOMPLETE";
  summary: {
    total: number;
    active: number;
    critical: number;
    warning: number;
    justified: number;
  };
  items: InvestmentFiscalPendingItem[];
  resolutionHistory: Array<{
    id: string;
    pendingKey: string;
    fingerprint: string;
    justification: string;
    applied: boolean;
    createdAt: string;
    updatedAt: string;
  }>;
};


export type InvestmentAnnualTaxSupportReport = {
  year: number;
  generatedAt: string;
  officialReturn: false;
  disclaimer: string;
  status: "COMPLETE" | "COMPLETE_WITH_JUSTIFICATIONS" | "INCOMPLETE";
  summary: {
    pendingActive: number;
    pendingJustified: number;
    assetCount: number;
    incomeEventCount: number;
    saleCount: number;
    payrollReconciliationGroups: number;
    payrollReconciliationIssues: number;
    financialStatementReconciliationIssues: number;
  };
  patrimony: InvestmentFiscalYearEndSnapshot;
  incomes: InvestmentAnnualIncomeReport;
  realized: InvestmentRealizedResultReport;
  taxLosses: InvestmentTaxLossReport;
  taxes: InvestmentTaxControlReport;
  payrollReconciliation: PayrollAnnualReconciliationReport;
  financialStatementReconciliation: AnnualFinancialStatementReconciliation;
  pendencies: InvestmentFiscalPendingCenter;
  notes: Array<{
    type: "JUSTIFICATION" | "MANUAL_ADJUSTMENT" | "RULE_DEPENDENCY";
    title: string;
    detail: string;
  }>;
};
