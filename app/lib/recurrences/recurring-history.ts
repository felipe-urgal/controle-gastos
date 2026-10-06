import { prisma } from '@/app/lib/prisma';
import { recurringWindowStart } from '@/app/lib/recurrences/recurrence-scheduling';

export const RECURRING_HISTORY_WINDOW_MONTHS = 36;
export const RECURRING_HISTORY_LIMIT = 1000;

function fromWindow(start: { year: number; month: number }) {
  return {
    OR: [
      { year: { gt: start.year } },
      { year: start.year, month: { gte: start.month } },
    ],
  };
}

export async function getRecurringHistoryForUser(
  userId: string,
  now: Date = new Date(),
) {
  const start = recurringWindowStart(RECURRING_HISTORY_WINDOW_MONTHS, now);

  return prisma.transaction.findMany({
    where: {
      userId,
      kind: 'NORMAL',
      status: 'COMPLETED',
      transferId: null,
      ...fromWindow(start),
    },
    select: {
      id: true,
      amount: true,
      description: true,
      type: true,
      year: true,
      month: true,
      day: true,
      seriesId: true,
      account: {
        select: { id: true, name: true, currency: true },
      },
      category: {
        select: { id: true, name: true },
      },
      merchant: {
        select: { id: true, name: true },
      },
    },
    orderBy: [
      { year: 'desc' },
      { month: 'desc' },
      { day: 'desc' },
      { createdAt: 'desc' },
    ],
    take: RECURRING_HISTORY_LIMIT,
  });
}

export type RecurringHistoryTransaction = Awaited<
  ReturnType<typeof getRecurringHistoryForUser>
>[number];
