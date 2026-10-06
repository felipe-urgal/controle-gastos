import { describe, expect, it } from 'vitest';

import { calculateCompletedTransactionTotals } from '@/app/lib/calendar/completed-totals';

describe('calculateCompletedTransactionTotals', () => {
  it('uses one realized-flow rule and keeps currencies isolated', () => {
    const totals = calculateCompletedTransactionTotals([
      {
        amount: 10_000,
        type: 'INCOME',
        kind: 'NORMAL',
        status: 'COMPLETED',
        account: { currency: 'BRL', type: 'CREDIT_DEBIT' },
      },
      {
        amount: 2_500,
        type: 'EXPENSE',
        kind: 'NORMAL',
        status: 'COMPLETED',
        account: { currency: 'BRL', type: 'CREDIT_DEBIT' },
      },
      {
        amount: 9_000,
        type: 'INCOME',
        kind: 'NORMAL',
        status: 'PENDING',
        account: { currency: 'BRL', type: 'CREDIT_DEBIT' },
      },
      {
        amount: 4_000,
        type: 'EXPENSE',
        kind: 'NORMAL',
        status: 'CANCELLED',
        account: { currency: 'BRL', type: 'CREDIT_DEBIT' },
      },
      {
        amount: 5_000,
        type: 'EXPENSE',
        kind: 'NORMAL',
        status: 'COMPLETED',
        account: { currency: 'USD', type: 'CREDIT_DEBIT' },
      },
      {
        amount: 7_500,
        type: 'EXPENSE',
        kind: 'TRANSFER',
        status: 'COMPLETED',
        account: { currency: 'BRL', type: 'CREDIT_DEBIT' },
      },
      {
        amount: 7_500,
        type: 'INCOME',
        kind: 'TRANSFER',
        status: 'COMPLETED',
        account: { currency: 'BRL', type: 'CREDIT_DEBIT' },
      },
      {
        amount: 2_500,
        type: 'EXPENSE',
        kind: 'CARD_PAYMENT',
        status: 'COMPLETED',
        account: { currency: 'BRL', type: 'CREDIT_DEBIT' },
      },
    ]);

    expect(totals).toEqual([
      { currency: 'BRL', income: 10_000, expense: 2_500, balance: 7_500 },
      { currency: 'USD', income: 0, expense: 5_000, balance: -5_000 },
    ]);
  });

  it('treats card purchases as expense and card refunds as expense reduction', () => {
    expect(
      calculateCompletedTransactionTotals([
        {
          amount: 12_000,
          type: 'EXPENSE',
          kind: 'NORMAL',
          status: 'COMPLETED',
          account: { currency: 'BRL', type: 'CREDIT_CARD' },
        },
        {
          amount: 2_000,
          type: 'INCOME',
          kind: 'NORMAL',
          status: 'COMPLETED',
          account: { currency: 'BRL', type: 'CREDIT_CARD' },
        },
      ]),
    ).toEqual([
      { currency: 'BRL', income: 0, expense: 10_000, balance: -10_000 },
    ]);
  });

  it('does not silently coerce invalid monetary values to zero', () => {
    expect(() =>
      calculateCompletedTransactionTotals([
        {
          amount: Number.NaN,
          type: 'EXPENSE',
          kind: 'NORMAL',
          status: 'COMPLETED',
          account: { currency: 'BRL', type: 'CREDIT_DEBIT' },
        },
      ]),
    ).toThrow('Valor inválido no calendário');
  });

  it('ignores unsupported currencies instead of mixing them', () => {
    expect(
      calculateCompletedTransactionTotals([
        {
          amount: 1_000,
          type: 'INCOME',
          kind: 'NORMAL',
          status: 'COMPLETED',
          account: { currency: 'XYZ', type: 'CREDIT_DEBIT' },
        },
      ]),
    ).toEqual([]);
  });
});
