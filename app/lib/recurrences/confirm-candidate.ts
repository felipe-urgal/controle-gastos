import { Prisma } from '@prisma/client';

import { failure, rateLimitFailure, success } from '@/app/lib/api-response';
import { getAuthenticatedUserId } from '@/app/lib/auth';
import { isUnauthorizedError } from '@/app/lib/auth/auth-errors';
import { HttpError, isHttpError } from '@/app/lib/http-error';
import { prisma } from '@/app/lib/prisma';
import { findDetectedRecurrenceCandidateForUser } from '@/app/lib/recurrences/detected-candidates';
import {
  recurrenceSourceKey,
  type DetectedRecurrenceCandidate,
} from '@/app/lib/recurrences/recurrence-domain';
import {
  defaultRecurrenceOccurrences,
  firstFutureRecurrence,
} from '@/app/lib/recurrences/recurrence-scheduling';
import { consumeTransactionMutationRateLimit } from '@/app/lib/security/application-rate-limit';
import { createFlexibleSeriesWithTx } from '@/app/lib/transactions/flexible-series';

async function existingCandidateSeries(userId: string, sourceKey: string) {
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

async function confirmCandidateForUser(
  userId: string,
  candidate: DetectedRecurrenceCandidate,
  now: Date = new Date(),
) {
  const review = await prisma.recurrencePatternReview.findUnique({
    where: {
      userId_patternId: {
        userId,
        patternId: candidate.id,
      },
    },
    select: {
      status: true,
      seriesId: true,
    },
  });

  if (review?.status === 'SUPPRESSED') {
    throw new HttpError('Padrão marcado para não ser sugerido novamente', 409);
  }

  if (review?.status === 'CONFIRMED' && review.seriesId) {
    const series = await prisma.transactionSeries.findFirst({
      where: { id: review.seriesId, userId, type: 'RECURRING' },
      select: { id: true, occurrenceCount: true },
    });
    if (series) return { ...series, created: false };
  }

  const sourceKey = recurrenceSourceKey('candidate', candidate.id);
  const replay = await existingCandidateSeries(userId, sourceKey);
  if (replay) return { ...replay, created: false };

  const start = firstFutureRecurrence(
    candidate.nextOccurrence,
    candidate.frequency,
    candidate.interval,
    now,
  );
  const occurrences = defaultRecurrenceOccurrences(
    candidate.frequency,
    candidate.interval,
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
      if (existing) {
        return { ...existing, created: false };
      }

      const created = await createFlexibleSeriesWithTx(
        tx,
        userId,
        {
          transaction: {
            amount: candidate.amount,
            description: candidate.description,
            categoryId: candidate.category.id,
            merchantId: candidate.merchant?.id ?? null,
            accountId: candidate.account.id,
            day: start.day,
            month: start.month,
            year: start.year,
            status: 'PENDING',
            type: candidate.type,
          },
          recurrence: {
            frequency: candidate.frequency,
            interval: candidate.interval,
            mode: 'count',
            occurrences,
          },
        },
        { sourceKey },
      );

      await tx.recurrencePatternReview.upsert({
        where: {
          userId_patternId: {
            userId,
            patternId: candidate.id,
          },
        },
        create: {
          userId,
          patternId: candidate.id,
          signature: candidate.signature,
          status: 'CONFIRMED',
          seriesId: created.series.id,
        },
        update: {
          signature: candidate.signature,
          status: 'CONFIRMED',
          seriesId: created.series.id,
        },
      });

      return {
        id: created.series.id,
        occurrenceCount: created.occurrenceCount,
        created: true,
      };
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      const existing = await existingCandidateSeries(userId, sourceKey);
      if (existing) {
        await prisma.recurrencePatternReview.upsert({
          where: {
            userId_patternId: {
              userId,
              patternId: candidate.id,
            },
          },
          create: {
            userId,
            patternId: candidate.id,
            signature: candidate.signature,
            status: 'CONFIRMED',
            seriesId: existing.id,
          },
          update: {
            signature: candidate.signature,
            status: 'CONFIRMED',
            seriesId: existing.id,
          },
        });
        return { ...existing, created: false };
      }
    }
    throw error;
  }
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
    const candidate = await findDetectedRecurrenceCandidateForUser(userId, id);
    if (!candidate) {
      return failure('Candidato não encontrado', 404);
    }

    const result = await confirmCandidateForUser(userId, candidate);
    return success(
      {
        seriesId: result.id,
        occurrenceCount: result.occurrenceCount,
      },
      result.created
        ? 'Recorrência confirmada com sucesso'
        : 'Recorrência já estava confirmada',
      result.created ? 201 : 200,
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
