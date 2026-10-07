import type {
  ImportRuleDescriptionOperator,
  ImportRuleInput,
  ImportRuleModel,
} from '@/app/types/import-rule';
import {
  evaluateMatchedImportRules,
  type ImportRule,
} from '@/app/lib/transactions/import-rules';

export const BROAD_IMPORT_RULE_MIN_PATTERN_LENGTH = 3;

type ComparableImportRule = Pick<
  ImportRuleInput,
  | 'priority'
  | 'accountId'
  | 'transactionType'
  | 'descriptionOperator'
  | 'descriptionPattern'
  | 'minAmountCents'
  | 'maxAmountCents'
  | 'categoryId'
  | 'normalizedDescription'
>;

export type ImportRuleOverlapResolution =
  | 'CANDIDATE_WINS'
  | 'EXISTING_WINS'
  | 'SAME_OUTCOME'
  | 'AMBIGUOUS';

export type ImportRuleRelationship =
  | { kind: 'NONE' }
  | {
      kind: 'EQUIVALENT';
      ruleId: string;
      ruleName: string;
      resolution: 'SAME_OUTCOME';
    }
  | {
      kind: 'CONFLICT' | 'OVERLAP';
      ruleId: string;
      ruleName: string;
      resolution: ImportRuleOverlapResolution;
    };

export function normalizeImportRulePattern(value: string) {
  return value.normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase();
}

export function assertImportRulePatternIsSafe(
  operator: ImportRuleDescriptionOperator,
  pattern: string,
) {
  const normalized = normalizeImportRulePattern(pattern);

  if (!normalized) {
    throw new Error('Padrão da descrição é obrigatório');
  }

  if (
    operator !== 'EQUALS' &&
    normalized.length < BROAD_IMPORT_RULE_MIN_PATTERN_LENGTH
  ) {
    throw new Error(
      `Padrões com "${operator === 'CONTAINS' ? 'contém' : 'começa com'}" precisam ter pelo menos ${BROAD_IMPORT_RULE_MIN_PATTERN_LENGTH} caracteres`,
    );
  }
}

function sameNullable<T>(left: T | null, right: T | null) {
  return left === right;
}

function sameMatcher(
  left: ComparableImportRule,
  right: ComparableImportRule,
) {
  return (
    sameNullable(left.accountId, right.accountId) &&
    left.transactionType === right.transactionType &&
    left.descriptionOperator === right.descriptionOperator &&
    normalizeImportRulePattern(left.descriptionPattern) ===
      normalizeImportRulePattern(right.descriptionPattern) &&
    sameNullable(left.minAmountCents, right.minAmountCents) &&
    sameNullable(left.maxAmountCents, right.maxAmountCents)
  );
}

function sameOutcome(
  left: ComparableImportRule,
  right: ComparableImportRule,
) {
  return (
    left.categoryId === right.categoryId &&
    normalizeImportRulePattern(left.normalizedDescription ?? '') ===
      normalizeImportRulePattern(right.normalizedDescription ?? '')
  );
}

function accountScopesMayOverlap(
  leftAccountId: string | null,
  rightAccountId: string | null,
) {
  return (
    leftAccountId === null ||
    rightAccountId === null ||
    leftAccountId === rightAccountId
  );
}

function textMatcherAccepts(
  operator: ImportRuleDescriptionOperator,
  pattern: string,
  value: string,
) {
  if (operator === 'EQUALS') return value === pattern;
  if (operator === 'STARTS_WITH') return value.startsWith(pattern);
  return value.includes(pattern);
}

function descriptionMatchersMayOverlap(
  left: ComparableImportRule,
  right: ComparableImportRule,
) {
  const leftPattern = normalizeImportRulePattern(left.descriptionPattern);
  const rightPattern = normalizeImportRulePattern(right.descriptionPattern);
  if (!leftPattern || !rightPattern) return false;

  if (left.descriptionOperator === 'EQUALS') {
    return textMatcherAccepts(
      right.descriptionOperator,
      rightPattern,
      leftPattern,
    );
  }

  if (right.descriptionOperator === 'EQUALS') {
    return textMatcherAccepts(
      left.descriptionOperator,
      leftPattern,
      rightPattern,
    );
  }

  if (
    left.descriptionOperator === 'STARTS_WITH' &&
    right.descriptionOperator === 'STARTS_WITH'
  ) {
    return (
      leftPattern.startsWith(rightPattern) ||
      rightPattern.startsWith(leftPattern)
    );
  }

  // STARTS_WITH × CONTAINS and CONTAINS × CONTAINS can always share
  // at least one concrete description by extending/combining the patterns.
  return true;
}

function amountRangesMayOverlap(
  left: ComparableImportRule,
  right: ComparableImportRule,
) {
  const leftMin = left.minAmountCents ?? 0;
  const rightMin = right.minAmountCents ?? 0;
  const leftMax = left.maxAmountCents ?? Number.POSITIVE_INFINITY;
  const rightMax = right.maxAmountCents ?? Number.POSITIVE_INFINITY;

  return leftMin <= rightMax && rightMin <= leftMax;
}

function matcherScopesMayOverlap(
  left: ComparableImportRule,
  right: ComparableImportRule,
) {
  return (
    left.transactionType === right.transactionType &&
    accountScopesMayOverlap(left.accountId, right.accountId) &&
    descriptionMatchersMayOverlap(left, right) &&
    amountRangesMayOverlap(left, right)
  );
}

function toEvaluatorRule(
  rule: ComparableImportRule,
  id: string,
  name: string,
): ImportRule {
  return {
    id,
    name,
    isActive: true,
    priority: rule.priority,
    accountId: rule.accountId,
    transactionType: rule.transactionType,
    descriptionOperator: rule.descriptionOperator,
    descriptionPattern: rule.descriptionPattern,
    minAmountCents: rule.minAmountCents,
    maxAmountCents: rule.maxAmountCents,
    categoryId: rule.categoryId,
    normalizedDescription: rule.normalizedDescription,
  };
}

function resolveOverlap(
  candidate: ComparableImportRule,
  existing: ComparableImportRule,
): ImportRuleOverlapResolution {
  if (sameOutcome(candidate, existing)) return 'SAME_OUTCOME';

  const evaluated = evaluateMatchedImportRules([
    toEvaluatorRule(candidate, '__candidate__', 'Nova regra'),
    toEvaluatorRule(existing, '__existing__', 'Regra existente'),
  ]);

  if (!evaluated || evaluated.conflict) return 'AMBIGUOUS';

  return evaluated.matchedRuleId === '__candidate__'
    ? 'CANDIDATE_WINS'
    : 'EXISTING_WINS';
}

export function findImportRuleRelationships(
  candidate: ComparableImportRule,
  rules: readonly Pick<
    ImportRuleModel,
    keyof ComparableImportRule | 'id' | 'name'
  >[],
  options: { excludeRuleId?: string } = {},
): ImportRuleRelationship[] {
  const relationships: ImportRuleRelationship[] = [];

  for (const rule of rules) {
    if (rule.id === options.excludeRuleId) continue;

    if (sameMatcher(candidate, rule) && sameOutcome(candidate, rule)) {
      relationships.push({
        kind: 'EQUIVALENT',
        ruleId: rule.id,
        ruleName: rule.name,
        resolution: 'SAME_OUTCOME',
      });
      continue;
    }

    if (matcherScopesMayOverlap(candidate, rule)) {
      const resolution = resolveOverlap(candidate, rule);
      relationships.push({
        kind: resolution === 'AMBIGUOUS' ? 'CONFLICT' : 'OVERLAP',
        ruleId: rule.id,
        ruleName: rule.name,
        resolution,
      });
    }
  }

  return relationships;
}

export function findImportRuleRelationship(
  candidate: ComparableImportRule,
  rules: readonly Pick<
    ImportRuleModel,
    keyof ComparableImportRule | 'id' | 'name'
  >[],
  options: { excludeRuleId?: string } = {},
): ImportRuleRelationship {
  return findImportRuleRelationships(candidate, rules, options)[0] ?? {
    kind: 'NONE',
  };
}
