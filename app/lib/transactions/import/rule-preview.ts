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

type RuleBucket = {
  global: ImportRule[];
  byAccount: Map<string, ImportRule[]>;
};

function indexRulesByTypeAndAccount(rules: readonly ImportRule[]) {
  const buckets: Record<"INCOME" | "EXPENSE", RuleBucket> = {
    INCOME: { global: [], byAccount: new Map() },
    EXPENSE: { global: [], byAccount: new Map() },
  };

  for (const rule of rules) {
    const bucket = buckets[rule.transactionType];
    if (rule.accountId === null) {
      bucket.global.push(rule);
      continue;
    }

    const accountRules = bucket.byAccount.get(rule.accountId) ?? [];
    accountRules.push(rule);
    bucket.byAccount.set(rule.accountId, accountRules);
  }

  return buckets;
}

export type ImportRulePreviewItem = PreviewImportItem & {
  matchedRuleId: string | null;
  matchedRuleName: string | null;
  suggestedCategoryId: string | null;
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
  const ruleBuckets = indexRulesByTypeAndAccount(args.rules);

  return args.items.map((item) => {
    if (item.errors.length > 0 || item.duplicate) {
      return {
        ...item,
        matchedRuleId: null,
        matchedRuleName: null,
        suggestedCategoryId: null,
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
    const bucket = ruleBuckets[item.type];
    const candidateRules = [
      ...bucket.global,
      ...(bucket.byAccount.get(args.accountId) ?? []),
    ];
    const match = evaluateImportRules(candidateRules, {
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
