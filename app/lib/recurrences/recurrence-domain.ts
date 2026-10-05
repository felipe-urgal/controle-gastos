import { createHash } from 'node:crypto';

import { isSupportedCurrency, type SupportedCurrency } from '@/app/types/financial-summary';
import type { RecurrenceFrequency, TransactionType } from '@/app/types/transaction';
import {
  getLogicalRecurrenceDateAtIndex,
  type LogicalRecurrenceFrequency,
} from '@/app/lib/transactions/logical-recurrence';

export const RECURRENCE_CANDIDATE_WINDOW_MONTHS = 36;
export const RECURRENCE_CANDIDATE_HISTORY_LIMIT = 1000;
export const RECURRENCE_VALUE_TOLERANCE_PERCENT = 5;
export const RECURRENCE_VALUE_TOLERANCE_MIN_CENTS = 100;

export type CandidateTransaction = {
  id: string;
  amount: number;
  description: string;
  type: TransactionType;
  year: number;
  month: number;
  day: number;
  account: {
    id: string;
    name: string;
    currency: string;
  };
  category: {
    id: string;
    name: string;
  } | null;
  merchant?: {
    id: string;
    name: string;
  } | null;
};

export type DetectedRecurrenceCandidate = {
  id: string;
  signature: string;
  description: string;
  normalizedDescription: string;
  type: TransactionType;
  frequency: RecurrenceFrequency;
  interval: number;
  amount: number;
  minAmount: number;
  maxAmount: number;
  variableAmount: boolean;
  currency: SupportedCurrency;
  monthlyEquivalent: number;
  annualEquivalent: number;
  nextOccurrence: { year: number; month: number; day: number };
  occurrenceCount: number;
  explanation: string;
  evidence: Array<{
    id: string;
    amount: number;
    description: string;
    year: number;
    month: number;
    day: number;
  }>;
  account: { id: string; name: string };
  category: { id: string; name: string };
  merchant: { id: string; name: string } | null;
};

const supportedRules: Array<{
  frequency: LogicalRecurrenceFrequency;
  interval: number;
}> = [
  { frequency: 'WEEKLY', interval: 1 },
  { frequency: 'WEEKLY', interval: 2 },
  { frequency: 'MONTHLY', interval: 1 },
  { frequency: 'MONTHLY', interval: 3 },
  { frequency: 'YEARLY', interval: 1 },
];

export function normalizeRecurrenceDescription(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

export function recurrenceEquivalents(
  amount: number,
  frequency: RecurrenceFrequency,
  interval: number,
) {
  if (!Number.isInteger(amount) || amount < 0 || !Number.isInteger(interval) || interval < 1) {
    throw new Error('Recorrência inválida');
  }

  switch (frequency) {
    case 'WEEKLY':
      return {
        monthlyEquivalent: Math.round((amount * 52) / (12 * interval)),
        annualEquivalent: Math.round((amount * 52) / interval),
      };
    case 'MONTHLY':
      return {
        monthlyEquivalent: Math.round(amount / interval),
        annualEquivalent: Math.round((amount * 12) / interval),
      };
    case 'YEARLY':
      return {
        monthlyEquivalent: Math.round(amount / (12 * interval)),
        annualEquivalent: Math.round(amount / interval),
      };
  }
}

function utcDay(value: { year: number; month: number; day: number }) {
  return Math.floor(Date.UTC(value.year, value.month - 1, value.day) / 86_400_000);
}

function matchesRule(
  items: CandidateTransaction[],
  frequency: LogicalRecurrenceFrequency,
  interval: number,
) {
  const start = items[0];
  if (!start) return false;

  return items.every((item, index) => {
    const expected = getLogicalRecurrenceDateAtIndex({
      start,
      frequency,
      interval,
      index,
    });
    return Math.abs(utcDay(item) - utcDay(expected)) <= 3;
  });
}

function inferRule(items: CandidateTransaction[]) {
  for (const rule of supportedRules) {
    if (matchesRule(items, rule.frequency, rule.interval)) return rule;
  }
  return null;
}

function medianAmount(values: number[]) {
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.floor(sorted.length / 2)] ?? 0;
}

export function recurrencePatternId(signature: string) {
  return createHash('sha256').update(signature).digest('hex').slice(0, 24);
}

export function recurrenceSourceKey(
  source: 'candidate' | 'subscription',
  patternId: string,
) {
  return `${source}:${patternId}`;
}

export function recurrencePatternSignature(input: {
  accountId: string;
  categoryId: string;
  type: TransactionType;
  merchantId?: string | null;
  description: string;
  frequency: RecurrenceFrequency;
  interval: number;
}) {
  const identity = input.merchantId
    ? `merchant:${input.merchantId}`
    : `description:${normalizeRecurrenceDescription(input.description)}`;

  return [
    input.accountId,
    input.categoryId,
    input.type,
    identity,
    input.frequency,
    String(input.interval),
  ].join('|');
}

function cadenceLabel(frequency: RecurrenceFrequency, interval: number) {
  if (frequency === 'WEEKLY') return interval === 1 ? 'semanal' : 'quinzenal';
  if (frequency === 'MONTHLY') return interval === 1 ? 'mensal' : 'trimestral';
  return 'anual';
}

export function detectRecurrenceCandidates(
  transactions: CandidateTransaction[],
): DetectedRecurrenceCandidate[] {
  const groups = new Map<string, CandidateTransaction[]>();

  for (const transaction of transactions) {
    if (!transaction.category || !isSupportedCurrency(transaction.account.currency)) continue;
    const normalized = normalizeRecurrenceDescription(transaction.description);
    if (!transaction.merchant && normalized.length < 3) continue;

    const identity = transaction.merchant
      ? `merchant:${transaction.merchant.id}`
      : `description:${normalized}`;
    const key = [
      transaction.account.id,
      transaction.category.id,
      transaction.type,
      transaction.account.currency,
      identity,
    ].join('|');
    const current = groups.get(key) ?? [];
    current.push(transaction);
    groups.set(key, current);
  }

  const candidates: DetectedRecurrenceCandidate[] = [];

  for (const items of groups.values()) {
    if (items.length < 3) continue;

    items.sort((left, right) => utcDay(left) - utcDay(right));
    const rule = inferRule(items);
    if (!rule) continue;

    const amounts = items.map((item) => item.amount);
    const amount = medianAmount(amounts);
    const tolerance = Math.max(
      RECURRENCE_VALUE_TOLERANCE_MIN_CENTS,
      Math.floor((amount * RECURRENCE_VALUE_TOLERANCE_PERCENT) / 100),
    );
    if (amounts.some((value) => Math.abs(value - amount) > tolerance)) continue;

    const first = items[0]!;
    const last = items.at(-1)!;
    const category = first.category!;
    const currency = first.account.currency as SupportedCurrency;
    const nextOccurrence = getLogicalRecurrenceDateAtIndex({
      start: first,
      frequency: rule.frequency,
      interval: rule.interval,
      index: items.length,
    });
    const equivalents = recurrenceEquivalents(amount, rule.frequency, rule.interval);
    const signature = recurrencePatternSignature({
      accountId: first.account.id,
      categoryId: category.id,
      type: first.type,
      merchantId: first.merchant?.id,
      description: first.description,
      frequency: rule.frequency,
      interval: rule.interval,
    });
    const basis = first.merchant
      ? `mesmo estabelecimento (${first.merchant.name})`
      : 'mesma descrição normalizada';

    candidates.push({
      id: recurrencePatternId(signature),
      signature,
      description: first.merchant?.name ?? last.description,
      normalizedDescription: normalizeRecurrenceDescription(first.description),
      type: first.type,
      frequency: rule.frequency,
      interval: rule.interval,
      amount,
      minAmount: Math.min(...amounts),
      maxAmount: Math.max(...amounts),
      variableAmount: new Set(amounts).size > 1,
      currency,
      ...equivalents,
      nextOccurrence,
      occurrenceCount: items.length,
      explanation: `${items.length} ocorrências com ${basis}, padrão ${cadenceLabel(rule.frequency, rule.interval)} e variação máxima de 3 dias.`,
      evidence: items.map((item) => ({
        id: item.id,
        amount: item.amount,
        description: item.description,
        year: item.year,
        month: item.month,
        day: item.day,
      })),
      account: { id: first.account.id, name: first.account.name },
      category: { id: category.id, name: category.name },
      merchant: first.merchant
        ? { id: first.merchant.id, name: first.merchant.name }
        : null,
    });
  }

  return candidates.sort((left, right) => {
    if (left.currency !== right.currency) return left.currency.localeCompare(right.currency);
    return left.description.localeCompare(right.description, 'pt-BR');
  });
}
