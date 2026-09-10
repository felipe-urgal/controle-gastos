import { describe, expect, it } from 'vitest';

import { calculateCompletedTransactionTotals } from '@/app/lib/calendar/completed-totals';

describe('calculateCompletedTransactionTotals', () => {
  it('soma apenas receitas e despesas concluídas normais e separa por moeda', () => {
    const totals = calculateCompletedTransactionTotals([
      { amount: 10000, type: 'INCOME', kind: 'NORMAL', status: 'COMPLETED', account: { currency: 'BRL' } },
      { amount: 2500, type: 'EXPENSE', kind: 'NORMAL', status: 'COMPLETED', account: { currency: 'BRL' } },
      { amount: 9000, type: 'INCOME', kind: 'NORMAL', status: 'PENDING', account: { currency: 'BRL' } },
      { amount: 4000, type: 'EXPENSE', kind: 'NORMAL', status: 'CANCELLED', account: { currency: 'BRL' } },
      { amount: 5000, type: 'EXPENSE', kind: 'NORMAL', status: 'COMPLETED', account: { currency: 'USD' } },
      { amount: 7500, type: 'EXPENSE', kind: 'TRANSFER', status: 'COMPLETED', account: { currency: 'BRL' } },
      { amount: 7500, type: 'INCOME', kind: 'TRANSFER', status: 'COMPLETED', account: { currency: 'BRL' } },
    ]);

    expect(totals).toEqual([
      { currency: 'BRL', income: 10000, expense: 2500, balance: 7500 },
      { currency: 'USD', income: 0, expense: 5000, balance: -5000 },
    ]);
  });

  it('aceita valores serializados e ignora tipos ou moedas desconhecidos', () => {
    const totals = calculateCompletedTransactionTotals([
      { amount: '1500', type: 'INCOME', kind: 'NORMAL', status: 'COMPLETED', account: { currency: 'EUR' } },
      { amount: '500', type: 'EXPENSE', kind: 'NORMAL', status: 'COMPLETED', account: { currency: 'EUR' } },
      { amount: 9999, type: 'OTHER', kind: 'NORMAL', status: 'COMPLETED', account: { currency: 'EUR' } },
      { amount: 9999, type: 'INCOME', kind: 'NORMAL', status: 'COMPLETED', account: { currency: 'XYZ' } },
    ]);

    expect(totals).toEqual([
      { currency: 'EUR', income: 1500, expense: 500, balance: 1000 },
    ]);
  });

  it('mantém compatibilidade com registros sem kind explícito', () => {
    const totals = calculateCompletedTransactionTotals([
      { amount: 1000, type: 'INCOME', status: 'COMPLETED', account: { currency: 'BRL' } },
    ]);

    expect(totals).toEqual([
      { currency: 'BRL', income: 1000, expense: 0, balance: 1000 },
    ]);
  });
});
