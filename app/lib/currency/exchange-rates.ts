import { ZodError } from 'zod';

import { parseJsonBody } from '@/app/lib/api/request-json';
import { failure, rateLimitFailure, success } from '@/app/lib/api-response';
import { getAuthenticatedUserId } from '@/app/lib/auth';
import { isUnauthorizedError } from '@/app/lib/auth/auth-errors';
import {
  assertExchangeRate,
  exchangeRateProvenance,
} from '@/app/lib/currency/exchange-rate-domain';
import {
  compareLogicalDates,
  logicalDateFromUtcInstant,
  parseIsoLogicalDate,
  type LogicalDate,
} from '@/app/lib/date/logical-date';
import { consumePtaxFetchRateLimit } from '@/app/lib/security/application-rate-limit';
import { prisma } from '@/app/lib/prisma';
import {
  manualExchangeRateInputSchema,
  ptaxExchangeRateInputSchema,
  type ManualExchangeRateInput,
} from '@/app/lib/currency/exchange-rate-schema';
import { fetchPtaxExchangeRate, PtaxError } from '@/app/lib/currency/ptax-client';
import type {
  ExchangeRateModel,
  ExchangeRateQuoteSide,
  ExchangeRateSource,
} from '@/app/types/exchange-rate';
import type { SupportedCurrency } from '@/app/types/financial-summary';

const SUPPORTED_CURRENCIES = new Set<SupportedCurrency>(['BRL', 'USD', 'EUR']);
const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 50;

function toModel(rate: {
  id: string;
  fromCurrency: string;
  toCurrency: string;
  numerator: number;
  denominator: number;
  source: 'MANUAL' | 'BCB_PTAX';
  quoteSide: 'GENERIC' | 'BUY' | 'SELL';
  referenceYear: number;
  referenceMonth: number;
  referenceDay: number;
  createdAt: Date;
  updatedAt: Date;
}): ExchangeRateModel {
  return {
    id: rate.id,
    provenance: exchangeRateProvenance({
      source: rate.source,
      from: rate.fromCurrency as ExchangeRateModel['from'],
      to: rate.toCurrency as ExchangeRateModel['to'],
    }),
    from: rate.fromCurrency as ExchangeRateModel['from'],
    to: rate.toCurrency as ExchangeRateModel['to'],
    numerator: rate.numerator,
    denominator: rate.denominator,
    source: rate.source,
    quoteSide: rate.quoteSide,
    referenceDate: {
      year: rate.referenceYear,
      month: rate.referenceMonth,
      day: rate.referenceDay,
    },
    createdAt: rate.createdAt.toISOString(),
    updatedAt: rate.updatedAt.toISOString(),
  };
}

/** Taxa factual não pode ter referência posterior à data lógica (UTC) de hoje. */
function assertNotFuture(referenceDate: LogicalDate, now = new Date()) {
  if (
    compareLogicalDates(referenceDate, logicalDateFromUtcInstant(now)) > 0
  ) {
    throw new Error('A data de referência da taxa não pode ser futura');
  }
}

function assertInput(input: ManualExchangeRateInput) {
  assertNotFuture(input.referenceDate);
  assertExchangeRate({
    ...input,
    source: 'MANUAL',
    quoteSide: 'GENERIC',
  });
}

function onOrBeforeReferenceDate(referenceDate: LogicalDate) {
  return {
    OR: [
      { referenceYear: { lt: referenceDate.year } },
      {
        referenceYear: referenceDate.year,
        OR: [
          { referenceMonth: { lt: referenceDate.month } },
          {
            referenceMonth: referenceDate.month,
            referenceDay: { lte: referenceDate.day },
          },
        ],
      },
    ],
  };
}

function parseListQuery(request: Request) {
  const params = new URL(request.url).searchParams;
  const page = Number(params.get('page') ?? '1');
  const limit = Number(params.get('limit') ?? String(DEFAULT_PAGE_SIZE));
  const fromRaw = params.get('from');
  const toRaw = params.get('to');
  const sourceRaw = params.get('source');
  const quoteSideRaw = params.get('quoteSide');
  const dateFromRaw = params.get('dateFrom');
  const dateToRaw = params.get('dateTo');

  if (
    !Number.isInteger(page) ||
    page < 1 ||
    !Number.isInteger(limit) ||
    limit < 1 ||
    limit > MAX_PAGE_SIZE
  ) {
    throw new Error('Paginação inválida');
  }

  const from =
    fromRaw && SUPPORTED_CURRENCIES.has(fromRaw as SupportedCurrency)
      ? (fromRaw as SupportedCurrency)
      : null;
  const to =
    toRaw && SUPPORTED_CURRENCIES.has(toRaw as SupportedCurrency)
      ? (toRaw as SupportedCurrency)
      : null;

  if (fromRaw && !from) throw new Error('Moeda de origem inválida');
  if (toRaw && !to) throw new Error('Moeda de destino inválida');

  if (sourceRaw && sourceRaw !== 'MANUAL' && sourceRaw !== 'BCB_PTAX') {
    throw new Error('Origem inválida');
  }
  if (
    quoteSideRaw &&
    quoteSideRaw !== 'GENERIC' &&
    quoteSideRaw !== 'BUY' &&
    quoteSideRaw !== 'SELL'
  ) {
    throw new Error('Lado da cotação inválido');
  }

  const dateFrom = dateFromRaw ? parseIsoLogicalDate(dateFromRaw) : null;
  const dateTo = dateToRaw ? parseIsoLogicalDate(dateToRaw) : null;
  if (dateFromRaw && !dateFrom) throw new Error('Data inicial inválida');
  if (dateToRaw && !dateTo) throw new Error('Data final inválida');
  if (dateFrom && dateTo && compareLogicalDates(dateFrom, dateTo) > 0) {
    throw new Error('Período inválido');
  }

  return {
    page,
    limit,
    from,
    to,
    source: (sourceRaw as ExchangeRateSource | null) || null,
    quoteSide: (quoteSideRaw as ExchangeRateQuoteSide | null) || null,
    dateFrom,
    dateTo,
  };
}

function onOrAfterReferenceDate(referenceDate: LogicalDate) {
  return {
    OR: [
      { referenceYear: { gt: referenceDate.year } },
      {
        referenceYear: referenceDate.year,
        OR: [
          { referenceMonth: { gt: referenceDate.month } },
          {
            referenceMonth: referenceDate.month,
            referenceDay: { gte: referenceDate.day },
          },
        ],
      },
    ],
  };
}

export async function listExchangeRatesForUser(
  userId: string,
  options: {
    page?: number;
    limit?: number;
    from?: SupportedCurrency | null;
    to?: SupportedCurrency | null;
    source?: ExchangeRateSource | null;
    quoteSide?: ExchangeRateQuoteSide | null;
    dateFrom?: LogicalDate | null;
    dateTo?: LogicalDate | null;
  } = {},
) {
  const page = options.page ?? 1;
  const limit = options.limit ?? DEFAULT_PAGE_SIZE;
  const where = {
    userId,
    ...(options.from ? { fromCurrency: options.from } : {}),
    ...(options.to ? { toCurrency: options.to } : {}),
    ...(options.source ? { source: options.source } : {}),
    ...(options.quoteSide ? { quoteSide: options.quoteSide } : {}),
    ...(options.dateFrom || options.dateTo
      ? {
          AND: [
            ...(options.dateFrom
              ? [onOrAfterReferenceDate(options.dateFrom)]
              : []),
            ...(options.dateTo
              ? [onOrBeforeReferenceDate(options.dateTo)]
              : []),
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.exchangeRate.findMany({
      where,
      orderBy: [
        { referenceYear: 'desc' },
        { referenceMonth: 'desc' },
        { referenceDay: 'desc' },
        { fromCurrency: 'asc' },
        { toCurrency: 'asc' },
        { source: 'asc' },
        { id: 'asc' },
      ],
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.exchangeRate.count({ where }),
  ]);

  return {
    items: items.map(toModel),
    total,
    page,
    limit,
    hasMore: page * limit < total,
  };
}

/**
 * Leitura mínima para o Patrimônio: por par (direto e inverso) busca somente as
 * linhas mais recentes elegíveis (<= asOf). Uma MANUAL e uma PTAX do lado
 * pedido cobrem a data mais recente, então `take: 2` basta (no máximo
 * 2 × pares queries, apoiadas pelo índice do par).
 */
export async function findRatesForConsolidation(
  userId: string,
  pairs: Array<{ from: SupportedCurrency; to: SupportedCurrency }>,
  asOf: LogicalDate,
  quoteSide: Exclude<ExchangeRateQuoteSide, 'GENERIC'> = 'SELL',
) {
  const directions = pairs.flatMap((pair) => [
    { from: pair.from, to: pair.to },
    { from: pair.to, to: pair.from },
  ]);

  const results = await Promise.all(
    directions.map((direction) =>
      prisma.exchangeRate.findMany({
        where: {
          userId,
          fromCurrency: direction.from,
          toCurrency: direction.to,
          quoteSide: { in: ['GENERIC', quoteSide] },
          ...onOrBeforeReferenceDate(asOf),
        },
        orderBy: [
          { referenceYear: 'desc' },
          { referenceMonth: 'desc' },
          { referenceDay: 'desc' },
          { source: 'asc' },
          { id: 'asc' },
        ],
        take: 2,
      }),
    ),
  );

  return results.flat().map(toModel);
}

export async function getExchangeRates(
  request: Request = new Request("http://localhost/api/exchange-rates"),
) {
  try {
    const userId = await getAuthenticatedUserId();
    const query = parseListQuery(request);
    return success(await listExchangeRatesForUser(userId, query));
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return failure('Não autenticado', 401);
    }
    if (error instanceof Error && /inválid/.test(error.message)) {
      return failure(error.message, 400);
    }
    return failure('Erro ao carregar taxas de câmbio', 500);
  }
}

export async function upsertExchangeRate(request: Request) {
  try {
    const userId = await getAuthenticatedUserId();
    const input = manualExchangeRateInputSchema.parse(
      await parseJsonBody(request),
    );
    assertInput(input);

    const rate = await prisma.exchangeRate.upsert({
      where: {
        userId_fromCurrency_toCurrency_source_quoteSide_referenceYear_referenceMonth_referenceDay: {
          userId,
          fromCurrency: input.from,
          toCurrency: input.to,
          source: 'MANUAL',
          quoteSide: 'GENERIC',
          referenceYear: input.referenceDate.year,
          referenceMonth: input.referenceDate.month,
          referenceDay: input.referenceDate.day,
        },
      },
      update: {
        numerator: input.numerator,
        denominator: input.denominator,
      },
      create: {
        userId,
        fromCurrency: input.from,
        toCurrency: input.to,
        numerator: input.numerator,
        denominator: input.denominator,
        source: 'MANUAL',
        quoteSide: 'GENERIC',
        referenceYear: input.referenceDate.year,
        referenceMonth: input.referenceDate.month,
        referenceDay: input.referenceDate.day,
      },
    });

    return success(toModel(rate), 'Taxa manual salva com sucesso');
  } catch (error) {
    if (error instanceof ZodError) {
      return failure(error.issues[0]?.message ?? 'Taxa inválida', 400);
    }
    if (isUnauthorizedError(error)) {
      return failure('Não autenticado', 401);
    }
    if (error instanceof Error) {
      return failure(error.message, 400);
    }
    return failure('Erro ao salvar taxa de câmbio', 500);
  }
}

export async function importPtaxExchangeRate(request: Request) {
  try {
    const userId = await getAuthenticatedUserId();
    const limit = await consumePtaxFetchRateLimit(userId);
    if (limit.limited) {
      return rateLimitFailure(
        'Muitas consultas de PTAX em pouco tempo. Tente novamente mais tarde',
        limit.retryAfterSeconds,
        'PTAX_RATE_LIMITED',
      );
    }
    const input = ptaxExchangeRateInputSchema.parse(await parseJsonBody(request));
    assertNotFuture(input.referenceDate);
    const rate = await fetchPtaxExchangeRate(input);

    const saved = await prisma.exchangeRate.upsert({
      where: {
        userId_fromCurrency_toCurrency_source_quoteSide_referenceYear_referenceMonth_referenceDay: {
          userId,
          fromCurrency: rate.from,
          toCurrency: rate.to,
          source: 'BCB_PTAX',
          quoteSide: rate.quoteSide,
          referenceYear: rate.referenceDate.year,
          referenceMonth: rate.referenceDate.month,
          referenceDay: rate.referenceDate.day,
        },
      },
      update: {
        numerator: rate.numerator,
        denominator: rate.denominator,
      },
      create: {
        userId,
        fromCurrency: rate.from,
        toCurrency: rate.to,
        numerator: rate.numerator,
        denominator: rate.denominator,
        source: 'BCB_PTAX',
        quoteSide: rate.quoteSide,
        referenceYear: rate.referenceDate.year,
        referenceMonth: rate.referenceDate.month,
        referenceDay: rate.referenceDate.day,
      },
    });

    return success(toModel(saved), 'Cotação PTAX salva com sucesso');
  } catch (error) {
    if (error instanceof ZodError) {
      return failure(error.issues[0]?.message ?? 'Parâmetros inválidos', 400);
    }
    if (isUnauthorizedError(error)) {
      return failure('Não autenticado', 401);
    }
    if (error instanceof PtaxError) {
      const response = failure(error.message, error.status, error.kind);
      if (error.retryAfterSeconds) {
        response.headers.set('Retry-After', String(error.retryAfterSeconds));
      }
      return response;
    }
    if (error instanceof Error && /futura|diferentes|inválid/.test(error.message)) {
      return failure(error.message, 400);
    }
    return failure('Erro ao consultar cotação PTAX', 500);
  }
}

export async function deleteExchangeRate(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await getAuthenticatedUserId();
    const { id } = await context.params;
    const existing = await prisma.exchangeRate.findFirst({
      where: { id, userId, source: 'MANUAL' },
      select: { id: true },
    });

    if (!existing) {
      return failure('Taxa de câmbio não encontrada', 404);
    }

    await prisma.exchangeRate.delete({ where: { id } });
    return success(null, 'Taxa manual excluída com sucesso');
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return failure('Não autenticado', 401);
    }
    return failure('Erro ao excluir taxa de câmbio', 500);
  }
}
