import { describe, expect, it } from 'vitest';

import {
  buildHistoryBars,
  daysInMonth,
  describeMonth,
  limitPercent,
  limitState,
} from '@/app/components/pages/category/show/category-show-model';
import type { CategoryActivity } from '@/app/types/category';

const month = (realized: number, limit: number | null, committed = 0) => ({ year: 2026, month: 10, realized, committed, limit });
const money = (cents: number) => `R$ ${(cents / 100).toFixed(2)}`;

describe('limitState / limitPercent', () => {
  it('classifica o mês contra o limite, contando o comprometido', () => {
    expect(limitState(month(10_000, null))).toBe('NO_LIMIT');
    expect(limitState(month(50_000, 100_000))).toBe('OK');
    expect(limitState(month(90_000, 100_000))).toBe('NEAR');
    expect(limitState(month(50_000, 100_000, 40_000))).toBe('NEAR');
    expect(limitState(month(60_000, 100_000, 50_000))).toBe('OVER');
  });

  it('calcula o percentual consumido e trata limite zero', () => {
    expect(limitPercent(month(30_000, 100_000, 10_000))).toBe(40);
    expect(limitPercent(month(1, null))).toBeNull();
    expect(limitPercent(month(0, 0))).toBe(0);
    expect(limitPercent(month(100, 0))).toBe(100);
  });
});

describe('buildHistoryBars', () => {
  const history: CategoryActivity['history'] = [0, 10_000, 20_000, 0, 5_000, 40_000].map((realized, index) => ({ year: 2026, month: index + 5, realized }));

  it('escala as barras pelo maior valor e marca o mês atual', () => {
    const { bars } = buildHistoryBars(history, null);

    expect(bars.map((bar) => bar.heightPercent)).toEqual([0, 25, 50, 0, 13, 100]);
    expect(bars.map((bar) => bar.current)).toEqual([false, false, false, false, false, true]);
    expect(bars[0].label).toBe('mai');
  });

  it('inclui o limite na escala e devolve a posição da linha', () => {
    const { bars, limitPercentOfScale } = buildHistoryBars(history, 80_000);

    expect(limitPercentOfScale).toBe(100);
    expect(bars[5].heightPercent).toBe(50);
    expect(buildHistoryBars(history, null).limitPercentOfScale).toBeNull();
  });

  it('dá altura mínima a mês com pouco gasto e aguenta tudo zerado', () => {
    const tiny = buildHistoryBars([{ year: 2026, month: 5, realized: 1 }, { year: 2026, month: 6, realized: 100_000 }], null);

    expect(tiny.bars[0].heightPercent).toBe(4);
    expect(buildHistoryBars([{ year: 2026, month: 5, realized: 0 }], null).bars[0].heightPercent).toBe(0);
  });
});

describe('describeMonth', () => {
  const today = { year: 2026, month: 10, day: 22 };

  it('receita só compara com a média e ignora variação pequena', () => {
    expect(describeMonth({ month: month(105_000, null), previousAverage: 100_000, today, type: 'INCOME', money })).toEqual([]);
    expect(describeMonth({ month: month(150_000, null), previousAverage: 100_000, today, type: 'INCOME', money })).toEqual(['50% acima da média dos meses anteriores']);
  });
});

describe('daysInMonth', () => {
  it('conhece fevereiro bissexto', () => {
    expect(daysInMonth(2028, 2)).toBe(29);
    expect(daysInMonth(2027, 2)).toBe(28);
    expect(daysInMonth(2026, 10)).toBe(31);
  });
});
