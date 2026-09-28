import { failure, success } from '@/app/lib/api-response';
import { getAuthenticatedUserId } from '@/app/lib/auth';
import { prisma } from '@/app/lib/prisma';
import {
  detectRecurrenceCandidates,
  recurrenceEquivalents,
  RECURRENCE_CANDIDATE_HISTORY_LIMIT,
  RECURRENCE_CANDIDATE_WINDOW_MONTHS,
} from '@/app/lib/recurrences/recurrence-domain';
import type { SupportedCurrency } from '@/app/types/financial-summary';
import type {
  RecurrenceCurrencyTotals,
  RecurrenceSummaryItem,
} from '@/app/types/recurrence';

function currentLogicalDate() {
  const now = new Date();
  return {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    day: now.getDate(),
  };
}

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

function logicalKey(value: { year: number; month: number; day: number }) {
  return value.year * 10_000 + value.month * 100 + value.day;
}

export async function getRecurrencesForUser(userId: string) {
  const today = currentLogicalDate();
  const start = candidateWindowStart();

  const [series, historical] = await Promise.all([
    prisma.transactionSeries.findMany({
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
    }),
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

  const formal: RecurrenceSummaryItem[] = series.flatMap((item) => {
    const next = item.transactions[0];
    if (!next || !next.category || !supportedCurrency(next.account.currency)) return [];
    if (logicalKey(next) < logicalKey(today)) return [];

    const equivalents = recurrenceEquivalents(
      next.amount,
      item.frequency,
      item.interval,
    );

    return [{
      id: item.id,
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

  const candidates = detectRecurrenceCandidates(historical).map((candidate) => ({
    ...candidate,
    source: 'DETECTED' as const,
  }));

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
    candidates,
    totals: ['BRL', 'USD', 'EUR']
      .map((currency) => totalsMap.get(currency as SupportedCurrency))
      .filter((item): item is RecurrenceCurrencyTotals => Boolean(item)),
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
