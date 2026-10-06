import { success } from '@/app/lib/api-response';
import { apiFailureFromError } from '@/app/lib/api/api-error-response';
import { getAuthenticatedUserId } from '@/app/lib/auth';
import {
  getFormalRecurrenceSummaryForUser,
  recurrenceSummarySignature,
} from '@/app/lib/recurrences/formal-recurrences';
import {
  detectRecurrenceCandidates,
  RECURRENCE_CANDIDATE_HISTORY_LIMIT,
  RECURRENCE_CANDIDATE_WINDOW_MONTHS,
} from '@/app/lib/recurrences/recurrence-domain';
import { getRecurringHistoryForUser } from '@/app/lib/recurrences/recurring-history';
import { prisma } from '@/app/lib/prisma';
import { getSubscriptionsForUser } from '@/app/lib/subscriptions/subscriptions';

export { getFormalRecurrenceSummaryForUser } from '@/app/lib/recurrences/formal-recurrences';

export async function getRecurrencesForUser(
  userId: string,
  now: Date = new Date(),
) {
  const [formalSummary, historical, reviews] = await Promise.all([
    getFormalRecurrenceSummaryForUser(userId),
    getRecurringHistoryForUser(userId, now),
    prisma.recurrencePatternReview.findMany({
      where: { userId },
      select: {
        patternId: true,
        status: true,
      },
    }),
  ]);

  const { formal, totals } = formalSummary;
  const formalSignatures = new Set(formal.map(recurrenceSummarySignature));
  const reviewedPatternIds = new Set(reviews.map((review) => review.patternId));

  const candidates = detectRecurrenceCandidates(
    historical.filter((transaction) => transaction.seriesId === null),
  )
    .filter((candidate) => !formalSignatures.has(candidate.signature))
    .filter((candidate) => !reviewedPatternIds.has(candidate.id))
    .map((candidate) => ({
      ...candidate,
      source: 'DETECTED' as const,
    }));

  const subscriptions = await getSubscriptionsForUser(userId, {
    historical,
    formal,
    now,
  });

  return {
    formal,
    candidates,
    totals,
    subscriptions,
    candidateWindowMonths: RECURRENCE_CANDIDATE_WINDOW_MONTHS,
    candidateHistoryLimit: RECURRENCE_CANDIDATE_HISTORY_LIMIT,
  };
}

export async function getRecurrences() {
  try {
    const userId = await getAuthenticatedUserId();
    return success(await getRecurrencesForUser(userId));
  } catch (error) {
    return apiFailureFromError(error, {
      fallbackMessage: 'Erro ao carregar recorrências',
    });
  }
}
