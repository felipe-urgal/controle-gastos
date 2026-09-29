import { ZodError } from 'zod';

import { parseJsonBody } from '@/app/lib/api/request-json';
import { failure, success } from '@/app/lib/api-response';
import { getAuthenticatedUserId, isUnauthorizedError } from '@/app/lib/auth';
import { assertExchangeRate } from '@/app/lib/currency/exchange-rate-domain';
import { prisma } from '@/app/lib/prisma';
import {
  manualExchangeRateInputSchema,
  type ManualExchangeRateInput,
} from '@/app/lib/currency/exchange-rate-schema';
import type { ExchangeRateModel } from '@/app/types/exchange-rate';

function toModel(rate: {
  id: string;
  fromCurrency: string;
  toCurrency: string;
  numerator: number;
  denominator: number;
  source: 'MANUAL';
  referenceYear: number;
  referenceMonth: number;
  referenceDay: number;
  createdAt: Date;
  updatedAt: Date;
}): ExchangeRateModel {
  return {
    id: rate.id,
    from: rate.fromCurrency as ExchangeRateModel['from'],
    to: rate.toCurrency as ExchangeRateModel['to'],
    numerator: rate.numerator,
    denominator: rate.denominator,
    source: rate.source,
    referenceDate: {
      year: rate.referenceYear,
      month: rate.referenceMonth,
      day: rate.referenceDay,
    },
    createdAt: rate.createdAt.toISOString(),
    updatedAt: rate.updatedAt.toISOString(),
  };
}

function assertInput(input: ManualExchangeRateInput) {
  assertExchangeRate({
    ...input,
    source: 'MANUAL',
  });
}

export async function listExchangeRatesForUser(userId: string) {
  const items = await prisma.exchangeRate.findMany({
    where: { userId, source: 'MANUAL' },
    orderBy: [
      { fromCurrency: 'asc' },
      { toCurrency: 'asc' },
      { referenceYear: 'desc' },
      { referenceMonth: 'desc' },
      { referenceDay: 'desc' },
      { id: 'asc' },
    ],
  });

  return {
    items: items.map(toModel),
    total: items.length,
  };
}

export async function getExchangeRates() {
  try {
    const userId = await getAuthenticatedUserId();
    return success(await listExchangeRatesForUser(userId));
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return failure('Não autenticado', 401);
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
        userId_fromCurrency_toCurrency_source_referenceYear_referenceMonth_referenceDay: {
          userId,
          fromCurrency: input.from,
          toCurrency: input.to,
          source: 'MANUAL',
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
