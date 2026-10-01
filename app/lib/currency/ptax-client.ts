import { z } from 'zod';

import { EXCHANGE_RATE_MAX_COMPONENT } from '@/app/lib/currency/exchange-rate-domain';
import type { SupportedCurrency } from '@/app/types/financial-summary';

const PTAX_BASE_URL =
  'https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata/CotacaoMoedaPeriodo(moeda=@moeda,dataInicial=@dataInicial,dataFinalCotacao=@dataFinalCotacao)';
const PTAX_TIMEOUT_MS = 5_000;
const PTAX_LOOKBACK_DAYS = 10;

const ptaxResponseSchema = z.object({
  value: z.array(
    z.object({
      cotacaoVenda: z.number().positive(),
      dataHoraCotacao: z.string().min(10),
    }),
  ),
});

type LogicalDate = {
  year: number;
  month: number;
  day: number;
};

type Fraction = {
  numerator: bigint;
  denominator: bigint;
};

type FetchLike = typeof fetch;

function gcd(left: bigint, right: bigint): bigint {
  let a = left < 0n ? -left : left;
  let b = right < 0n ? -right : right;
  while (b !== 0n) {
    const remainder = a % b;
    a = b;
    b = remainder;
  }
  return a;
}

function reduceFraction(value: Fraction): Fraction {
  const divisor = gcd(value.numerator, value.denominator);
  return {
    numerator: value.numerator / divisor,
    denominator: value.denominator / divisor,
  };
}

function decimalToFraction(value: number): Fraction {
  const raw = value.toString();
  const normalized = raw.includes('e')
    ? value.toFixed(8).replace(/0+$/, '').replace(/\.$/, '')
    : raw;
  const [integerPart, fractionPart = ''] = normalized.split('.');
  const denominator = 10n ** BigInt(fractionPart.length);
  const numerator = BigInt(`${integerPart}${fractionPart}`);
  return reduceFraction({ numerator, denominator });
}

function divideFractions(left: Fraction, right: Fraction): Fraction {
  return reduceFraction({
    numerator: left.numerator * right.denominator,
    denominator: left.denominator * right.numerator,
  });
}

function toSafeRate(value: Fraction) {
  const reduced = reduceFraction(value);
  if (
    reduced.numerator <= 0n ||
    reduced.denominator <= 0n ||
    reduced.numerator > BigInt(EXCHANGE_RATE_MAX_COMPONENT) ||
    reduced.denominator > BigInt(EXCHANGE_RATE_MAX_COMPONENT)
  ) {
    throw new Error('Cotação PTAX excede o limite numérico suportado');
  }

  return {
    numerator: Number(reduced.numerator),
    denominator: Number(reduced.denominator),
  };
}

function toUtcDate(date: LogicalDate) {
  return new Date(Date.UTC(date.year, date.month - 1, date.day));
}

function logicalDateFromUtc(date: Date): LogicalDate {
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  };
}

function dateKey(date: LogicalDate) {
  return `${date.year}-${String(date.month).padStart(2, '0')}-${String(date.day).padStart(2, '0')}`;
}

function formatPtaxDate(date: LogicalDate) {
  return `${String(date.month).padStart(2, '0')}-${String(date.day).padStart(2, '0')}-${date.year}`;
}

function shiftDate(date: LogicalDate, days: number) {
  const value = toUtcDate(date);
  value.setUTCDate(value.getUTCDate() + days);
  return logicalDateFromUtc(value);
}

function parseReferenceDate(value: string): LogicalDate | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return null;

  const date = {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  };
  const parsed = toUtcDate(date);
  if (
    parsed.getUTCFullYear() !== date.year ||
    parsed.getUTCMonth() + 1 !== date.month ||
    parsed.getUTCDate() !== date.day
  ) {
    return null;
  }
  return date;
}

function buildUrl(currency: Exclude<SupportedCurrency, 'BRL'>, start: LogicalDate, end: LogicalDate) {
  const url = new URL(PTAX_BASE_URL);
  url.searchParams.set('@moeda', `'${currency}'`);
  url.searchParams.set('@dataInicial', `'${formatPtaxDate(start)}'`);
  url.searchParams.set('@dataFinalCotacao', `'${formatPtaxDate(end)}'`);
  url.searchParams.set('$format', 'json');
  url.searchParams.set('$select', 'cotacaoVenda,dataHoraCotacao');
  return url;
}

async function requestPtax(url: URL, fetchFn: FetchLike) {
  let lastError: unknown;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), PTAX_TIMEOUT_MS);

    try {
      const response = await fetchFn(url, {
        method: 'GET',
        headers: { accept: 'application/json' },
        signal: controller.signal,
        cache: 'no-store',
      });

      if (!response.ok) {
        const error = new Error(`BCB PTAX respondeu HTTP ${response.status}`);
        if (response.status !== 429 && response.status < 500) {
          throw error;
        }
        lastError = error;
        continue;
      }

      const payload = ptaxResponseSchema.safeParse(await response.json());
      if (!payload.success) {
        throw new Error('Resposta inválida recebida do BCB PTAX');
      }
      return payload.data.value;
    } catch (error) {
      lastError = error;
      if (error instanceof Error && error.message.startsWith('Resposta inválida')) {
        throw error;
      }
    } finally {
      clearTimeout(timeout);
    }
  }

  if (lastError instanceof Error && lastError.name === 'AbortError') {
    throw new Error('Tempo limite excedido ao consultar o BCB PTAX');
  }
  throw new Error('Não foi possível consultar o BCB PTAX');
}

async function loadQuotes(
  currency: Exclude<SupportedCurrency, 'BRL'>,
  referenceDate: LogicalDate,
  fetchFn: FetchLike,
) {
  const start = shiftDate(referenceDate, -PTAX_LOOKBACK_DAYS);
  const rows = await requestPtax(buildUrl(currency, start, referenceDate), fetchFn);
  const quotes = new Map<string, Fraction>();

  for (const row of [...rows].sort((left, right) =>
    left.dataHoraCotacao.localeCompare(right.dataHoraCotacao),
  )) {
    const rowDate = parseReferenceDate(row.dataHoraCotacao);
    if (!rowDate) continue;
    quotes.set(dateKey(rowDate), decimalToFraction(row.cotacaoVenda));
  }

  return quotes;
}

export async function fetchPtaxExchangeRate(
  input: {
    from: SupportedCurrency;
    to: SupportedCurrency;
    referenceDate: LogicalDate;
  },
  fetchFn: FetchLike = fetch,
) {
  if (input.from === input.to) {
    throw new Error('Taxa deve converter entre moedas diferentes');
  }

  const foreignCurrencies = [...new Set([input.from, input.to].filter(
    (currency): currency is Exclude<SupportedCurrency, 'BRL'> => currency !== 'BRL',
  ))];

  const quoteEntries = await Promise.all(
    foreignCurrencies.map(async (currency) => [
      currency,
      await loadQuotes(currency, input.referenceDate, fetchFn),
    ] as const),
  );
  const quoteMaps = new Map(quoteEntries);

  for (let offset = 0; offset <= PTAX_LOOKBACK_DAYS; offset += 1) {
    const candidate = shiftDate(input.referenceDate, -offset);
    const key = dateKey(candidate);
    const fromBrl =
      input.from === 'BRL' ? { numerator: 1n, denominator: 1n } : quoteMaps.get(input.from)?.get(key);
    const toBrl =
      input.to === 'BRL' ? { numerator: 1n, denominator: 1n } : quoteMaps.get(input.to)?.get(key);

    if (!fromBrl || !toBrl) continue;

    return {
      from: input.from,
      to: input.to,
      ...toSafeRate(divideFractions(fromBrl, toBrl)),
      referenceDate: candidate,
    };
  }

  throw new Error('BCB PTAX não possui cotação no período solicitado');
}
