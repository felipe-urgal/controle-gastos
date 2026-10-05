import { failure, rateLimitFailure, success } from '@/app/lib/api-response';
import { getAuthenticatedUserId } from '@/app/lib/auth';
import { isUnauthorizedError } from '@/app/lib/auth/auth-errors';
import { assertCardPurchaseStatementMutable } from '@/app/lib/cards/credit-card-purchase-guards';
import { logicalDateFromUtcInstant, type LogicalDate } from '@/app/lib/date/logical-date';
import { HttpError, isHttpError } from '@/app/lib/http-error';
import { prisma } from '@/app/lib/prisma';
import { consumeTransactionMutationRateLimit } from '@/app/lib/security/application-rate-limit';

function onOrAfter(date: LogicalDate) {
  return {
    OR: [
      { year: { gt: date.year } },
      { year: date.year, month: { gt: date.month } },
      { year: date.year, month: date.month, day: { gte: date.day } },
    ],
  };
}

export async function endRecurrenceSeriesForUser(
  userId: string,
  id: string,
  now: Date = new Date(),
) {
  const asOf = logicalDateFromUtcInstant(now);

  return prisma.$transaction(async (tx) => {
    const series = await tx.transactionSeries.findFirst({
      where: { id, userId, type: 'RECURRING' },
      select: {
        id: true,
        endedAt: true,
      },
    });
    if (!series) throw new HttpError('Recorrência não encontrada', 404);

    const preservedCompletedCount = await tx.transaction.count({
      where: {
        seriesId: id,
        userId,
        kind: 'NORMAL',
        status: 'COMPLETED',
      },
    });

    if (series.endedAt) {
      return {
        id,
        endedAt: series.endedAt.toISOString(),
        cancelledPendingCount: 0,
        preservedCompletedCount,
      };
    }

    const futurePending = await tx.transaction.findMany({
      where: {
        seriesId: id,
        userId,
        kind: 'NORMAL',
        status: 'PENDING',
        ...onOrAfter(asOf),
      },
      select: {
        id: true,
        year: true,
        month: true,
        day: true,
        account: {
          select: {
            id: true,
            type: true,
            statementClosingDay: true,
            statementDueDay: true,
          },
        },
      },
      orderBy: [
        { year: 'asc' },
        { month: 'asc' },
        { day: 'asc' },
        { seriesIndex: 'asc' },
      ],
    });

    for (const transaction of futurePending) {
      await assertCardPurchaseStatementMutable(
        tx,
        userId,
        transaction.account,
        {
          year: transaction.year,
          month: transaction.month,
          day: transaction.day,
        },
      );
    }

    const cancelled = futurePending.length === 0
      ? { count: 0 }
      : await tx.transaction.updateMany({
          where: {
            id: { in: futurePending.map((transaction) => transaction.id) },
            userId,
            seriesId: id,
            status: 'PENDING',
          },
          data: {
            status: 'CANCELLED',
          },
        });

    await tx.transactionSeries.update({
      where: { id },
      data: {
        endedAt: now,
        sourceKey: null,
      },
    });

    return {
      id,
      endedAt: now.toISOString(),
      cancelledPendingCount: cancelled.count,
      preservedCompletedCount,
    };
  });
}

export async function endRecurrenceSeries(
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
    return success(
      await endRecurrenceSeriesForUser(userId, id),
      'Recorrência encerrada com sucesso',
    );
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return failure('Não autenticado', 401);
    }
    if (isHttpError(error)) {
      return failure(error.message, error.status, error.code);
    }
    return failure('Não foi possível encerrar a recorrência', 500);
  }
}
