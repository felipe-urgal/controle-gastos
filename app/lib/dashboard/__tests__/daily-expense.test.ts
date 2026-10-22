import { describe, expect, it } from 'vitest';

import { buildDailyExpense } from '@/app/lib/dashboard/monthly-dashboard';

const row = (year: number, month: number, day: number, amount: number | null) => ({ year, month, day, _sum: { amount } });

describe('buildDailyExpense', () => {
  it('cria um item por dia do mês, inclusive em fevereiro bissexto', () => {
    expect(buildDailyExpense([], [], { year: 2028, month: 2 })).toHaveLength(29);
    expect(buildDailyExpense([], [], { year: 2027, month: 2 })).toHaveLength(28);
    expect(buildDailyExpense([], [], { year: 2026, month: 10 })).toHaveLength(31);
  });

  it('soma despesas por dia e ignora outros meses', () => {
    const totals = buildDailyExpense(
      [row(2026, 10, 3, 1_000), row(2026, 10, 3, 500), row(2026, 10, 31, 200), row(2026, 9, 3, 9_999)],
      [],
      { year: 2026, month: 10 },
    );

    expect(totals[2]).toBe(1_500);
    expect(totals[30]).toBe(200);
    expect(totals.reduce((sum, value) => sum + value, 0)).toBe(1_700);
  });

  it('desconta estornos de cartão no dia em que aconteceram', () => {
    const totals = buildDailyExpense([row(2026, 10, 5, 3_000)], [row(2026, 10, 5, 1_000), row(2026, 10, 6, 400)], { year: 2026, month: 10 });

    expect(totals[4]).toBe(2_000);
    expect(totals[5]).toBe(-400);
  });

  it('trata soma nula como zero e descarta dias fora do mês', () => {
    const totals = buildDailyExpense([row(2026, 10, 2, null), row(2026, 10, 32, 5_000), row(2026, 10, 0, 5_000)], [], { year: 2026, month: 10 });

    expect(totals.reduce((sum, value) => sum + value, 0)).toBe(0);
  });
});
