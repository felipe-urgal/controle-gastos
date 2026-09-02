export const SUPPORTED_CURRENCIES = ['BRL', 'USD', 'EUR'] as const;

export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

export type CurrencyFinancialSummary = {
  currency: SupportedCurrency;
  income: number;
  expense: number;
  balance: number;
};
