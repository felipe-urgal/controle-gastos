import { success } from '@/app/lib/api-response';
import { apiFailureFromError } from '@/app/lib/api/api-error-response';
import { getAuthenticatedUserId } from '@/app/lib/auth';
import { prisma } from '@/app/lib/prisma';
import {
  detectRecurrenceCandidates,
  normalizeRecurrenceDescription,
  recurrenceEquivalents,
  RECURRENCE_CANDIDATE_HISTORY_LIMIT,
  RECURRENCE_CANDIDATE_WINDOW_MONTHS,
} from '@/app/lib/recurrences/recurrence-domain';
import { isSupportedCurrency, type SupportedCurrency } from '@/app/types/financial-summary';
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

  const formal: RecurrenceSummaryItem[] = series.flatMap((item) => {
    const next = item.transactions[0];
    if (!next || !next.category || !isSupportedCurrency(next.account.currency)) {
      return [];
    }

    const equivalents = recurrenceEquivalents(
      next.amount,
      item.frequency,
      item.interval,
    );

    return [{
      id: item.id,
      transactionId: next.id,
      source: 'FORMAL' as const,
      description: item.description || next.description,
      frequency: item.frequency,
      interval: item.interval,
      amount: next.amount,
      variableAmount: false as const,
      currency: next.account.currency,
      ...equivalents,
      nextOccurrence: {
        year: next.year,
        month: next.month,
        day: next.day,
      },
      account: { id: next.account.id, name: next.account.name },
      category: { id: next.category.id, name: next.category.name },
    }];
  });

  const totalsMap = new Map<SupportedCurrency, RecurrenceCurrencyTotals>();
  for (const item of formal) {
    const current = totalsMap.get(item.currency) ?? {
      currency: item.currency,
      monthlyEquivalent: 0,
      annualEquivalent: 0,
    };
    current.monthlyEquivalent += item.monthlyEquivalent;
    current.annualEquivalent += item.annualEquivalent;
    totalsMap.set(item.currency, current);
  }

  return {
    formal,
    totals: ['BRL', 'USD', 'EUR']
      .map((currency) => totalsMap.get(currency as SupportedCurrency))
      .filter((item): item is RecurrenceCurrencyTotals => Boolean(item)),
  };
}

export async function getRecurrencesForUser(userId: string) {
  const start = candidateWindowStart();

  const [formalSummary, historical] = await Promise.all([
    getFormalRecurrenceSummaryForUser(userId),
    prisma.transaction.findMany({
      where: {
        userId,
        type: 'EXPENSE',
        kind: 'NORMAL',
        status: 'COMPLETED',
        seriesId: null,
        transferId: null,
        ...fromWindow(start),
      },
      select: {
        id: true,
        amount: true,
        description: true,
        year: true,
        month: true,
        day: true,
        account: {
          select: { id: true, name: true, currency: true },
        },
        category: {
          select: { id: true, name: true },
        },
      },
      orderBy: [
        { year: 'desc' },
        { month: 'desc' },
        { day: 'desc' },
        { createdAt: 'desc' },
      ],
      take: RECURRENCE_CANDIDATE_HISTORY_LIMIT,
    }),
  ]);

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
    return apiFailureFromError(error, {
      fallbackMessage: 'Erro ao carregar recorrências',
    });
  }
}
