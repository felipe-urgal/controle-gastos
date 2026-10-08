import { z } from 'zod';

import { FISCAL_PTAX_LOOKBACK_DAYS } from '@/app/lib/currency/fiscal-ptax-resolver';
import { EXCHANGE_RATE_MAX_COMPONENT } from '@/app/lib/currency/exchange-rate-domain';
import type { SupportedCurrency } from '@/app/types/financial-summary';

const PTAX_BASE_URL =
  'https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata/CotacaoMoedaPeriodo(moeda=@moeda,dataInicial=@dataInicial,dataFinalCotacao=@dataFinalCotacao)';
const PTAX_TIMEOUT_MS = 5_000;
const PTAX_LOOKBACK_DAYS = FISCAL_PTAX_LOOKBACK_DAYS;

const ptaxResponseSchema = z.object({
  value: z.array(
    z.object({
      cotacaoCompra: z.number().positive(),
      cotacaoVenda: z.number().positive(),
      dataHoraCotacao: z.string().min(10),
    }),
  ),
});

export type PtaxErrorKind =
  | 'INVALID_INPUT'
  | 'UPSTREAM_TIMEOUT'
  | 'UPSTREAM_UNAVAILABLE'
  | 'UPSTREAM_RATE_LIMIT'
  | 'INVALID_UPSTREAM_PAYLOAD'
  | 'NO_QUOTE_IN_LOOKBACK';

const PTAX_ERROR_STATUS: Record<PtaxErrorKind, number> = {
  INVALID_INPUT: 400,
  NO_QUOTE_IN_LOOKBACK: 404,
  UPSTREAM_RATE_LIMIT: 429,
  INVALID_UPSTREAM_PAYLOAD: 502,
  UPSTREAM_UNAVAILABLE: 503,
  UPSTREAM_TIMEOUT: 504,
};

export class PtaxError extends Error {
  readonly status: number;

  constructor(
    readonly kind: PtaxErrorKind,
    message: string,
    readonly retryAfterSeconds?: number,
  ) {
    super(message);
    this.name = 'PtaxError';
    this.status = PTAX_ERROR_STATUS[kind];
  }
}

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
  let a = left < BigInt(0) ? -left : left;
  let b = right < BigInt(0) ? -right : right;
  while (b !== BigInt(0)) {
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
  const denominator = BigInt(10) ** BigInt(fractionPart.length);
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
    reduced.numerator <= BigInt(0) ||
    reduced.denominator <= BigInt(0) ||
    reduced.numerator > BigInt(EXCHANGE_RATE_MAX_COMPONENT) ||
    reduced.denominator > BigInt(EXCHANGE_RATE_MAX_COMPONENT)
  ) {
    throw new PtaxError(
      'INVALID_UPSTREAM_PAYLOAD',
      'Cotação PTAX excede o limite numérico suportado',
    );
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
  url.searchParams.set(
    '$select',
    'cotacaoCompra,cotacaoVenda,dataHoraCotacao',
  );
  return url;
}

async function requestPtax(url: URL, fetchFn: FetchLike) {
  let lastError: PtaxError | null = null;

  // No máximo 2 tentativas, só para falhas transitórias (5xx/rede/timeout).
  // 429 do BCB não é reenviado: respeitamos o limite do upstream.
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

      if (response.status === 429) {
        const retryAfter = Number(response.headers?.get('retry-after'));
        throw new PtaxError(
          'UPSTREAM_RATE_LIMIT',
          'O BCB limitou temporariamente as consultas de PTAX. Tente novamente em instantes.',
          Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : 60,
        );
      }

      if (!response.ok) {
        const error = new PtaxError(
          'UPSTREAM_UNAVAILABLE',
          `BCB PTAX temporariamente indisponível (HTTP ${response.status})`,
        );
        if (response.status < 500) throw error;
        lastError = error;
        continue;
      }

      const payload = ptaxResponseSchema.safeParse(await response.json());
      if (!payload.success) {
        throw new PtaxError(
          'INVALID_UPSTREAM_PAYLOAD',
          'Resposta inválida recebida do BCB PTAX',
        );
      }
      return payload.data.value;
    } catch (error) {
      if (error instanceof PtaxError) {
        throw error;
      } else if (error instanceof Error && error.name === 'AbortError') {
        lastError = new PtaxError(
          'UPSTREAM_TIMEOUT',
          'Tempo limite excedido ao consultar o BCB PTAX',
        );
      } else if (error instanceof SyntaxError) {
        throw new PtaxError(
          'INVALID_UPSTREAM_PAYLOAD',
          'Resposta inválida recebida do BCB PTAX',
        );
      } else {
        lastError = new PtaxError(
          'UPSTREAM_UNAVAILABLE',
          'Não foi possível consultar o BCB PTAX',
        );
      }
    } finally {
      clearTimeout(timeout);
    }
  }

  throw (
    lastError ??
    new PtaxError(
      'UPSTREAM_UNAVAILABLE',
      'Não foi possível consultar o BCB PTAX',
    )
  );
}

async function loadQuotes(
  currency: Exclude<SupportedCurrency, 'BRL'>,
  referenceDate: LogicalDate,
  quoteSide: 'BUY' | 'SELL',
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
    quotes.set(
      dateKey(rowDate),
      decimalToFraction(
        quoteSide === 'BUY' ? row.cotacaoCompra : row.cotacaoVenda,
      ),
    );
  }

  return quotes;
}

async function fetchPtaxExchangeRateUncached(
  input: {
    from: SupportedCurrency;
    to: SupportedCurrency;
    referenceDate: LogicalDate;
    quoteSide?: 'BUY' | 'SELL';
  },
  fetchFn: FetchLike = fetch,
) {
  if (input.from === input.to) {
    throw new PtaxError('INVALID_INPUT', 'Taxa deve converter entre moedas diferentes');
  }

  const quoteSide = input.quoteSide ?? 'SELL';
  const foreignCurrencies = [...new Set([input.from, input.to].filter(
    (currency): currency is Exclude<SupportedCurrency, 'BRL'> => currency !== 'BRL',
  ))];

  const quoteEntries = await Promise.all(
    foreignCurrencies.map(async (currency) => [
      currency,
      await loadQuotes(currency, input.referenceDate, quoteSide, fetchFn),
    ] as const),
  );
  const quoteMaps = new Map(quoteEntries);

  for (let offset = 0; offset <= PTAX_LOOKBACK_DAYS; offset += 1) {
    const candidate = shiftDate(input.referenceDate, -offset);
    const key = dateKey(candidate);
    const fromBrl =
      input.from === 'BRL' ? { numerator: BigInt(1), denominator: BigInt(1) } : quoteMaps.get(input.from)?.get(key);
    const toBrl =
      input.to === 'BRL' ? { numerator: BigInt(1), denominator: BigInt(1) } : quoteMaps.get(input.to)?.get(key);

    if (!fromBrl || !toBrl) continue;

    return {
      from: input.from,
      to: input.to,
      ...toSafeRate(divideFractions(fromBrl, toBrl)),
      referenceDate: candidate,
      quoteSide,
    };
  }

  throw new PtaxError(
    'NO_QUOTE_IN_LOOKBACK',
    'BCB PTAX não possui cotação no período solicitado',
  );
}

const inFlight = new Map<
  string,
  ReturnType<typeof fetchPtaxExchangeRateUncached>
>();

/** Requisições simultâneas ao mesmo par/data/lado compartilham uma consulta. */
export function fetchPtaxExchangeRate(
  input: Parameters<typeof fetchPtaxExchangeRateUncached>[0],
  fetchFn?: FetchLike,
) {
  if (fetchFn) return fetchPtaxExchangeRateUncached(input, fetchFn);

  const key = [
    input.from,
    input.to,
    input.quoteSide ?? 'SELL',
    dateKey(input.referenceDate),
  ].join('|');
  const existing = inFlight.get(key);
  if (existing) return existing;

  const request = fetchPtaxExchangeRateUncached(input).finally(() => {
    inFlight.delete(key);
  });
  inFlight.set(key, request);
  return request;
}
