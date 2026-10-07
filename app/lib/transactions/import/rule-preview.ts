import {
  evaluateImportRules,
  type ImportRule,
} from "@/app/lib/transactions/import-rules";
import {
  matchMerchantAlias,
  normalizeMerchantAliasValue,
  type MerchantAliasMatchCandidate,
} from "@/app/lib/merchants/merchant-alias-matching";
import type { PreviewImportItem } from "@/app/lib/transactions/import/parser";

export type ImportRulePreviewItem = PreviewImportItem & {
  matchedRuleId: string | null;
  matchedRuleName: string | null;
  suggestedCategoryId: string | null;
  suggestedDescription: string | null;
  importRuleConflict: boolean;
  matchingRuleNames: string[];
  alsoMatchingRuleNames: string[];
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
  merchantAliasesByDescription?: ReadonlyMap<
    string,
    readonly MerchantAliasMatchCandidate[]
  >;
}): ImportRulePreviewItem[] {
  return args.items.map((item) => {
    if (item.errors.length > 0 || item.duplicate) {
      return {
        ...item,
        matchedRuleId: null,
        matchedRuleName: null,
        suggestedCategoryId: null,
        suggestedDescription: null,
        importRuleConflict: false,
        matchingRuleNames: [],
        alsoMatchingRuleNames: [],
        matchedMerchantAliasId: null,
        suggestedMerchantId: null,
        suggestedMerchantName: null,
        merchantAliasConflict: false,
      };
    }

    const normalizedDescription = normalizeMerchantAliasValue(item.description);
    const merchantCandidates =
      args.merchantAliasesByDescription?.get(normalizedDescription) ??
      args.merchantAliases ??
      [];
    const merchantMatch = matchMerchantAlias(merchantCandidates, item.description);
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
      importRuleConflict: match?.conflict ?? false,
      matchingRuleNames: match?.matchingRuleNames ?? [],
      alsoMatchingRuleNames: match?.alsoMatchingRuleNames ?? [],
      matchedMerchantAliasId: merchantMatch?.aliasId ?? null,
      suggestedMerchantId: merchantMatch?.conflict ? null : (merchantMatch?.merchantId ?? null),
      suggestedMerchantName: merchantMatch?.conflict ? null : (merchantMatch?.merchantName ?? null),
      merchantAliasConflict: merchantMatch?.conflict ?? false,
    };
  });
}
