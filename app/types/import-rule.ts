export type ImportRuleTransactionType = "INCOME" | "EXPENSE";
export type ImportRuleDescriptionOperator =
  | "EQUALS"
  | "STARTS_WITH"
  | "CONTAINS";

export interface ImportRuleModel {
  id: string;
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
  normalizedDescription: string | null;
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
  normalizedDescription: string | null;
}

export interface ImportRuleListResponse {
  items: ImportRuleModel[];
  total: number;
}
