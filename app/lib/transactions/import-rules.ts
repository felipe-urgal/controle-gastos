export type ImportRuleDescriptionOperator =
  | "EQUALS"
  | "STARTS_WITH"
  | "CONTAINS";

export type ImportRuleTransactionType = "INCOME" | "EXPENSE";

export type ImportRule = {
  id: string;
  name: string;
  isActive: boolean;
  priority: number;
  accountId: string | null;
  transactionType: ImportRuleTransactionType;
  descriptionOperator: ImportRuleDescriptionOperator;
  descriptionPattern: string;
  minAmountCents: number | null;
  maxAmountCents: number | null;
  categoryId: string;
  normalizedDescription: string | null;
};

export type ImportRuleCandidate = {
  accountId: string;
  transactionType: ImportRuleTransactionType;
  description: string;
  amountCents: number;
};

export type ImportRuleMatch = {
  matchedRuleId: string;
  matchedRuleName: string;
  suggestedCategoryId: string | null;
  suggestedDescription: string | null;
  conflict: boolean;
  matchingRuleIds: string[];
  matchingRuleNames: string[];
};

export function normalizeImportRuleText(value: string) {
  return value
    .normalize("NFKC")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function compareRuleOrder(a: ImportRule, b: ImportRule) {
  if (a.priority !== b.priority) {
    return a.priority - b.priority;
  }

  if (a.id < b.id) return -1;
  if (a.id > b.id) return 1;
  return 0;
}

function hasValidAmountBounds(rule: ImportRule) {
  const { minAmountCents, maxAmountCents } = rule;

  if (
    minAmountCents !== null &&
    (!Number.isInteger(minAmountCents) || minAmountCents < 0)
  ) {
    return false;
  }

  if (
    maxAmountCents !== null &&
    (!Number.isInteger(maxAmountCents) || maxAmountCents < 0)
  ) {
    return false;
  }

  return !(
    minAmountCents !== null &&
    maxAmountCents !== null &&
    minAmountCents > maxAmountCents
  );
}

export function matchesImportRule(
  rule: ImportRule,
  candidate: ImportRuleCandidate
) {
  if (!rule.isActive || !Number.isInteger(rule.priority)) {
    return false;
  }

  if (!Number.isInteger(candidate.amountCents) || candidate.amountCents < 0) {
    return false;
  }

  if (!hasValidAmountBounds(rule)) {
    return false;
  }

  if (rule.accountId !== null && rule.accountId !== candidate.accountId) {
    return false;
  }

  if (rule.transactionType !== candidate.transactionType) {
    return false;
  }

  if (
    rule.minAmountCents !== null &&
    candidate.amountCents < rule.minAmountCents
  ) {
    return false;
  }

  if (
    rule.maxAmountCents !== null &&
    candidate.amountCents > rule.maxAmountCents
  ) {
    return false;
  }

  const pattern = normalizeImportRuleText(rule.descriptionPattern);
  if (!pattern) {
    return false;
  }

  const description = normalizeImportRuleText(candidate.description);

  switch (rule.descriptionOperator) {
    case "EQUALS":
      return description === pattern;
    case "STARTS_WITH":
      return description.startsWith(pattern);
    case "CONTAINS":
      return description.includes(pattern);
  }
}

export function evaluateImportRules(
  rules: readonly ImportRule[],
  candidate: ImportRuleCandidate
): ImportRuleMatch | null {
  const matches = [...rules]
    .sort(compareRuleOrder)
    .filter((rule) => matchesImportRule(rule, candidate));

  const matchedRule = matches[0];
  if (!matchedRule) {
    return null;
  }

  const categories = new Set(matches.map((rule) => rule.categoryId));
  const normalizedDescriptions = new Set(
    matches.map((rule) => normalizeImportRuleText(rule.normalizedDescription ?? "")),
  );
  const conflict = categories.size > 1 || normalizedDescriptions.size > 1;
  const suggestedDescription = matchedRule.normalizedDescription?.trim();

  return {
    matchedRuleId: matchedRule.id,
    matchedRuleName: matchedRule.name,
    suggestedCategoryId: conflict ? null : matchedRule.categoryId,
    suggestedDescription: conflict ? null : (suggestedDescription || null),
    conflict,
    matchingRuleIds: matches.map((rule) => rule.id),
    matchingRuleNames: matches.map((rule) => rule.name),
  };
}
