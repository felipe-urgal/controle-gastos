import {
  evaluateImportRules,
  type ImportRule,
} from "@/app/lib/transactions/import-rules";
import type { PreviewImportItem } from "@/app/lib/transactions/import/parser";

export type ImportRulePreviewItem = PreviewImportItem & {
  matchedRuleId: string | null;
  matchedRuleName: string | null;
  suggestedCategoryId: string | null;
  suggestedDescription: string | null;
};

export function applyImportRulesToPreview(args: {
  accountId: string;
  items: readonly PreviewImportItem[];
  rules: readonly ImportRule[];
}): ImportRulePreviewItem[] {
  return args.items.map((item) => {
    if (item.errors.length > 0 || item.duplicate) {
      return {
        ...item,
        matchedRuleId: null,
        matchedRuleName: null,
        suggestedCategoryId: null,
        suggestedDescription: null,
      };
    }

    const match = evaluateImportRules(args.rules, {
      accountId: args.accountId,
      transactionType: item.type,
      description: item.description,
      amountCents: item.amountCents,
    });

    return {
      ...item,
      matchedRuleId: match?.matchedRuleId ?? null,
      matchedRuleName: match?.matchedRuleName ?? null,
      suggestedCategoryId: match?.suggestedCategoryId ?? null,
      suggestedDescription: match?.suggestedDescription ?? null,
    };
  });
}
