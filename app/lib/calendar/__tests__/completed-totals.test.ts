import { describe, expect, it } from 'vitest';

import { calculateCompletedTransactionTotals } from '@/app/lib/calendar/completed-totals';

describe('calculateCompletedTransactionTotals', () => {
  it('soma apenas receitas e despesas concluídas', () => {
    const totals = calculateCompletedTransactionTotals([
      { amount: 10000, type: 'INCOME', status: 'COMPLETED' },
      { amount: 2500, type: 'EXPENSE', status: 'COMPLETED' },
      { amount: 9000, type: 'INCOME', status: 'PENDING' },
      { amount: 4000, type: 'EXPENSE', status: 'CANCELLED' },
    ]);

    expect(totals).toEqual({
      income: 10000,
      expense: 2500,
      balance: 7500,
    });
  });

  it('aceita valores serializados e ignora tipos desconhecidos', () => {
    const totals = calculateCompletedTransactionTotals([
      { amount: '1500', type: 'INCOME', status: 'COMPLETED' },
      { amount: '500', type: 'EXPENSE', status: 'COMPLETED' },
      { amount: 9999, type: 'OTHER', status: 'COMPLETED' },
    ]);

    expect(totals).toEqual({
      income: 1500,
      expense: 500,
      balance: 1000,
    });
  });
});
