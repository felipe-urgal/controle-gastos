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
