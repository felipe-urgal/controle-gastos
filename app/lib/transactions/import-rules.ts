import { normalizeImportRuleText } from "@/app/lib/import-rules/import-rule-normalization";

export { normalizeImportRuleText } from "@/app/lib/import-rules/import-rule-normalization";

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
  conflict: boolean;
  matchingRuleIds: string[];
  matchingRuleNames: string[];
  alsoMatchingRuleIds: string[];
  alsoMatchingRuleNames: string[];
};

function descriptionOperatorSpecificity(
  operator: ImportRuleDescriptionOperator
) {
  if (operator === "EQUALS") return 3;
  if (operator === "STARTS_WITH") return 2;
  return 1;
}

function amountBoundCount(rule: ImportRule) {
  return Number(rule.minAmountCents !== null) + Number(rule.maxAmountCents !== null);
}

function amountRangeSpan(rule: ImportRule) {
  if (rule.minAmountCents === null || rule.maxAmountCents === null) {
    return Number.POSITIVE_INFINITY;
  }

  return rule.maxAmountCents - rule.minAmountCents;
}

function compareRuleSpecificity(a: ImportRule, b: ImportRule) {
  const accountSpecificity = Number(b.accountId !== null) - Number(a.accountId !== null);
  if (accountSpecificity !== 0) return accountSpecificity;

  const operatorSpecificity =
    descriptionOperatorSpecificity(b.descriptionOperator) -
    descriptionOperatorSpecificity(a.descriptionOperator);
  if (operatorSpecificity !== 0) return operatorSpecificity;

  const patternSpecificity =
    normalizeImportRuleText(b.descriptionPattern).length -
    normalizeImportRuleText(a.descriptionPattern).length;
  if (patternSpecificity !== 0) return patternSpecificity;

  const boundSpecificity = amountBoundCount(b) - amountBoundCount(a);
  if (boundSpecificity !== 0) return boundSpecificity;

  const aSpan = amountRangeSpan(a);
  const bSpan = amountRangeSpan(b);
  if (aSpan !== bSpan) return aSpan - bSpan;

  return 0;
}

function hasSameRulePrecedence(a: ImportRule, b: ImportRule) {
  return a.priority === b.priority && compareRuleSpecificity(a, b) === 0;
}

function canonicalRuleMatcherKey(rule: ImportRule) {
  return [
    rule.accountId ?? "*",
    rule.transactionType,
    rule.descriptionOperator,
    normalizeImportRuleText(rule.descriptionPattern),
    rule.minAmountCents ?? "*",
    rule.maxAmountCents ?? "*",
  ].join("|");
}

function compareRuleOrder(a: ImportRule, b: ImportRule) {
  if (a.priority !== b.priority) {
    return a.priority - b.priority;
  }

  const specificity = compareRuleSpecificity(a, b);
  if (specificity !== 0) return specificity;

  const matcherOrder = canonicalRuleMatcherKey(a).localeCompare(
    canonicalRuleMatcherKey(b)
  );
  return matcherOrder;
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

export function evaluateMatchedImportRules(
  rules: readonly ImportRule[]
): ImportRuleMatch | null {
  const matches = [...rules].sort(compareRuleOrder);

  const matchedRule = matches[0];
  if (!matchedRule) {
    return null;
  }

  const samePrecedenceMatches = matches.filter((rule) =>
    hasSameRulePrecedence(matchedRule, rule)
  );
  const categories = new Set(
    samePrecedenceMatches.map((rule) => rule.categoryId)
  );
  const conflict = categories.size > 1;

  return {
    matchedRuleId: matchedRule.id,
    matchedRuleName: matchedRule.name,
    suggestedCategoryId: conflict ? null : matchedRule.categoryId,
    conflict,
    matchingRuleIds: matches.map((rule) => rule.id),
    matchingRuleNames: matches.map((rule) => rule.name),
    alsoMatchingRuleIds: matches.slice(1).map((rule) => rule.id),
    alsoMatchingRuleNames: matches.slice(1).map((rule) => rule.name),
  };
}

export function evaluateImportRules(
  rules: readonly ImportRule[],
  candidate: ImportRuleCandidate
): ImportRuleMatch | null {
  return evaluateMatchedImportRules(
    rules.filter((rule) => matchesImportRule(rule, candidate))
  );
}
