export type ImportRuleTransactionType = "INCOME" | "EXPENSE";
export type ImportRuleDescriptionOperator =
  | "EQUALS"
  | "STARTS_WITH"
  | "CONTAINS";

export type ImportRuleEffectiveState =
  | "OPERATIONAL"
  | "PAUSED"
  | "BROKEN_CATEGORY"
  | "BROKEN_ACCOUNT";

export type ImportRuleOperationalState =
  | "ACTIVE"
  | "PAUSED"
  | "BROKEN_ACCOUNT"
  | "BROKEN_CATEGORY";

export interface ImportRuleModel {
  id: string;
  name: string;
  isActive: boolean;
  effectiveState: ImportRuleEffectiveState;
  priority: number;
  accountId: string | null;
  transactionType: ImportRuleTransactionType;
  descriptionOperator: ImportRuleDescriptionOperator;
  descriptionPattern: string;
  minAmountCents: number | null;
  maxAmountCents: number | null;
  categoryId: string;
  operationalState: ImportRuleOperationalState;
  operationalReason: string | null;
  accountName: string | null;
  accountIsActive: boolean | null;
  categoryName: string | null;
  categoryIsActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ImportRuleInput {
  name: string;
  isActive: boolean;
  priority: number;
  accountId: string | null;
  transactionType: ImportRuleTransactionType;
  descriptionOperator: ImportRuleDescriptionOperator;
  descriptionPattern: string;
  minAmountCents: number | null;
  maxAmountCents: number | null;
  categoryId: string;
}

export interface ImportRuleListResponse {
  items: ImportRuleModel[];
  total: number;
  page?: number;
  pageSize?: number;
  totalPages?: number;
  summary?: {
    nextPriority: number;
  };
}
