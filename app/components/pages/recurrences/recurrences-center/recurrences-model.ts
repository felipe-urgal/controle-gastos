import type {
  RecurrenceCandidate,
  RecurrenceLogicalDate,
  RecurrencesData,
  RecurrenceSummaryItem,
} from '@/app/types/recurrence';
import type { SubscriptionItem } from '@/app/types/subscription';
import type { RecurrenceFrequency } from '@/app/types/transaction';

export type SubscriptionReviewReason = 'STALE' | 'POSSIBLE' | 'PRICE';

export type ReviewEntry =
  | { kind: 'subscription'; key: string; reason: SubscriptionReviewReason; item: SubscriptionItem }
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
  return { year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() };
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

/**
 * Fila "Para revisar": uma entrada por assinatura (sem duplicar quem aparece em mais de uma lista) e uma por
 * padrão detectado. Ordem: preço alterado, sem cobrança recente, possível assinatura, padrões.
 */
export function buildReviewQueue(data: RecurrencesData, ignored: ReadonlySet<string>): ReviewEntry[] {
  const seen = new Set<string>();
  const stale: ReviewEntry[] = [];
  const possible: ReviewEntry[] = [];
  const price: ReviewEntry[] = [];

  const add = (item: SubscriptionItem, reason: SubscriptionReviewReason, bucket: ReviewEntry[]) => {
    if (seen.has(item.id) || ignored.has(item.id)) return;
    seen.add(item.id);
    bucket.push({ kind: 'subscription', key: `subscription:${item.id}`, reason, item });
  };

  for (const item of data.subscriptions.confirmed) if (item.requiresActivityReview) add(item, 'STALE', stale);
  for (const item of data.subscriptions.possible) add(item, 'POSSIBLE', possible);
  for (const item of data.subscriptions.priceChanges) add(item, 'PRICE', price);

  const candidates: ReviewEntry[] = data.candidates
    .filter((candidate) => !ignored.has(candidate.id))
    .map((candidate) => ({ kind: 'candidate', key: `candidate:${candidate.id}`, candidate }));

  return [...price, ...stale, ...possible, ...candidates];
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
