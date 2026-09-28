import { failure, success } from '@/app/lib/api-response';
import { getAuthenticatedUserId } from '@/app/lib/auth';
import { prisma } from '@/app/lib/prisma';
import {
  detectRecurrenceCandidates,
  normalizeRecurrenceDescription,
  recurrenceEquivalents,
  RECURRENCE_CANDIDATE_HISTORY_LIMIT,
  RECURRENCE_CANDIDATE_WINDOW_MONTHS,
} from '@/app/lib/recurrences/recurrence-domain';
import type { SupportedCurrency } from '@/app/types/financial-summary';
import type {
  RecurrenceCurrencyTotals,
  RecurrenceSummaryItem,
} from '@/app/types/recurrence';

function candidateWindowStart() {
  const now = new Date();
  const start = new Date(
    now.getFullYear(),
    now.getMonth() - (RECURRENCE_CANDIDATE_WINDOW_MONTHS - 1),
    1,
  );
  return { year: start.getFullYear(), month: start.getMonth() + 1 };
}

function fromWindow(start: { year: number; month: number }) {
  return {
    OR: [
      { year: { gt: start.year } },
      { year: start.year, month: { gte: start.month } },
    ],
  };
}

function supportedCurrency(value: string): value is SupportedCurrency {
  return value === 'BRL' || value === 'USD' || value === 'EUR';
}

export async function getFormalRecurrenceSummaryForUser(userId: string) {
  const series = await prisma.transactionSeries.findMany({
    where: {
      userId,
      type: 'RECURRING',
      transactions: {
        some: {
          userId,
          status: 'PENDING',
          kind: 'NORMAL',
        },
      },
    },
    include: {
      transactions: {
        where: {
          userId,
          status: 'PENDING',
          kind: 'NORMAL',
        },
        include: {
          account: {
            select: { id: true, name: true, currency: true },
          },
          category: {
            select: { id: true, name: true },
          },
        },
        orderBy: [
          { year: 'asc' },
          { month: 'asc' },
          { day: 'asc' },
          { seriesIndex: 'asc' },
        ],
        take: 1,
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const { formal, totals } = formalSummary;

  const formalSignatures = new Set(
    formal.map((item) =>
      [
        item.account.id,
        item.category.id,
        normalizeRecurrenceDescription(item.description),
        item.frequency,
        String(item.interval),
      ].join('|'),
    ),
  );

  const candidates = detectRecurrenceCandidates(historical)
    .filter(
      (candidate) =>
        !formalSignatures.has(
          [
            candidate.account.id,
            candidate.category.id,
            candidate.normalizedDescription,
            candidate.frequency,
            String(candidate.interval),
          ].join('|'),
        ),
    )
    .map((candidate) => ({
      ...candidate,
      source: 'DETECTED' as const,
    }));

  return {
    formal,
    candidates,
    totals,
    candidateWindowMonths: RECURRENCE_CANDIDATE_WINDOW_MONTHS,
    candidateHistoryLimit: RECURRENCE_CANDIDATE_HISTORY_LIMIT,
  };
}

export async function getRecurrences() {
  try {
    const userId = await getAuthenticatedUserId();
    return success(await getRecurrencesForUser(userId));
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return failure('Não autenticado', 401);
    }
    return failure('Erro ao carregar recorrências', 500);
  }
}
