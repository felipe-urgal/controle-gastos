import type { ImportRuleDescriptionOperator } from "@prisma/client";

export type MerchantAliasMatchCandidate = {
  id: string;
  merchantId: string;
  merchantName: string;
  operator: ImportRuleDescriptionOperator;
  normalizedPattern: string;
  priority: number;
};

const operatorSpecificity: Record<ImportRuleDescriptionOperator, number> = {
  EQUALS: 3,
  STARTS_WITH: 2,
  CONTAINS: 1,
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
  if (operator === "STARTS_WITH") {
    return normalizedDescription.startsWith(normalizedPattern);
  }
  return normalizedDescription.includes(normalizedPattern);
}

function compareMerchantAliasSpecificity(
  left: MerchantAliasMatchCandidate,
  right: MerchantAliasMatchCandidate,
) {
  const byOperator =
    operatorSpecificity[right.operator] - operatorSpecificity[left.operator];
  if (byOperator !== 0) return byOperator;

  const byPatternLength =
    right.normalizedPattern.length - left.normalizedPattern.length;
  if (byPatternLength !== 0) return byPatternLength;

  const byPriority = left.priority - right.priority;
  if (byPriority !== 0) return byPriority;

  return left.id.localeCompare(right.id);
}

export function matchMerchantAlias(
  aliases: readonly MerchantAliasMatchCandidate[],
  description: string,
) {
  const matches = aliases
    .filter((alias) =>
      merchantAliasMatches(alias.operator, alias.normalizedPattern, description),
    )
    .sort(compareMerchantAliasSpecificity);

  if (matches.length === 0) return null;

  const winner = matches[0];
  const conflict =
    new Set(matches.map((alias) => alias.merchantId)).size > 1;

  return {
    aliasId: winner.id,
    merchantId: winner.merchantId,
    merchantName: winner.merchantName,
    priority: winner.priority,
    conflict,
    matchingAliasIds: matches.map((alias) => alias.id),
  };
}
