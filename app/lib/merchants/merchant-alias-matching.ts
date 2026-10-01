import type { ImportRuleDescriptionOperator } from "@prisma/client";

export type MerchantAliasMatchCandidate = {
  id: string;
  merchantId: string;
  merchantName: string;
  operator: ImportRuleDescriptionOperator;
  normalizedPattern: string;
  priority: number;
};

export function normalizeMerchantAliasValue(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLocaleLowerCase("pt-BR");
}

export function merchantAliasMatches(
  operator: ImportRuleDescriptionOperator,
  normalizedPattern: string,
  description: string,
) {
  const normalizedDescription = normalizeMerchantAliasValue(description);
  if (!normalizedPattern || !normalizedDescription) return false;

  if (operator === "EQUALS") return normalizedDescription === normalizedPattern;
  if (operator === "STARTS_WITH") return normalizedDescription.startsWith(normalizedPattern);
  return normalizedDescription.includes(normalizedPattern);
}

export function matchMerchantAlias(
  aliases: readonly MerchantAliasMatchCandidate[],
  description: string,
) {
  const matches = aliases.filter((alias) =>
    merchantAliasMatches(alias.operator, alias.normalizedPattern, description),
  );

  if (matches.length === 0) return null;

  const [winner, ...rest] = matches;
  const conflictingMerchantIds = new Set(rest.map((alias) => alias.merchantId));
  const conflict = conflictingMerchantIds.size > 0 && !conflictingMerchantIds.has(winner.merchantId)
    ? true
    : rest.some((alias) => alias.merchantId !== winner.merchantId);

  return {
    aliasId: winner.id,
    merchantId: winner.merchantId,
    merchantName: winner.merchantName,
    priority: winner.priority,
    conflict,
    matchingAliasIds: matches.map((alias) => alias.id),
  };
}
