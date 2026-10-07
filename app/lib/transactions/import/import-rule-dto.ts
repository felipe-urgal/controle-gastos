import type { CategoryType, TransactionImportRule } from "@prisma/client";

type ImportRuleWithDependencies = TransactionImportRule & {
  account?: {
    isActive: boolean;
  } | null;
  category?: {
    isActive: boolean;
    type: CategoryType;
  } | null;
};

export function toImportRuleDTO(rule: ImportRuleWithDependencies) {
  const effectiveState =
    !rule.isActive
      ? "PAUSED"
      : rule.accountId && (!rule.account || !rule.account.isActive)
        ? "BROKEN_ACCOUNT"
        : !rule.category ||
            !rule.category.isActive ||
            rule.category.type !== rule.transactionType
          ? "BROKEN_CATEGORY"
          : "OPERATIONAL";

  return {
    id: rule.id,
    name: rule.name,
    isActive: rule.isActive,
    effectiveState,
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
