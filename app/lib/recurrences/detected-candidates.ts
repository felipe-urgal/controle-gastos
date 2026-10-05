import {
  detectRecurrenceCandidates,
  type DetectedRecurrenceCandidate,
} from '@/app/lib/recurrences/recurrence-domain';
import { getRecurringHistoryForUser } from '@/app/lib/recurrences/recurring-history';

export async function getDetectedRecurrenceCandidatesForUser(
  userId: string,
  now: Date = new Date(),
): Promise<DetectedRecurrenceCandidate[]> {
  const historical = await getRecurringHistoryForUser(userId, now);
  return detectRecurrenceCandidates(
    historical.filter((transaction) => transaction.seriesId === null),
  );
}

export async function findDetectedRecurrenceCandidateForUser(
  userId: string,
  id: string,
  now: Date = new Date(),
) {
  const candidates = await getDetectedRecurrenceCandidatesForUser(userId, now);
  return candidates.find((candidate) => candidate.id === id) ?? null;
}
