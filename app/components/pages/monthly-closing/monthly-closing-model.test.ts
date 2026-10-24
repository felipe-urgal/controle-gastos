import { describe, expect, it } from 'vitest';

import {
  budgetUsage,
  buildTodoItems,
  describeDelta,
  shiftPeriod,
  spentShare,
  summaryLede,
} from '@/app/components/pages/monthly-closing/monthly-closing-model';
import type { MonthlyClosingReadiness } from '@/app/types/monthly-closing';

const money = (cents: number) => 'R$ ' + (cents / 100).toFixed(2).replace('.', ',');
const noComparison = { percentage: null, difference: 0 };
const comparison = (balancePercentage: number | null) => ({
  previousPeriod: { year: 2026, month: 9 },
  income: noComparison,
  expense: noComparison,
  balance: { percentage: balancePercentage, difference: 0 },
});

function readiness(overrides: Partial<MonthlyClosingReadiness> = {}): MonthlyClosingReadiness {
  return {
    checked: true,
    status: 'READY',
    pendingTransactions: { checked: true, totalCount: 0, income: { count: 0, amount: 0 }, expense: { count: 0, amount: 0 } },
    reconciliation: { checked: true, accountCount: 0, reconciledCount: 0, issueCount: 0, accounts: [] },
    cardStatements: { checked: true, count: 0, paidCount: 0, openCount: 0, overdueCount: 0, items: [] },
    ...overrides,
  };
}

describe('monthly-closing-model', () => {
  it('atravessa a virada de ano ao navegar entre meses', () => {
    expect(shiftPeriod(2026, 1, -1)).toEqual({ year: 2025, month: 12 });
    expect(shiftPeriod(2026, 12, 1)).toEqual({ year: 2027, month: 1 });
  });

  it('limita a barra de gasto entre 0 e 100 e trata receita zero', () => {
    expect(spentShare({ income: 9200, expense: 6352 })).toBe(69);
    expect(spentShare({ income: 1000, expense: 5000 })).toBe(100);
    expect(spentShare({ income: 0, expense: 500 })).toBe(100);
    expect(spentShare({ income: 1000, expense: 0 })).toBe(0);
  });

  it('descreve o mês positivo, negativo e vazio sem inventar comparação', () => {
    const base = { previousMonth: 'setembro', money };
    expect(summaryLede({ ...base, summary: { income: 10000, expense: 6900, balance: 3100 }, comparison: comparison(8) }))
      .toBe('Você ganhou R$ 100,00 e gastou R$ 69,00. Ficou com 31% da receita, 8% mais que em setembro.');
    expect(summaryLede({ ...base, summary: { income: 10000, expense: 6900, balance: 3100 }, comparison: comparison(null) }))
      .toBe('Você ganhou R$ 100,00 e gastou R$ 69,00. Ficou com 31% da receita.');
    expect(summaryLede({ ...base, summary: { income: 1000, expense: 3000, balance: -2000 }, comparison: comparison(null) }))
      .toContain('As saídas superaram as entradas em R$ 20,00.');
    expect(summaryLede({ ...base, summary: { income: 0, expense: 0, balance: 0 }, comparison: comparison(null) }))
      .toContain('Nenhuma receita ou despesa realizada');
  });

  it('trata queda de despesa como boa e ausência de base como neutra', () => {
    expect(describeDelta({ percentage: -3, difference: 0 }, 'setembro', true)).toEqual({ text: '▼ 3% vs. setembro', tone: 'good' });
    expect(describeDelta({ percentage: 5, difference: 0 }, 'setembro', true).tone).toBe('bad');
    expect(describeDelta({ percentage: null, difference: 0 }, 'setembro').tone).toBe('flat');
  });

  it('calcula o uso do orçamento e ignora orçamento zerado', () => {
    expect(budgetUsage({ budget: 0, realized: 100, committed: 0, available: 0, overBudgetCategories: 0, realizedIncome: 0, expectedIncome: 0, totalIncome: 0 })).toBeNull();
    expect(budgetUsage({ budget: 7000, realized: 7700, committed: 0, available: 0, overBudgetCategories: 1, realizedIncome: 0, expectedIncome: 0, totalIncome: 0 }))
      .toEqual({ percent: 110, barPercent: 100, remaining: -700 });
  });

  it('marca como ok o que está em dia e aponta o primeiro item a resolver', () => {
    const todo = buildTodoItems({ readiness: readiness(), money, pendingHref: '/p' });
    expect(todo.every((item) => item.ok)).toBe(true);

    const pending = buildTodoItems({
      money,
      pendingHref: '/p',
      readiness: readiness({
        pendingTransactions: { checked: true, totalCount: 2, income: { count: 1, amount: 1500 }, expense: { count: 1, amount: 800 } },
        // Contas sem conciliação em dia não geram item: a conferência com o extrato saiu da tela.
        reconciliation: {
          checked: true, accountCount: 2, reconciledCount: 1, issueCount: 1,
          accounts: [
            { accountId: 'a', accountName: 'Nubank', accountType: 'CREDIT_DEBIT', status: 'UNRECONCILED_ITEMS', completedCount: 3, unreconciledCount: 7, latestCutoff: null, href: '/contas/a' },
          ],
        },
      }),
    });
    expect(pending[0]).toMatchObject({ ok: false, href: '/p' });
    expect(pending.map((item) => item.key)).toEqual(['pending', 'statements']);
    expect(pending[1].ok).toBe(true);
  });
});
