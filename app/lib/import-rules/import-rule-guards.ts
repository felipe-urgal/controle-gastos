import type {
  ImportRuleDescriptionOperator,
  ImportRuleInput,
  ImportRuleModel,
} from '@/app/types/import-rule';

export const BROAD_IMPORT_RULE_MIN_PATTERN_LENGTH = 3;

type ComparableImportRule = Pick<
  ImportRuleInput,
  | 'accountId'
  | 'transactionType'
  | 'descriptionOperator'
  | 'descriptionPattern'
  | 'minAmountCents'
  | 'maxAmountCents'
  | 'categoryId'
  | 'normalizedDescription'
>;

export type ImportRuleRelationship =
  | { kind: 'NONE' }
  | { kind: 'EQUIVALENT'; ruleId: string; ruleName: string }
  | { kind: 'CONFLICT'; ruleId: string; ruleName: string };

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

export function findImportRuleRelationship(
  candidate: ComparableImportRule,
  rules: readonly Pick<
    ImportRuleModel,
    keyof ComparableImportRule | 'id' | 'name'
  >[],
  options: { excludeRuleId?: string } = {},
): ImportRuleRelationship {
  for (const rule of rules) {
    if (rule.id === options.excludeRuleId) continue;
    if (!sameMatcher(candidate, rule)) continue;

    return sameOutcome(candidate, rule)
      ? { kind: 'EQUIVALENT', ruleId: rule.id, ruleName: rule.name }
      : { kind: 'CONFLICT', ruleId: rule.id, ruleName: rule.name };
  }

  return { kind: 'NONE' };
}
