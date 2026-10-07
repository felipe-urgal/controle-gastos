import type { CategoryType, TransactionImportRule } from "@prisma/client";

type ImportRuleWithDependencies = TransactionImportRule & {
  account?: {
    name: string;
    isActive: boolean;
  } | null;
  category?: {
    name: string;
    isActive: boolean;
    type: CategoryType;
  } | null;
};

export function toImportRuleDTO(rule: ImportRuleWithDependencies) {
  let operationalState:
    | "ACTIVE"
    | "PAUSED"
    | "BROKEN_ACCOUNT"
    | "BROKEN_CATEGORY" = "ACTIVE";
  let operationalReason: string | null = null;

  if (!rule.isActive) {
    operationalState = "PAUSED";
  } else if (
    rule.accountId &&
    (!rule.account || !rule.account.isActive)
  ) {
    operationalState = "BROKEN_ACCOUNT";
    operationalReason = rule.account
      ? "A conta vinculada está inativa."
      : "A conta vinculada não está disponível.";
  } else if (
    !rule.category ||
    !rule.category.isActive ||
    rule.category.type !== rule.transactionType
  ) {
    operationalState = "BROKEN_CATEGORY";
    operationalReason = rule.category
      ? "A categoria vinculada está inativa ou incompatível com o tipo."
      : "A categoria vinculada não está disponível.";
  }

  return {
    id: rule.id,
    name: rule.name,
    isActive: rule.isActive,
    priority: rule.priority,
    accountId: rule.accountId,
    transactionType: rule.transactionType,
    descriptionOperator: rule.descriptionOperator,
    descriptionPattern: rule.descriptionPattern,
    minAmountCents: rule.minAmountCents,
    maxAmountCents: rule.maxAmountCents,
    categoryId: rule.categoryId,
    operationalState,
    operationalReason,
    accountName: rule.account?.name ?? null,
    accountIsActive: rule.account?.isActive ?? null,
    categoryName: rule.category?.name ?? null,
    categoryIsActive: rule.category?.isActive ?? false,
    createdAt: rule.createdAt.toISOString(),
    updatedAt: rule.updatedAt.toISOString(),
  };
}
