import {
  getExchangeRates,
  upsertExchangeRate,
} from '@/app/lib/currency/exchange-rates';

export const GET = getExchangeRates;
export const POST = upsertExchangeRate;
