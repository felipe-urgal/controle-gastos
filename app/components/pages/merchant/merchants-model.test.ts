import { describe, expect, it } from 'vitest';

import {
  joinNames,
  pickSpend,
  shareWidth,
  spendDelta,
  spendDeltaLabel,
  topShare,
} from '@/app/components/pages/merchant/merchants-model';

describe('pickSpend', () => {
  const spend = [
    { currency: 'BRL' as const, expense: 100, previousExpense: 0, count: 1 },
    { currency: 'USD' as const, expense: 50, previousExpense: 0, count: 1 },
  ];

  it('prefere a moeda do resumo e cai na primeira disponível', () => {
    expect(pickSpend(spend, 'USD')?.currency).toBe('USD');
    expect(pickSpend(spend, 'EUR')?.currency).toBe('BRL');
    expect(pickSpend([], 'BRL')).toBeNull();
    expect(pickSpend(undefined, 'BRL')).toBeNull();
  });
});

describe('spendDelta', () => {
  it('classifica a variação contra o mês anterior', () => {
    expect(spendDelta(null).kind).toBe('NONE');
    expect(spendDelta({ expense: 0, previousExpense: 500 }).kind).toBe('NONE');
    expect(spendDelta({ expense: 500, previousExpense: 0 }).kind).toBe('NEW');
    expect(spendDelta({ expense: 500, previousExpense: 500 }).kind).toBe('SAME');
    expect(spendDelta({ expense: 1_470, previousExpense: 1_000 })).toEqual({ kind: 'UP', percent: 47 });
    expect(spendDelta({ expense: 500, previousExpense: 1_000 })).toEqual({ kind: 'DOWN', percent: 50 });
  });

  it('escreve o rótulo', () => {
    expect(spendDeltaLabel({ kind: 'UP', percent: 47 })).toBe('+47%');
    expect(spendDeltaLabel({ kind: 'DOWN', percent: 5 })).toBe('−5%');
    expect(spendDeltaLabel({ kind: 'NEW', percent: 0 })).toBe('novo no mês');
    expect(spendDeltaLabel({ kind: 'NONE', percent: 0 })).toBe('');
  });
});

describe('shareWidth', () => {
  it('é relativa ao maior, com mínimo de 4 e zero sem gasto', () => {
    expect(shareWidth(50, 100)).toBe(50);
    expect(shareWidth(1, 1_000)).toBe(4);
    expect(shareWidth(0, 100)).toBe(0);
    expect(shareWidth(10, 0)).toBe(0);
  });
});

describe('topShare / joinNames', () => {
  it('calcula a participação dos maiores e junta nomes em português', () => {
    expect(topShare({ currency: 'BRL', assigned: 1_000, unassigned: 0, top: [{ id: 'a', name: 'A', expense: 600 }, { id: 'b', name: 'B', expense: 150 }] })).toBe(75);
    expect(topShare({ currency: 'BRL', assigned: 0, unassigned: 10, top: [] })).toBeNull();
    expect(joinNames(['A'])).toBe('A');
    expect(joinNames(['A', 'B'])).toBe('A e B');
    expect(joinNames(['A', 'B', 'C'])).toBe('A, B e C');
  });
});
