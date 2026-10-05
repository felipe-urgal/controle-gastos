import { Prisma } from '@prisma/client';

import { failure, rateLimitFailure, success } from '@/app/lib/api-response';
import { getAuthenticatedUserId } from '@/app/lib/auth';
import { isUnauthorizedError } from '@/app/lib/auth/auth-errors';
import { isHttpError } from '@/app/lib/http-error';
import { prisma } from '@/app/lib/prisma';
import { recurrenceSourceKey } from '@/app/lib/recurrences/recurrence-domain';
import {
  defaultRecurrenceOccurrences,
  firstFutureRecurrence,
} from '@/app/lib/recurrences/recurrence-scheduling';
import { consumeTransactionMutationRateLimit } from '@/app/lib/security/application-rate-limit';
import { getSubscriptionsForUser } from '@/app/lib/subscriptions/subscriptions';
import { createFlexibleSeriesWithTx } from '@/app/lib/transactions/flexible-series';
import type { SubscriptionItem } from '@/app/types/subscription';

async function existingSubscriptionSeries(userId: string, sourceKey: string) {
  return prisma.transactionSeries.findUnique({
    where: {
      userId_sourceKey: {
        userId,
        sourceKey,
      },
    },
    select: {
      id: true,
      occurrenceCount: true,
    },
  });
}

export async function createRecurrenceFromSubscriptionForUser(
  userId: string,
  subscription: SubscriptionItem,
  now: Date = new Date(),
) {
  if (subscription.requiresActivityReview) {
    return {
      conflict: 'Revise se a assinatura continua ativa antes de criar uma recorrência',
    } as const;
  }

  if (subscription.recurrenceSeriesId) {
    const existing = await prisma.transactionSeries.findFirst({
      where: {
        id: subscription.recurrenceSeriesId,
        userId,
        type: 'RECURRING',
        endedAt: null,
      },
      select: { id: true, occurrenceCount: true },
    });
    if (existing) return { ...existing, created: false } as const;
  }

  const sourceKey = recurrenceSourceKey('subscription', subscription.id);
  const replay = await existingSubscriptionSeries(userId, sourceKey);
  if (replay) return { ...replay, created: false } as const;

  const start = firstFutureRecurrence(
    subscription.nextCharge,
    subscription.frequency,
    subscription.interval,
    now,
  );
  const occurrences = defaultRecurrenceOccurrences(
    subscription.frequency,
    subscription.interval,
  );

  try {
    return await prisma.$transaction(async (tx) => {
      const existing = await tx.transactionSeries.findUnique({
        where: {
          userId_sourceKey: {
            userId,
            sourceKey,
          },
        },
        select: { id: true, occurrenceCount: true },
      });
      if (existing) return { ...existing, created: false } as const;

      const created = await createFlexibleSeriesWithTx(
        tx,
        userId,
        {
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
        },
        { sourceKey },
      );

      return {
        id: created.series.id,
        occurrenceCount: created.occurrenceCount,
        created: true,
      } as const;
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      const existing = await existingSubscriptionSeries(userId, sourceKey);
      if (existing) return { ...existing, created: false } as const;
    }
    throw error;
  }
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

    const result = await createRecurrenceFromSubscriptionForUser(
      userId,
      subscription,
    );
    if ('conflict' in result) {
      return failure(result.conflict, 409);
    }

    return success(
      {
        seriesId: result.id,
        occurrenceCount: result.occurrenceCount,
      },
      result.created
        ? 'Recorrência criada a partir da assinatura'
        : 'A assinatura já possui recorrência ativa',
      result.created ? 201 : 200,
    );
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return failure('Não autenticado', 401);
    }
    if (isHttpError(error)) {
      return failure(error.message, error.status, error.code);
    }
    return failure('Não foi possível criar a recorrência da assinatura', 500);
  }
}
