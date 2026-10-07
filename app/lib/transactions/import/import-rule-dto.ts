import type { TransactionImportRule } from "@prisma/client";

export type ImportRuleEffectiveState =
  | "OPERATIONAL"
  | "PAUSED"
  | "BROKEN_CATEGORY"
  | "BROKEN_ACCOUNT";

type ImportRuleWithDependencies = TransactionImportRule & {
  account?: { isActive: boolean } | null;
  category?: { isActive: boolean } | null;
};

export function importRuleEffectiveState(
  rule: ImportRuleWithDependencies,
): ImportRuleEffectiveState {
  if (!rule.isActive) return "PAUSED";
  if (!rule.category?.isActive) return "BROKEN_CATEGORY";
  if (rule.accountId !== null && !rule.account?.isActive) return "BROKEN_ACCOUNT";
  return "OPERATIONAL";
}

export function toImportRuleDTO(rule: ImportRuleWithDependencies) {
  return {
    id: rule.id,
    name: rule.name,
    isActive: rule.isActive,
    effectiveState: importRuleEffectiveState(rule),
    priority: rule.priority,
    accountId: rule.accountId,
    transactionType: rule.transactionType,
    descriptionOperator: rule.descriptionOperator,
    descriptionPattern: rule.descriptionPattern,
    minAmountCents: rule.minAmountCents,
    maxAmountCents: rule.maxAmountCents,
    categoryId: rule.categoryId,
    createdAt: rule.createdAt.toISOString(),
    updatedAt: rule.updatedAt.toISOString(),
  };
}
