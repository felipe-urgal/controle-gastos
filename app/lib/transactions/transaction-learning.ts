import type { ImportRuleDescriptionOperator, ImportRuleInput } from "@/app/types/import-rule";
import type { MerchantAliasOperator } from "@/app/types/merchant-alias";
import type { TransactionType } from "@/app/types/transaction";

export type CorrectionAutomationTransaction = {
  description: string;
  accountId: string;
  categoryId: string;
  merchantId: string | null;
  type: TransactionType;
  importSource?: string | null;
};

export type MerchantCorrectionSuggestion = {
  merchantId: string;
  pattern: string;
  operator: MerchantAliasOperator;
};

export type CategoryCorrectionSuggestion = {
  rule: ImportRuleInput;
  operator: ImportRuleDescriptionOperator;
};

export type CorrectionAutomationSuggestions = {
  merchant: MerchantCorrectionSuggestion | null;
  category: CategoryCorrectionSuggestion | null;
};

function learnedRuleName(description: string) {
  const compact = description.trim().replace(/\s+/g, " ");
  return `Aprendido: ${compact.slice(0, 88)}`;
}

export function buildCorrectionAutomationSuggestions(
  original: CorrectionAutomationTransaction,
  next: CorrectionAutomationTransaction,
): CorrectionAutomationSuggestions {
  if (!original.importSource) {
    return { merchant: null, category: null };
  }

  const pattern = original.description.trim().replace(/\s+/g, " ");
  if (!pattern) {
    return { merchant: null, category: null };
  }

  const merchant =
    next.merchantId &&
    next.merchantId !== original.merchantId &&
    pattern.length >= 2 &&
    pattern.length <= 120
      ? {
          merchantId: next.merchantId,
          pattern,
          operator: "EQUALS" as const,
        }
      : null;

  const category =
    next.categoryId && next.categoryId !== original.categoryId
      ? {
          operator: "EQUALS" as const,
          rule: {
            name: learnedRuleName(pattern),
            isActive: true,
            priority: 100,
            accountId: next.accountId || null,
            transactionType: next.type,
            descriptionOperator: "EQUALS" as const,
            descriptionPattern: pattern,
            minAmountCents: null,
            maxAmountCents: null,
            categoryId: next.categoryId,
            normalizedDescription: null,
          },
        }
      : null;

  return { merchant, category };
}
