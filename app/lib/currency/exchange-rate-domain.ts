import type {
  ConsolidationMissingRate,
  ConvertedCurrencyAmount,
  CurrencyAmount,
  CurrencyConsolidationResult,
  ExchangeRate,
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

function logicalDateKey(date: { year: number; month: number; day: number }) {
  return date.year * 10_000 + date.month * 100 + date.day;
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

export function consolidateCurrencyAmounts(args: {
  items: readonly CurrencyAmount[];
  baseCurrency: SupportedCurrency;
  rates: readonly ExchangeRate[];
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

    convertedItems.push(converted);
  }

  const complete = missingRates.length === 0;
  const total = complete
    ? convertedItems.reduce(
        (sum, item) => sum + item.converted.amount,
        0,
      )
    : null;

  return {
    baseCurrency: args.baseCurrency,
    complete,
    total,
    convertedItems,
    missingRates,
  };
}

export function latestRateOnOrBefore(args: {
  rates: readonly ExchangeRate[];
  from: SupportedCurrency;
  to: SupportedCurrency;
  referenceDate: { year: number; month: number; day: number };
  quoteSide?: 'BUY' | 'SELL';
}) {
  const targetKey = logicalDateKey(args.referenceDate);
  const quoteSide = args.quoteSide ?? 'SELL';

  return [...args.rates]
    .filter(
      (rate) =>
        rate.from === args.from &&
        rate.to === args.to &&
        (rate.quoteSide === 'GENERIC' || rate.quoteSide === quoteSide) &&
        logicalDateKey(rate.referenceDate) <= targetKey,
    )
    .sort((left, right) => {
      const dateDifference =
        logicalDateKey(right.referenceDate) -
        logicalDateKey(left.referenceDate);
      if (dateDifference !== 0) return dateDifference;

      const sourcePriority = { MANUAL: 1, BCB_PTAX: 0 } as const;
      return sourcePriority[right.source] - sourcePriority[left.source];
    })[0] ?? null;
}
