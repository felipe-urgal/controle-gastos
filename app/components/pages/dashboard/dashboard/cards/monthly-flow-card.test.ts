import { describe, expect, it } from 'vitest';

import { buildFlowBars } from '@/app/components/pages/dashboard/dashboard/cards/monthly-flow-card';
import { gettingStartedSteps } from '@/app/components/pages/dashboard/dashboard/cards/getting-started-card';
import type { DashboardMonthlyFlow } from '@/app/types/dashboard';

const month = (m: number, income: number, expense: number): DashboardMonthlyFlow => ({
  year: 2026,
  month: m,
  currency: 'BRL',
  income,
  expense,
  balance: income - expense,
});

describe('buildFlowBars', () => {
  it('escala as colunas pela maior receita ou despesa e marca o último mês como atual', () => {
    const bars = buildFlowBars([month(9, 100_000, 200_000), month(10, 50_000, 100_000)]);

    expect(bars.map((bar) => [bar.incomeHeight, bar.expenseHeight])).toEqual([[50, 100], [25, 50]]);
    expect(bars.map((bar) => bar.current)).toEqual([false, true]);
    expect(bars[1]).toMatchObject({ label: 'out', balance: -50_000 });
  });

  it('não desenha coluna para zero e dá altura mínima a valores pequenos', () => {
    const [bar] = buildFlowBars([month(10, 0, 1)]);
    const small = buildFlowBars([month(9, 1, 1_000_000)])[0];

    expect(bar.incomeHeight).toBe(0);
    expect(small.incomeHeight).toBe(2);
  });

  it('não divide por zero quando tudo é zero', () => {
    expect(buildFlowBars([month(10, 0, 0)])[0]).toMatchObject({ incomeHeight: 0, expenseHeight: 0 });
  });
});

describe('gettingStartedSteps', () => {
  it('lista os passos enquanto faltar conta ou movimentação', () => {
    expect(gettingStartedSteps({ hasAccount: false, hasTransactions: false, hasBudget: false }).map((step) => step.done)).toEqual([false, false, false]);
    expect(gettingStartedSteps({ hasAccount: true, hasTransactions: false, hasBudget: false }).map((step) => step.done)).toEqual([true, false, false]);
  });

  it('some quando conta e movimentações existem', () => {
    expect(gettingStartedSteps({ hasAccount: true, hasTransactions: true, hasBudget: false })).toEqual([]);
  });
});
