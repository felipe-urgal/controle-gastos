import type {
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

  if (rate.source !== 'MANUAL') {
    throw new Error('Origem de taxa não suportada');
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

  const convertedAmount = Math.round(
    (original.amount * rate.numerator) / rate.denominator,
  );

  if (!Number.isSafeInteger(convertedAmount)) {
    throw new Error('Valor convertido excede o intervalo suportado');
  }

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

  const convertedItems = [];
  const missingRates = [];

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
}) {
  const targetKey = logicalDateKey(args.referenceDate);

  return [...args.rates]
    .filter(
      (rate) =>
        rate.from === args.from &&
        rate.to === args.to &&
        logicalDateKey(rate.referenceDate) <= targetKey,
    )
    .sort(
      (left, right) =>
        logicalDateKey(right.referenceDate) -
        logicalDateKey(left.referenceDate),
    )[0] ?? null;
}
