import type { SupportedCurrency } from '@/app/types/financial-summary';

export type ExchangeRateSource = 'MANUAL';

export type ExchangeRateReferenceDate = {
  year: number;
  month: number;
  day: number;
};

export type ExchangeRate = {
  from: SupportedCurrency;
  to: SupportedCurrency;
  numerator: number;
  denominator: number;
  source: ExchangeRateSource;
  referenceDate: ExchangeRateReferenceDate;
};

export type CurrencyAmount = {
  amount: number;
  currency: SupportedCurrency;
};

export type ConvertedCurrencyAmount = {
  original: CurrencyAmount;
  converted: CurrencyAmount;
  rate: ExchangeRate | null;
};

export type ConsolidationMissingRate = {
  from: SupportedCurrency;
  to: SupportedCurrency;
};

export type CurrencyConsolidationResult = {
  baseCurrency: SupportedCurrency;
  complete: boolean;
  total: number | null;
  convertedItems: ConvertedCurrencyAmount[];
  missingRates: ConsolidationMissingRate[];
};


export type ExchangeRateModel = ExchangeRate & {
  id: string;
  createdAt: string;
  updatedAt: string;
};

export type ExchangeRateListData = {
  items: ExchangeRateModel[];
  total: number;
};
