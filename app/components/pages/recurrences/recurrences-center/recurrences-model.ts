import type {
  RecurrenceCandidate,
  RecurrenceLogicalDate,
  RecurrencesData,
  RecurrenceSummaryItem,
} from '@/app/types/recurrence';
import type { SubscriptionItem, SubscriptionsData } from '@/app/types/subscription';
import type { RecurrenceFrequency } from '@/app/types/transaction';
import { logicalDateFromInstant } from '@/app/lib/date/logical-date';

export type SubscriptionReviewReason = 'STALE' | 'POSSIBLE' | 'PRICE' | 'DUPLICATE';

export type ReviewEntry =
  | { kind: 'subscription'; key: string; reason: SubscriptionReviewReason; item: SubscriptionItem; duplicateOf?: SubscriptionItem[] }
  | { kind: 'candidate'; key: string; candidate: RecurrenceCandidate };

type Money = (cents: number, currency: string) => string;

const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

export function frequencyLabel(frequency: RecurrenceFrequency, interval: number) {
  if (frequency === 'WEEKLY') return interval === 1 ? 'Semanal' : `A cada ${interval} semanas`;
  if (frequency === 'MONTHLY') return interval === 1 ? 'Mensal' : `A cada ${interval} meses`;
  return interval === 1 ? 'Anual' : `A cada ${interval} anos`;
}

export function dateLabel(value: RecurrenceLogicalDate) {
  return [value.day, value.month].map((part) => String(part).padStart(2, '0')).join('/') + '/' + value.year;
}

export function shortDate(value: RecurrenceLogicalDate) {
  return `${String(value.day).padStart(2, '0')} ${MONTHS[value.month - 1]}`;
}

export function logicalToday(now: Date = new Date()): RecurrenceLogicalDate {
  return logicalDateFromInstant(now);
}

export function daysUntil(date: RecurrenceLogicalDate, today: RecurrenceLogicalDate) {
  return Math.round(
    (Date.UTC(date.year, date.month - 1, date.day) - Date.UTC(today.year, today.month - 1, today.day)) / 86_400_000,
  );
}

export function relativeDays(days: number) {
  if (days === 0) return 'hoje';
  if (days === 1) return 'amanhã';
  if (days === -1) return 'ontem';
  return days > 0 ? `em ${days} dias` : `há ${Math.abs(days)} dias`;
}

export function formatAmountInput(amount: number) {
  return `${Math.floor(amount / 100)},${String(amount % 100).padStart(2, '0')}`;
}

export function parseAmountInput(value: string) {
  const normalized = value.trim().replace(/\s/g, '').replace(/\./g, '').replace(',', '.');
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) return null;

  const [whole, fraction = ''] = normalized.split('.');
  const cents = Number.parseInt(whole, 10) * 100 + Number.parseInt((fraction + '00').slice(0, 2), 10);

  return Number.isSafeInteger(cents) && cents > 0 ? cents : null;
}

/** Próxima série a lançar, em qualquer moeda (a data é o critério). */
export function nextFormal(items: RecurrenceSummaryItem[]) {
  return [...items].sort(
    (left, right) =>
      Date.UTC(left.nextOccurrence.year, left.nextOccurrence.month - 1, left.nextOccurrence.day) -
      Date.UTC(right.nextOccurrence.year, right.nextOccurrence.month - 1, right.nextOccurrence.day),
  )[0] ?? null;
}

function duplicateKey(item: SubscriptionItem) {
  const base = item.merchant
    ? `merchant:${item.merchant.id}`
    : `name:${item.description
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .trim()}`;
  return `${item.currency}:${base}`;
}

/**
 * Assinaturas ativas que parecem a mesma cobrança duas vezes: mesma moeda e mesmo estabelecimento (ou mesma
 * descrição, quando não há estabelecimento). Devolve, por assinatura, as outras do grupo. Quem já encerrou
 * (`possiblyEnded`) não conta, e a mesma assinatura em duas listas é uma só.
 */
export function findDuplicateSubscriptions(data: SubscriptionsData): Map<string, SubscriptionItem[]> {
  const unique = new Map<string, SubscriptionItem>();
  for (const item of [...data.confirmed, ...data.possible]) {
    if (!item.possiblyEnded && !unique.has(item.id)) unique.set(item.id, item);
  }

  const groups = new Map<string, SubscriptionItem[]>();
  for (const item of unique.values()) {
    const key = duplicateKey(item);
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }

  const result = new Map<string, SubscriptionItem[]>();
  for (const group of groups.values()) {
    if (group.length < 2) continue;
    for (const item of group) result.set(item.id, group.filter((other) => other.id !== item.id));
  }
  return result;
}

/**
 * Fila "Para revisar": uma entrada por assinatura (sem duplicar quem aparece em mais de uma lista) e uma por
 * padrão detectado. Ordem: preço alterado, possível duplicidade, sem cobrança recente, possível assinatura, padrões.
 */
export function buildReviewQueue(data: RecurrencesData, ignored: ReadonlySet<string>): ReviewEntry[] {
  const seen = new Set<string>();
  const stale: ReviewEntry[] = [];
  const possible: ReviewEntry[] = [];
  const price: ReviewEntry[] = [];
  const duplicate: ReviewEntry[] = [];
  const duplicates = findDuplicateSubscriptions(data.subscriptions);

  const add = (item: SubscriptionItem, reason: SubscriptionReviewReason, bucket: ReviewEntry[]) => {
    if (seen.has(item.id) || ignored.has(item.id)) return;
    seen.add(item.id);
    bucket.push({ kind: 'subscription', key: `subscription:${item.id}`, reason, item, duplicateOf: duplicates.get(item.id) });
  };

  for (const item of data.subscriptions.confirmed) if (item.requiresActivityReview) add(item, 'STALE', stale);
  for (const item of data.subscriptions.possible) add(item, 'POSSIBLE', possible);
  for (const item of data.subscriptions.priceChanges) add(item, 'PRICE', price);
  for (const item of [...data.subscriptions.confirmed, ...data.subscriptions.possible]) {
    if (duplicates.has(item.id)) add(item, 'DUPLICATE', duplicate);
  }

  const candidates: ReviewEntry[] = data.candidates
    .filter((candidate) => !ignored.has(candidate.id))
    .map((candidate) => ({ kind: 'candidate', key: `candidate:${candidate.id}`, candidate }));

  return [...price, ...duplicate, ...stale, ...possible, ...candidates];
}

export function currencyTotals(data: RecurrencesData, currency: string) {
  return {
    recurrences: data.totals.find((total) => total.currency === currency) ?? null,
    subscriptions: data.subscriptions.totals.find((total) => total.currency === currency) ?? null,
  };
}

export function buildLede({
  formal,
  today,
  money,
}: {
  formal: RecurrenceSummaryItem[];
  today: RecurrenceLogicalDate;
  money: Money;
}) {
  if (formal.length === 0) {
    return 'Nenhuma recorrência ativa. Confirme um padrão detectado ou crie uma nova para acompanhar seus custos fixos.';
  }
  const next = nextFormal(formal)!;
  return `Você tem ${formal.length} ${formal.length === 1 ? 'recorrência ativa' : 'recorrências ativas'}. A próxima é ${next.description}, ${relativeDays(daysUntil(next.nextOccurrence, today))} (${money(next.amount, next.currency)}).`;
}
