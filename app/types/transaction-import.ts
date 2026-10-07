import type { MerchantAliasOperator } from "@/app/types/merchant-alias";

export type TransactionImportType = "INCOME" | "EXPENSE";
export type TransactionImportSource = "CSV" | "OFX" | "QIF" | "XLSX";
export type TransactionImportQifDateOrder = "MDY" | "DMY";

export type TransactionImportPreviewItem = {
  index: number;
  source: TransactionImportSource;
  date: string;
  amountCents: number;
  type: TransactionImportType;
  description: string;
  externalId?: string;
  currency?: string;
  errors: string[];
  fingerprint: string;
  duplicate: boolean;
  matchedRuleId?: string | null;
  matchedRuleName?: string | null;
  suggestedCategoryId?: string | null;
  importRuleConflict?: boolean;
  matchingRuleNames?: string[];
  alsoMatchingRuleNames?: string[];
  matchedMerchantAliasId?: string | null;
  suggestedMerchantId?: string | null;
  suggestedMerchantName?: string | null;
  merchantAliasConflict?: boolean;
};

export type TransactionImportPreviewData = {
  accountId: string;
  fileName: string;
  detectedSource?: "GENERIC" | "NUBANK_CREDIT_CARD";
  nubankSummary?: {
    purchases: number;
    payments: number;
    credits: number;
  } | null;
  previewToken: string;
  previewExpiresAt: string;
  qifDateOrder?: TransactionImportQifDateOrder | null;
  xlsxWorksheet?: {
    name: string;
    ignoredWorksheetNames: string[];
  } | null;
  limits: {
    maxFileBytes: number;
    maxItems: number;
  };
  summary: {
    total: number;
    valid: number;
    invalid: number;
    duplicates: number;
  };
  items: TransactionImportPreviewItem[];
};

export type TransactionImportConfirmItem = {
  index: number;
  source: TransactionImportSource;
  date: string;
  amountCents: number;
  type: TransactionImportType;
  description: string;
  externalId?: string;
  currency?: string;
  errors: string[];
  fingerprint: string;
  duplicate: boolean;
  selected: boolean;
  categoryId: string | null;
  merchantId?: string | null;
  learnMerchantAlias?: boolean;
  merchantAliasOperator?: MerchantAliasOperator;
};

export type TransactionImportConfirmInput = {
  accountId: string;
  previewToken: string;
  items: TransactionImportConfirmItem[];
};

export type TransactionImportConfirmData = {
  selected: number;
  created: number;
  duplicates: number;
};

export type TransactionImportApiEnvelope<T> = {
  success: boolean;
  data?: T;
  message?: string;
  error?: {
    code?: string;
    message?: string;
  };
};
