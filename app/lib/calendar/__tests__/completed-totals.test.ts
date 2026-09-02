import { describe, expect, it } from 'vitest';

import { calculateCompletedTransactionTotals } from '@/app/lib/calendar/completed-totals';

describe('calculateCompletedTransactionTotals', () => {
  it('soma apenas receitas e despesas concluídas e separa por moeda', () => {
    const totals = calculateCompletedTransactionTotals([
      { amount: 10000, type: 'INCOME', status: 'COMPLETED', account: { currency: 'BRL' } },
      { amount: 2500, type: 'EXPENSE', status: 'COMPLETED', account: { currency: 'BRL' } },
      { amount: 9000, type: 'INCOME', status: 'PENDING', account: { currency: 'BRL' } },
      { amount: 4000, type: 'EXPENSE', status: 'CANCELLED', account: { currency: 'BRL' } },
      { amount: 5000, type: 'EXPENSE', status: 'COMPLETED', account: { currency: 'USD' } },
    ]);

    expect(totals).toEqual([
      { currency: 'BRL', income: 10000, expense: 2500, balance: 7500 },
      { currency: 'USD', income: 0, expense: 5000, balance: -5000 },
    ]);
  });

  it('aceita valores serializados e ignora tipos ou moedas desconhecidos', () => {
    const totals = calculateCompletedTransactionTotals([
      { amount: '1500', type: 'INCOME', status: 'COMPLETED', account: { currency: 'EUR' } },
      { amount: '500', type: 'EXPENSE', status: 'COMPLETED', account: { currency: 'EUR' } },
      { amount: 9999, type: 'OTHER', status: 'COMPLETED', account: { currency: 'EUR' } },
      { amount: 9999, type: 'INCOME', status: 'COMPLETED', account: { currency: 'XYZ' } },
    ]);

    expect(totals).toEqual([
      { currency: 'EUR', income: 1500, expense: 500, balance: 1000 },
    ]);
  });
});
