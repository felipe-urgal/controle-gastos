import { describe, expect, it } from 'vitest';

import {
  aliasOperatorLabel,
  buildHistoryBars,
  describeMonth,
  longMonthLabel,
} from '@/app/components/pages/merchant/show/merchant-show-model';

const money = (cents: number) => `R$ ${(cents / 100).toFixed(2)}`;
const month = (expense: number, previousExpense: number) => ({ year: 2026, month: 10, expense, previousExpense, count: 2 });

describe('buildHistoryBars', () => {
  const history = [0, 0, 2_000, 0, 1_000, 4_000].map((expense, index) => ({ year: 2026, month: index + 5, expense }));

  it('escala pela maior despesa e marca o mês atual', () => {
    const bars = buildHistoryBars(history);

    expect(bars.map((bar) => bar.heightPercent)).toEqual([0, 0, 50, 0, 25, 100]);
    expect(bars[5]).toMatchObject({ current: true, label: 'out' });
    expect(buildHistoryBars([{ year: 2026, month: 1, expense: 1 }, { year: 2026, month: 2, expense: 1_000 }])[0].heightPercent).toBe(4);
  });
});

describe('describeMonth', () => {
  it('compara com o mês anterior e com a média', () => {
    expect(describeMonth({ month: month(1_470, 1_000), previousAverage: 1_000, money })).toEqual([
      '47% acima de setembro (R$ 10.00)',
      '47% acima da média dos meses anteriores',
    ]);
  });

  it('avisa quando não havia gasto no mês anterior e ignora variação pequena da média', () => {
    expect(describeMonth({ month: month(1_050, 0), previousAverage: 1_000, money })).toEqual(['Sem gastos no mês anterior']);
  });

  it('fica em silêncio sem gasto no mês e trata janeiro', () => {
    expect(describeMonth({ month: month(0, 500), previousAverage: 500, money })).toEqual([]);
    expect(describeMonth({ month: { ...month(500, 1_000), month: 1 }, previousAverage: 0, money })).toEqual(['50% abaixo de dezembro (R$ 10.00)']);
  });
});

describe('rótulos', () => {
  it('conhece os meses e os operadores de alias', () => {
    expect(longMonthLabel(3)).toBe('março');
    expect(aliasOperatorLabel('STARTS_WITH')).toBe('começa com');
  });
});
