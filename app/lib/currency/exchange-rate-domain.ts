import type {
  ConsolidationMissingRate,
  ConvertedCurrencyAmount,
  CurrencyAmount,
  CurrencyConsolidationResult,
  ExchangeRate,
  ExchangeRateProvenance,
  ExchangeRateResolution,
} from '@/app/types/exchange-rate';
import type { SupportedCurrency } from '@/app/types/financial-summary';

export const EXCHANGE_RATE_MAX_COMPONENT = 1_000_000_000;

function assertSafePositiveInteger(value: number, label: string) {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`${label} deve ser um inteiro positivo seguro`);
  }
  if (value > EXCHANGE_RATE_MAX_COMPONENT) {
    throw new Error(`${label} excede o limite suportado`);
  }
}

export function exchangeRateProvenance(rate: {
  source: ExchangeRate['source'];
  from: SupportedCurrency;
  to: SupportedCurrency;
}): ExchangeRateProvenance {
  if (rate.source === 'MANUAL') return 'MANUAL';
  return rate.from === 'BRL' || rate.to === 'BRL'
    ? 'PTAX_DIRECT'
    : 'PTAX_CROSS';
}

export function assertExchangeRate(rate: ExchangeRate) {
  if (rate.from === rate.to) {
    throw new Error('Taxa deve converter entre moedas diferentes');
  }

  assertSafePositiveInteger(rate.numerator, 'Numerador');
  assertSafePositiveInteger(rate.denominator, 'Denominador');

  if (rate.source !== 'MANUAL' && rate.source !== 'BCB_PTAX') {
    throw new Error('Origem de taxa não suportada');
  }

  if (
    (rate.source === 'MANUAL' && rate.quoteSide !== 'GENERIC') ||
    (rate.source === 'BCB_PTAX' &&
      rate.quoteSide !== 'BUY' &&
      rate.quoteSide !== 'SELL')
  ) {
    throw new Error('Lado da cotação incompatível com a origem');
  }

  const { year, month, day } = rate.referenceDate;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() + 1 !== month ||
    date.getUTCDate() !== day
  ) {
    throw new Error('Data de referência inválida');
  }
}

export function convertCurrencyAmount(
  original: CurrencyAmount,
  to: SupportedCurrency,
  rate: ExchangeRate | null,
) {
  if (!Number.isSafeInteger(original.amount)) {
    throw new Error('Valor monetário deve ser um inteiro seguro');
  }

  if (original.currency === to) {
    return {
      original,
      converted: { amount: original.amount, currency: to },
      rate: null,
    };
  }

  if (!rate) {
    return null;
  }

  assertExchangeRate(rate);

  if (rate.from !== original.currency || rate.to !== to) {
    throw new Error('Taxa incompatível com o par solicitado');
  }

  const amount = BigInt(original.amount);
  const numerator = BigInt(rate.numerator);
  const denominator = BigInt(rate.denominator);
  const product = amount * numerator;
  const sign = product < BigInt(0) ? BigInt(-1) : BigInt(1);
  const absoluteProduct = product < BigInt(0) ? -product : product;
  const two = BigInt(2);
  const roundedAbsolute =
    (absoluteProduct * two + denominator) / (denominator * two);
  const convertedBigInt = roundedAbsolute * sign;

  if (
    convertedBigInt > BigInt(Number.MAX_SAFE_INTEGER) ||
    convertedBigInt < BigInt(Number.MIN_SAFE_INTEGER)
  ) {
    throw new Error('Valor convertido excede o intervalo suportado');
  }

  const convertedAmount = Number(convertedBigInt);

  return {
    original,
    converted: { amount: convertedAmount, currency: to },
    rate,
  };
}

export function checkedSumCents(values: readonly number[]) {
  let sum = BigInt(0);
  for (const value of values) {
    if (!Number.isSafeInteger(value)) {
      throw new Error('Valor monetário deve ser um inteiro seguro');
    }
    sum += BigInt(value);
  }
  if (
    sum > BigInt(Number.MAX_SAFE_INTEGER) ||
    sum < BigInt(Number.MIN_SAFE_INTEGER)
  ) {
    throw new Error('Total consolidado excede o intervalo suportado');
  }
  return Number(sum);
}

export function consolidateCurrencyAmounts(args: {
  items: readonly CurrencyAmount[];
  baseCurrency: SupportedCurrency;
  rates: readonly (ExchangeRate & {
    resolution?: ExchangeRateResolution | null;
  })[];
}): CurrencyConsolidationResult {
  const ratesByPair = new Map(
    args.rates.map((rate) => {
      assertExchangeRate(rate);
      return [`${rate.from}:${rate.to}`, rate] as const;
    }),
  );

  const convertedItems: ConvertedCurrencyAmount[] = [];
  const missingRates: ConsolidationMissingRate[] = [];

  for (const item of args.items) {
    const rate =
      item.currency === args.baseCurrency
        ? null
        : ratesByPair.get(`${item.currency}:${args.baseCurrency}`) ?? null;

    const converted = convertCurrencyAmount(
      item,
      args.baseCurrency,
      rate,
    );

    if (!converted) {
      missingRates.push({
        from: item.currency,
        to: args.baseCurrency,
      });
      continue;
    }

    convertedItems.push({
      ...converted,
      resolution: rate?.resolution ?? null,
    });
  }

  const complete = missingRates.length === 0;
  const total = complete
    ? checkedSumCents(convertedItems.map((item) => item.converted.amount))
    : null;

  return {
    baseCurrency: args.baseCurrency,
    complete,
    stale: convertedItems.some(
      (item) => item.resolution?.freshness === 'STALE',
    ),
    total,
    convertedItems,
    missingRates,
  };
}
