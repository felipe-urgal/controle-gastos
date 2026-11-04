export const SUPPORTED_CURRENCIES = ['BRL', 'USD', 'EUR'] as const;

export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

export function isSupportedCurrency(value: unknown): value is SupportedCurrency {
  return (
    typeof value === 'string' &&
    (SUPPORTED_CURRENCIES as readonly string[]).includes(value)
  );
}

export type CurrencyFinancialSummary = {
  currency: SupportedCurrency;
  income: number;
  expense: number;
  balance: number;
};

/** Lançamentos pendentes do período, na moeda do resumo. Ficam fora do saldo. */
export type PendingTotals = {
  count: number;
  income: number;
  expense: number;
};

/** Resumo da listagem de transações: o saldo vem só dos concluídos; os pendentes vêm à parte. */
export type TransactionListSummary = CurrencyFinancialSummary & {
  pending: PendingTotals;
};
