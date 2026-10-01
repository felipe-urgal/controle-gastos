import { failure, rateLimitFailure, success } from '@/app/lib/api-response';
import { getAuthenticatedUserId } from '@/app/lib/auth';
import { isUnauthorizedError } from '@/app/lib/auth/auth-errors';
import { prisma } from '@/app/lib/prisma';
import { consumeTransactionMutationRateLimit } from '@/app/lib/security/application-rate-limit';
import { getSubscriptionsForUser } from '@/app/lib/subscriptions/subscriptions';
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

export async function createRecurrenceFromSubscription(
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
    const overview = await getSubscriptionsForUser(userId);
    const subscription = overview.confirmed.find((item) => item.id === id);
    if (!subscription) {
      return failure('Assinatura confirmada não encontrada', 404);
    }

    const duplicate = await prisma.transactionSeries.findFirst({
      where: {
        userId,
        type: 'RECURRING',
        frequency: subscription.frequency,
        interval: subscription.interval,
        transactions: {
          some: {
            userId,
            kind: 'NORMAL',
            status: 'PENDING',
            accountId: subscription.account.id,
            categoryId: subscription.category.id,
            merchantId: subscription.merchant?.id ?? null,
          },
        },
      },
      select: { id: true },
    });
    if (duplicate) {
      return failure('Já existe uma recorrência ativa equivalente para esta assinatura', 409);
    }

    const start = firstFutureOccurrence(
      subscription.nextCharge,
      subscription.frequency,
      subscription.interval,
    );
    const occurrences = defaultOccurrences(subscription.frequency, subscription.interval);

    const created = await prisma.$transaction((tx) =>
      createFlexibleSeriesWithTx(tx, userId, {
        transaction: {
          amount: subscription.currentAmount,
          description: subscription.description,
          categoryId: subscription.category.id,
          merchantId: subscription.merchant?.id ?? null,
          accountId: subscription.account.id,
          day: start.day,
          month: start.month,
          year: start.year,
          status: 'PENDING',
          type: 'EXPENSE',
        },
        recurrence: {
          frequency: subscription.frequency,
          interval: subscription.interval,
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
      'Recorrência criada a partir da assinatura',
      201,
    );
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return failure('Não autenticado', 401);
    }
    return failure('Não foi possível criar a recorrência da assinatura', 500);
  }
}
