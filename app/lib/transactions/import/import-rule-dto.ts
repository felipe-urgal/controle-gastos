import type { TransactionImportRule } from "@prisma/client";

export function toImportRuleDTO(rule: TransactionImportRule) {
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
    normalizedDescription: rule.normalizedDescription,
    createdAt: rule.createdAt.toISOString(),
    updatedAt: rule.updatedAt.toISOString(),
  };
}
