import { failure, rateLimitFailure, success } from '@/app/lib/api-response';
import { getAuthenticatedUserId } from '@/app/lib/auth';
import { isUnauthorizedError } from '@/app/lib/auth/auth-errors';
import { isHttpError } from '@/app/lib/http-error';
import { prisma } from '@/app/lib/prisma';
import { getRecurrencesForUser } from '@/app/lib/recurrences/recurrences';
import { consumeTransactionMutationRateLimit } from '@/app/lib/security/application-rate-limit';
import { createFlexibleSeriesWithTx } from '@/app/lib/transactions/flexible-series';
import { getLogicalRecurrenceDateAtIndex } from '@/app/lib/transactions/logical-recurrence';

function logicalKey(value: { year: number; month: number; day: number }) {
  return value.year * 10_000 + value.month * 100 + value.day;
}

function today() {
  const now = new Date();
  return {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    day: now.getDate(),
  };
}

function firstFutureOccurrence(
  start: { year: number; month: number; day: number },
  frequency: 'WEEKLY' | 'MONTHLY' | 'YEARLY',
  interval: number,
) {
  const current = today();
  let candidate = start;

  for (let index = 0; index < 240 && logicalKey(candidate) < logicalKey(current); index += 1) {
    candidate = getLogicalRecurrenceDateAtIndex({
      start: candidate,
      frequency,
      interval,
      index: 1,
    });
  }

  return candidate;
}

function defaultOccurrences(
  frequency: 'WEEKLY' | 'MONTHLY' | 'YEARLY',
  interval: number,
) {
  if (frequency === 'WEEKLY') return interval === 2 ? 26 : 52;
  if (frequency === 'MONTHLY') return interval === 3 ? 4 : 12;
  return 5;
}

export async function confirmRecurrenceCandidate(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await getAuthenticatedUserId();
    const limit = await consumeTransactionMutationRateLimit(userId);
    if (limit.limited) {
      return rateLimitFailure(
        'Muitas alterações financeiras em pouco tempo. Tente novamente em instantes',
        limit.retryAfterSeconds,
        'TRANSACTION_RATE_LIMITED',
      );
    }

    const { id } = await context.params;
    const current = await getRecurrencesForUser(userId);
    const candidate = current.candidates.find((item) => item.id === id);
    if (!candidate) {
      return failure('Candidato não encontrado ou já confirmado', 404);
    }

    const start = firstFutureOccurrence(
      candidate.nextOccurrence,
      candidate.frequency,
      candidate.interval,
    );
    const occurrences = defaultOccurrences(candidate.frequency, candidate.interval);

    const created = await prisma.$transaction((tx) =>
      createFlexibleSeriesWithTx(tx, userId, {
        transaction: {
          amount: candidate.amount,
          description: candidate.description,
          categoryId: candidate.category.id,
          accountId: candidate.account.id,
          day: start.day,
          month: start.month,
          year: start.year,
          status: 'PENDING',
          type: 'EXPENSE',
        },
        recurrence: {
          frequency: candidate.frequency,
          interval: candidate.interval,
          mode: 'count',
          occurrences,
        },
      }),
    );

    return success(
      {
        seriesId: created.series.id,
        occurrenceCount: created.occurrenceCount,
      },
      'Recorrência confirmada com sucesso',
      201,
    );
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return failure('Não autenticado', 401);
    }
    if (isHttpError(error)) {
      return failure(error.message, error.status, error.code);
    }
    return failure('Não foi possível confirmar a recorrência', 500);
  }
}
