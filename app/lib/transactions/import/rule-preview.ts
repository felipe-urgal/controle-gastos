import {
  evaluateImportRules,
  type ImportRule,
} from "@/app/lib/transactions/import-rules";
import { matchMerchantAlias, type MerchantAliasMatchCandidate } from "@/app/lib/merchants/merchant-alias-matching";
import type { PreviewImportItem } from "@/app/lib/transactions/import/parser";

export type ImportRulePreviewItem = PreviewImportItem & {
  matchedRuleId: string | null;
  matchedRuleName: string | null;
  suggestedCategoryId: string | null;
  suggestedDescription: string | null;
  matchedMerchantAliasId: string | null;
  suggestedMerchantId: string | null;
  suggestedMerchantName: string | null;
  merchantAliasConflict: boolean;
};

export function applyImportRulesToPreview(args: {
  accountId: string;
  items: readonly PreviewImportItem[];
  rules: readonly ImportRule[];
  merchantAliases?: readonly MerchantAliasMatchCandidate[];
}): ImportRulePreviewItem[] {
  return args.items.map((item) => {
    if (item.errors.length > 0 || item.duplicate) {
      return {
        ...item,
        matchedRuleId: null,
        matchedRuleName: null,
        suggestedCategoryId: null,
        suggestedDescription: null,
        matchedMerchantAliasId: null,
        suggestedMerchantId: null,
        suggestedMerchantName: null,
        merchantAliasConflict: false,
      };
    }

    const merchantMatch = matchMerchantAlias(args.merchantAliases ?? [], item.description);
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
      matchedMerchantAliasId: merchantMatch?.aliasId ?? null,
      suggestedMerchantId: merchantMatch?.conflict ? null : (merchantMatch?.merchantId ?? null),
      suggestedMerchantName: merchantMatch?.conflict ? null : (merchantMatch?.merchantName ?? null),
      merchantAliasConflict: merchantMatch?.conflict ?? false,
    };
  });
}
