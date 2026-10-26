import { describe, expect, it } from 'vitest';

import {
  activePreset,
  deltaTone,
  metricRows,
  pairWidths,
  presetFilters,
  sortedMovers,
  type ComparisonFilters,
} from '@/app/components/pages/financial-comparison/financial-comparison-model';
import type { FinancialComparisonData } from '@/app/types/financial-comparison';

const metric = (current: number, baseline: number) => ({
  difference: current - baseline,
  percentage: baseline === 0 ? null : Math.round(((current - baseline) / Math.abs(baseline)) * 1000) / 10,
});

function data(overrides: { a?: Partial<FinancialComparisonData['a']>; b?: Partial<FinancialComparisonData['b']> } = {}): FinancialComparisonData {
  const side = (income: number, expense: number, months: number) => ({
    range: { from: { year: 2025, month: 1 }, to: { year: 2025, month: months } },
    months,
    income,
    expense,
    balance: income - expense,
    averageMonthlyIncome: Math.round(income / months),
    averageMonthlyExpense: Math.round(expense / months),
    averageMonthlyBalance: Math.round((income - expense) / months),
    netWorthEnd: null,
    netWorthStatus: 'NO_DATA' as const,
    netWorthAsOf: { year: 2025, month: months, day: 28 },
    categories: [],
  });
  const a = { ...side(10000, 6000, 2), ...overrides.a };
  const b = { ...side(12000, 5000, 2), ...overrides.b };
  return {
    currency: 'BRL',
    asOf: { year: 2026, month: 10, day: 22 },
    coverage: { sameLength: a.months === b.months, overlaps: false },
    netWorthMethodology: { basis: 'TRANSACTION_BALANCE', description: '' },
    a,
    b,
    difference: {
      income: metric(b.income, a.income),
      expense: metric(b.expense, a.expense),
      balance: metric(b.balance, a.balance),
      averageMonthlyIncome: metric(b.averageMonthlyIncome, a.averageMonthlyIncome),
      averageMonthlyExpense: metric(b.averageMonthlyExpense, a.averageMonthlyExpense),
      averageMonthlyBalance: metric(b.averageMonthlyBalance, a.averageMonthlyBalance),
      netWorthEnd: null,
    },
    categories: [],
  };
}

const filters: ComparisonFilters = { aFrom: '', aTo: '', bFrom: '', bTo: '', currency: 'USD' };

describe('financial-comparison-model', () => {
  it('trata queda de despesa como boa e preserva a moeda nos atalhos', () => {
    expect(deltaTone({ difference: -100, percentage: -4 }, true)).toBe('good');
    expect(deltaTone({ difference: 100, percentage: 4 }, true)).toBe('bad');
    expect(deltaTone({ difference: 0, percentage: 0 })).toBe('flat');

    const ytd = presetFilters('ytd', filters, { year: 2026, month: 10 });
    expect(ytd).toMatchObject({ aFrom: '2025-01', aTo: '2025-10', bFrom: '2026-01', bTo: '2026-10', currency: 'USD' });
    expect(activePreset(ytd, { year: 2026, month: 10 })).toBe('ytd');
    expect(activePreset({ ...ytd, aFrom: '2025-03' }, { year: 2026, month: 10 })).toBeNull();
  });

  it('escala as duas barras pela maior e aceita ambos zero', () => {
    expect(pairWidths(50, 100)).toEqual([50, 100]);
    expect(pairWidths(-200, 100)).toEqual([100, 50]);
    expect(pairWidths(0, 0)).toEqual([0, 0]);
  });

  it('usa totais ou médias mensais conforme a base', () => {
    const value = data({ a: { months: 2 }, b: { months: 4, income: 12000, averageMonthlyIncome: 3000 } });
    expect(metricRows(value, 'total')[0]).toMatchObject({ a: 10000, b: 12000 });
    expect(metricRows(value, 'average')[0]).toMatchObject({ a: 5000, b: 3000 });
  });

  it('ordena categorias pela maior diferença na base escolhida', () => {
    const value = data();
    value.categories = [
      { id: 'a', name: 'Alimentação', color: '#000', icon: 'tag', a: { amount: 100, averageMonthlyAmount: 50 }, b: { amount: 90, averageMonthlyAmount: 45 }, difference: metric(90, 100), averageDifference: metric(45, 50) },
      { id: 'b', name: 'Lazer', color: '#000', icon: 'tag', a: { amount: 100, averageMonthlyAmount: 50 }, b: { amount: 300, averageMonthlyAmount: 150 }, difference: metric(300, 100), averageDifference: metric(150, 50) },
    ];
    expect(sortedMovers(value, 'total').map((item) => item.id)).toEqual(['b', 'a']);
    expect(sortedMovers(value, 'total')[0].widths).toEqual([33, 100]);
  });
});
