import { describe, expect, it } from 'vitest';

import { buildCurrencyTotals } from '@/app/components/pages/account/index/accounts-overview';
import type { AccountListSummary } from '@/app/types/account';

function summary(overrides: Partial<AccountListSummary>): AccountListSummary {
  return {
    balancesByCurrency: [],
    bankBalancesByCurrency: [],
    investmentBalancesByCurrency: [],
    activeCount: 0,
    negativeCount: 0,
    totalCount: 0,
    typeCounts: { CREDIT_DEBIT: 0, INVESTMENT: 0, CREDIT_CARD: 0 },
    openStatementsByCurrency: [],
    attention: [],
    ...overrides,
  };
}

describe('buildCurrencyTotals', () => {
  it('junta correntes, investido e faturas na mesma moeda', () => {
    const totals = buildCurrencyTotals(
      summary({
        bankBalancesByCurrency: [{ currency: 'BRL', value: 640_000 }],
        investmentBalancesByCurrency: [{ currency: 'BRL', value: 3_820_000 }],
        openStatementsByCurrency: [{ currency: 'BRL', value: 124_000 }],
      }),
    );

    expect(totals).toEqual([{ currency: 'BRL', available: 640_000, invested: 3_820_000, statements: 124_000 }]);
  });

  it('não converte moedas: um bloco por moeda, BRL primeiro', () => {
    const totals = buildCurrencyTotals(
      summary({
        bankBalancesByCurrency: [{ currency: 'USD', value: 5_000 }, { currency: 'BRL', value: 10_000 }, { currency: 'EUR', value: 1_000 }],
        investmentBalancesByCurrency: [],
      }),
    );

    expect(totals.map((item) => item.currency)).toEqual(['BRL', 'EUR', 'USD']);
  });

  it('cria bloco para moeda que só tem fatura ou investimento', () => {
    const totals = buildCurrencyTotals(
      summary({
        investmentBalancesByCurrency: [{ currency: 'USD', value: 9_000 }],
        openStatementsByCurrency: [{ currency: 'EUR', value: 700 }],
      }),
    );

    expect(totals).toEqual([
      { currency: 'EUR', available: 0, invested: 0, statements: 700 },
      { currency: 'USD', available: 0, invested: 9_000, statements: 0 },
    ]);
  });

  it('retorna vazio sem contas', () => {
    expect(buildCurrencyTotals(summary({}))).toEqual([]);
  });
});
