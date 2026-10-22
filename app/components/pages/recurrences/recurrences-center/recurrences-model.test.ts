import { describe, expect, it } from 'vitest';

import {
  buildLede,
  buildReviewQueue,
  currencyTotals,
  daysUntil,
  formatAmountInput,
  nextFormal,
  parseAmountInput,
  relativeDays,
} from '@/app/components/pages/recurrences/recurrences-center/recurrences-model';
import type { RecurrenceCandidate, RecurrencesData, RecurrenceSummaryItem } from '@/app/types/recurrence';
import type { SubscriptionItem } from '@/app/types/subscription';

const today = { year: 2026, month: 10, day: 22 };
const money = (cents: number, currency: string) => `${currency} ${(cents / 100).toFixed(2)}`;

function formal(id: string, nextOccurrence: RecurrenceSummaryItem['nextOccurrence'], amount = 1000): RecurrenceSummaryItem {
  return {
    id,
    transactionId: `t-${id}`,
    source: 'FORMAL',
    description: id,
    type: 'EXPENSE',
    frequency: 'MONTHLY',
    interval: 1,
    amount,
    variableAmount: false,
    currency: 'BRL',
    monthlyEquivalent: amount,
    annualEquivalent: amount * 12,
    nextOccurrence,
    occurrenceCount: 12,
    remainingOccurrences: 5,
    account: { id: 'a', name: 'Nubank' },
    category: { id: 'c', name: 'Moradia' },
    merchant: null,
  };
}

function subscription(id: string, partial: Partial<SubscriptionItem> = {}): SubscriptionItem {
  return {
    id,
    status: 'CONFIRMED',
    description: id,
    frequency: 'MONTHLY',
    interval: 1,
    currency: 'BRL',
    currentAmount: 1000,
    typicalAmount: 1000,
    minAmount: 1000,
    maxAmount: 1000,
    monthlyEquivalent: 1000,
    annualEquivalent: 12000,
    lastCharge: today,
    nextCharge: today,
    occurrenceCount: 4,
    priceChange: null,
    possiblyEnded: false,
    requiresActivityReview: false,
    activeForTotals: true,
    recurrenceSeriesId: null,
    explanation: '',
    evidence: [],
    account: { id: 'a', name: 'Nubank' },
    category: { id: 'c', name: 'Assinaturas' },
    merchant: null,
    ...partial,
  };
}

function data(partial: Partial<RecurrencesData> = {}): RecurrencesData {
  return {
    formal: [],
    candidates: [],
    totals: [],
    subscriptions: { confirmed: [], possible: [], priceChanges: [], totals: [], windowMonths: 12 },
    candidateWindowMonths: 12,
    candidateHistoryLimit: 500,
    ...partial,
  };
}

describe('recurrences-model', () => {
  it('conta dias e escreve o tempo relativo', () => {
    expect(daysUntil({ year: 2026, month: 10, day: 26 }, today)).toBe(4);
    expect(daysUntil({ year: 2026, month: 11, day: 1 }, today)).toBe(10);
    expect(relativeDays(0)).toBe('hoje');
    expect(relativeDays(1)).toBe('amanhã');
    expect(relativeDays(14)).toBe('em 14 dias');
    expect(relativeDays(-3)).toBe('há 3 dias');
  });

  it('lê e escreve valores em centavos sem aceitar entrada inválida', () => {
    expect(parseAmountInput('1.234,56')).toBe(123456);
    expect(parseAmountInput('55,9')).toBe(5590);
    expect(parseAmountInput('0')).toBeNull();
    expect(parseAmountInput('abc')).toBeNull();
    expect(formatAmountInput(5590)).toBe('55,90');
  });

  it('escolhe a próxima série e descreve o resumo sem recorrências', () => {
    const items = [formal('Condomínio', { year: 2026, month: 11, day: 10 }), formal('Aluguel', { year: 2026, month: 10, day: 26 }, 210000)];
    expect(nextFormal(items)?.id).toBe('Aluguel');
    expect(buildLede({ formal: items, today, money })).toBe('Você tem 2 recorrências ativas. A próxima é Aluguel, em 4 dias (BRL 2100.00).');
    expect(buildLede({ formal: [], today, money })).toContain('Nenhuma recorrência ativa');
  });

  it('monta a fila de revisão sem duplicar assinaturas e respeitando o que foi ignorado', () => {
    const netflix = subscription('netflix', { priceChange: { previousAmount: 4590, currentAmount: 5590, difference: 1000, percent: 21.8 } });
    const prime = subscription('prime', { requiresActivityReview: true });
    const disney = subscription('disney', { status: 'POSSIBLE', priceChange: { previousAmount: 3000, currentAmount: 3390, difference: 390, percent: 13 } });
    const candidate = { id: 'spotify' } as RecurrenceCandidate;
    const value = data({
      candidates: [candidate],
      subscriptions: { confirmed: [netflix, prime], possible: [disney], priceChanges: [netflix, disney], totals: [], windowMonths: 12 },
    });

    const queue = buildReviewQueue(value, new Set());
    expect(queue.map((entry) => entry.key)).toEqual([
      'subscription:netflix',
      'subscription:prime',
      'subscription:disney',
      'candidate:spotify',
    ]);
    expect(queue.map((entry) => (entry.kind === 'subscription' ? entry.reason : 'CANDIDATE'))).toEqual(['PRICE', 'STALE', 'POSSIBLE', 'CANDIDATE']);
    expect(buildReviewQueue(value, new Set(['netflix', 'spotify'])).map((entry) => entry.key)).toEqual(['subscription:prime', 'subscription:disney']);
  });

  it('separa os totais por moeda', () => {
    const value = data({
      totals: [{ currency: 'BRL', monthlyEquivalent: 100, annualEquivalent: 1200 }],
      subscriptions: { confirmed: [], possible: [], priceChanges: [], totals: [{ currency: 'USD', monthlyEquivalent: 5, annualEquivalent: 60 }], windowMonths: 12 },
    });
    expect(currencyTotals(value, 'BRL')).toMatchObject({ recurrences: { monthlyEquivalent: 100 }, subscriptions: null });
    expect(currencyTotals(value, 'USD')).toMatchObject({ recurrences: null, subscriptions: { monthlyEquivalent: 5 } });
  });
});
