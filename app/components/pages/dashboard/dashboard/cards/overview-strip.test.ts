import { describe, expect, it } from 'vitest';

import { summarizeCardStatements } from '@/app/components/pages/dashboard/dashboard/cards/overview-strip';
import type { DashboardCreditCard } from '@/app/types/dashboard';

function card(id: string, statement: { amount: number; day: number; month?: number } | null): DashboardCreditCard {
  return {
    id,
    name: id,
    currency: 'BRL',
    color: '#000000',
    icon: 'credit-card',
    creditLimit: 100_000,
    usedLimit: 0,
    availableLimit: 100_000,
    overLimit: 0,
    nextStatement: statement && {
      amount: statement.amount,
      closingDate: { year: 2026, month: 10, day: 1 },
      dueDate: { year: 2026, month: statement.month ?? 10, day: statement.day },
      transactionCount: 1,
    },
  };
}

describe('summarizeCardStatements', () => {
  it('soma as faturas abertas e aponta o vencimento mais próximo', () => {
    const summary = summarizeCardStatements([card('a', { amount: 10_000, day: 20 }), card('b', { amount: 5_000, day: 5, month: 11 }), card('c', { amount: 2_500, day: 12 })]);

    expect(summary).toEqual({ total: 17_500, count: 3, nextDue: { year: 2026, month: 10, day: 12 } });
  });

  it('ignora cartão sem fatura ou com fatura zerada', () => {
    expect(summarizeCardStatements([card('a', null), card('b', { amount: 0, day: 10 })])).toBeNull();
  });

  it('não retorna resumo sem cartões', () => {
    expect(summarizeCardStatements([])).toBeNull();
  });
});
