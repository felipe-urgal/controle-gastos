import { createHash } from 'node:crypto';

import { isSupportedCurrency, type SupportedCurrency } from '@/app/types/financial-summary';
import {
  normalizeRecurrenceDescription,
  recurrenceEquivalents,
  type CandidateTransaction,
} from '@/app/lib/recurrences/recurrence-domain';
import {
  getLogicalRecurrenceDateAtIndex,
  type LogicalRecurrenceFrequency,
} from '@/app/lib/transactions/logical-recurrence';
import type { RecurrenceFrequency } from '@/app/types/transaction';

export const SUBSCRIPTION_WINDOW_MONTHS = 36;
export const SUBSCRIPTION_HISTORY_LIMIT = 1000;
export const SUBSCRIPTION_DATE_TOLERANCE_DAYS = 3;
export const SUBSCRIPTION_PRICE_TOLERANCE_PERCENT = 5;
export const SUBSCRIPTION_PRICE_TOLERANCE_MIN_CENTS = 100;
export const SUBSCRIPTION_PRICE_CHANGE_MIN_OCCURRENCES = 4;

type SubscriptionRule = {
  frequency: LogicalRecurrenceFrequency;
  interval: number;
};

const supportedRules: SubscriptionRule[] = [
  { frequency: 'WEEKLY', interval: 1 },
  { frequency: 'WEEKLY', interval: 2 },
  { frequency: 'MONTHLY', interval: 1 },
  { frequency: 'MONTHLY', interval: 3 },
  { frequency: 'YEARLY', interval: 1 },
];

export type SubscriptionPriceChange = {
  previousAmount: number;
  currentAmount: number;
  difference: number;
  percent: number;
};

export type DetectedSubscription = {
  id: string;
  description: string;
  frequency: RecurrenceFrequency;
  interval: number;
  currency: SupportedCurrency;
  currentAmount: number;
  typicalAmount: number;
  minAmount: number;
  maxAmount: number;
  monthlyEquivalent: number;
  annualEquivalent: number;
  lastCharge: { year: number; month: number; day: number };
  nextCharge: { year: number; month: number; day: number };
  occurrenceCount: number;
  priceChange: SubscriptionPriceChange | null;
  possiblyEnded: boolean;
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

function utcDay(value: { year: number; month: number; day: number }) {
  return Math.floor(Date.UTC(value.year, value.month - 1, value.day) / 86_400_000);
}

function median(values: number[]) {
  const sorted = [...values].sort((left, right) => left - right);
  if (sorted.length === 0) return 0;
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[middle] ?? 0;
  return Math.round(((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2);
}

function stableAround(values: number[], baseline: number) {
  const tolerance = Math.max(
    SUBSCRIPTION_PRICE_TOLERANCE_MIN_CENTS,
    Math.floor((baseline * SUBSCRIPTION_PRICE_TOLERANCE_PERCENT) / 100),
  );
  return values.every((value) => Math.abs(value - baseline) <= tolerance);
}

function detectPriceChange(items: CandidateTransaction[]): SubscriptionPriceChange | null {
  if (items.length < SUBSCRIPTION_PRICE_CHANGE_MIN_OCCURRENCES) return null;

  const currentValues = items.slice(-2).map((item) => item.amount);
  const previousValues = items.slice(0, -2).map((item) => item.amount);
  const currentAmount = median(currentValues);
  const previousAmount = median(previousValues);

  if (previousAmount <= 0) return null;
  if (!stableAround(currentValues, currentAmount) || !stableAround(previousValues, previousAmount)) {
    return null;
  }

  const difference = currentAmount - previousAmount;
  const relevantDifference = Math.max(
    SUBSCRIPTION_PRICE_TOLERANCE_MIN_CENTS,
    Math.floor((previousAmount * SUBSCRIPTION_PRICE_TOLERANCE_PERCENT) / 100),
  );
  if (Math.abs(difference) < relevantDifference) return null;

  return {
    previousAmount,
    currentAmount,
    difference,
    percent: Math.round((difference * 10_000) / previousAmount) / 100,
  };
}

function groupIdentity(transaction: CandidateTransaction) {
  const normalized = normalizeRecurrenceDescription(transaction.description);
  if (!transaction.merchant && normalized.length < 3) return null;

  return transaction.merchant
    ? `merchant:${transaction.merchant.id}`
    : `description:${normalized}`;
}

function subscriptionPatternId(transaction: CandidateTransaction) {
  const identity = groupIdentity(transaction);
  if (!identity || !transaction.category) return '';

  const signature = [
    transaction.account.id,
    transaction.category.id,
    transaction.account.currency,
    identity,
  ].join('|');

  return createHash('sha256').update(signature).digest('hex').slice(0, 24);
}

function findBestCadence(items: CandidateTransaction[]) {
  let best: { rule: SubscriptionRule; items: CandidateTransaction[] } | null = null;

  for (const rule of supportedRules) {
    for (let startIndex = 0; startIndex < items.length; startIndex += 1) {
      const start = items[startIndex];
      if (!start) continue;

      const matched = [start];
      let searchFrom = startIndex + 1;

      for (let occurrenceIndex = 1; searchFrom < items.length; occurrenceIndex += 1) {
        const expected = getLogicalRecurrenceDateAtIndex({
          start,
          frequency: rule.frequency,
          interval: rule.interval,
          index: occurrenceIndex,
        });
        const expectedDay = utcDay(expected);
        let matchIndex = -1;

        for (let index = searchFrom; index < items.length; index += 1) {
          const item = items[index]!;
          const delta = utcDay(item) - expectedDay;
          if (Math.abs(delta) <= SUBSCRIPTION_DATE_TOLERANCE_DAYS) {
            matchIndex = index;
            break;
          }
          if (delta > SUBSCRIPTION_DATE_TOLERANCE_DAYS) break;
        }

        if (matchIndex === -1) break;
        matched.push(items[matchIndex]!);
        searchFrom = matchIndex + 1;
      }

      if (
        matched.length >= 3 &&
        (!best || matched.length > best.items.length)
      ) {
        best = { rule, items: matched };
      }
    }
  }

  return best;
}

function addRuleOnce(
  value: { year: number; month: number; day: number },
  rule: SubscriptionRule,
) {
  return getLogicalRecurrenceDateAtIndex({
    start: value,
    frequency: rule.frequency,
    interval: rule.interval,
    index: 1,
  });
}

function isPossiblyEnded(
  nextCharge: { year: number; month: number; day: number },
  rule: SubscriptionRule,
  today: { year: number; month: number; day: number },
) {
  const secondExpected = addRuleOnce(nextCharge, rule);
  return utcDay(today) > utcDay(secondExpected) + SUBSCRIPTION_DATE_TOLERANCE_DAYS;
}

function cadenceLabel(rule: SubscriptionRule) {
  if (rule.frequency === 'WEEKLY') return rule.interval === 1 ? 'semanal' : 'quinzenal';
  if (rule.frequency === 'MONTHLY') return rule.interval === 1 ? 'mensal' : 'trimestral';
  return 'anual';
}

export function detectSubscriptions(
  transactions: CandidateTransaction[],
  today = (() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() };
  })(),
): DetectedSubscription[] {
  const groups = new Map<string, CandidateTransaction[]>();

  for (const transaction of transactions) {
    if (
      transaction.type !== 'EXPENSE' ||
      !transaction.category ||
      !isSupportedCurrency(transaction.account.currency)
    ) {
      continue;
    }

    const identity = groupIdentity(transaction);
    if (!identity) continue;

    const key = [
      transaction.account.id,
      transaction.category.id,
      transaction.account.currency,
      identity,
    ].join('|');

    const current = groups.get(key) ?? [];
    current.push(transaction);
    groups.set(key, current);
  }

  const detected: DetectedSubscription[] = [];

  for (const group of groups.values()) {
    group.sort((left, right) => utcDay(left) - utcDay(right));
    const cadence = findBestCadence(group);
    if (!cadence) continue;

    const evidence = cadence.items;
    const first = evidence[0]!;
    const last = evidence.at(-1)!;
    const category = first.category!;
    const currency = first.account.currency as SupportedCurrency;
    const amounts = evidence.map((item) => item.amount);
    const typicalAmount = median(amounts);
    const priceChange = detectPriceChange(evidence);
    const currentAmount = priceChange?.currentAmount ?? last.amount;
    const nextCharge = getLogicalRecurrenceDateAtIndex({
      start: first,
      frequency: cadence.rule.frequency,
      interval: cadence.rule.interval,
      index: evidence.length,
    });
    const equivalents = recurrenceEquivalents(
      currentAmount,
      cadence.rule.frequency,
      cadence.rule.interval,
    );
    const ignoredExtras = group.length - evidence.length;

    detected.push({
      id: subscriptionPatternId(first),
      description: first.merchant?.name ?? last.description,
      frequency: cadence.rule.frequency,
      interval: cadence.rule.interval,
      currency,
      currentAmount,
      typicalAmount,
      minAmount: Math.min(...amounts),
      maxAmount: Math.max(...amounts),
      ...equivalents,
      lastCharge: { year: last.year, month: last.month, day: last.day },
      nextCharge,
      occurrenceCount: evidence.length,
      priceChange,
      possiblyEnded: isPossiblyEnded(nextCharge, cadence.rule, today),
      explanation:
        `${evidence.length} cobranças com padrão ${cadenceLabel(cadence.rule)}` +
        (first.merchant ? ` no estabelecimento ${first.merchant.name}` : '') +
        (ignoredExtras > 0 ? `; ${ignoredExtras} compra(s) avulsa(s) foram desconsideradas` : '') +
        '.',
      evidence: evidence.map((item) => ({
        id: item.id,
        amount: item.amount,
        description: item.description,
        year: item.year,
        month: item.month,
        day: item.day,
      })),
      account: { id: first.account.id, name: first.account.name },
      category: { id: category.id, name: category.name },
      merchant: first.merchant ? { id: first.merchant.id, name: first.merchant.name } : null,
    });
  }

  return detected.sort((left, right) =>
    left.description.localeCompare(right.description, 'pt-BR'),
  );
}
