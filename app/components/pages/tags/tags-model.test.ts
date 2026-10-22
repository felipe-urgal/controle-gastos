import { describe, expect, it } from 'vitest';

import {
  buildTagHistoryBars,
  hasHistory,
  monthExpenseLabel,
  statusFilterParam,
} from '@/app/components/pages/tags/tags-model';

const format = (cents: number, currency: string) => `${currency} ${(cents / 100).toFixed(2)}`;

describe('monthExpenseLabel', () => {
  it('mostra o valor de uma moeda, resume várias e some sem gasto', () => {
    expect(monthExpenseLabel([{ currency: 'BRL', expense: 12_345 }], format)).toBe('BRL 123.45');
    expect(monthExpenseLabel([{ currency: 'BRL', expense: 1 }, { currency: 'USD', expense: 2 }], format)).toBe('2 moedas');
    expect(monthExpenseLabel([], format)).toBeNull();
    expect(monthExpenseLabel(undefined, format)).toBeNull();
  });
});

describe('statusFilterParam', () => {
  it('traduz o filtro para o parâmetro da API', () => {
    expect(statusFilterParam('all')).toBeUndefined();
    expect(statusFilterParam('active')).toBe('true');
    expect(statusFilterParam('archived')).toBe('false');
  });
});

describe('buildTagHistoryBars', () => {
  const points = [0, 0, 0, 1_000, 500, 4_000].map((expense, index) => ({ year: 2026, month: index + 5, income: 0, expense }));

  it('escala pela maior despesa e marca o mês atual', () => {
    const bars = buildTagHistoryBars(points);

    expect(bars.map((bar) => bar.heightPercent)).toEqual([0, 0, 0, 25, 13, 100]);
    expect(bars[5]).toMatchObject({ current: true, label: 'out' });
    expect(buildTagHistoryBars([{ year: 2026, month: 1, income: 0, expense: 1 }, { year: 2026, month: 2, income: 0, expense: 1_000 }])[0].heightPercent).toBe(4);
  });

  it('sabe quando não há despesa no histórico', () => {
    expect(hasHistory(points)).toBe(true);
    expect(hasHistory(points.map((point) => ({ ...point, expense: 0 })))).toBe(false);
  });
});
