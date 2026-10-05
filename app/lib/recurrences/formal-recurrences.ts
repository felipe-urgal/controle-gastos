import { prisma } from '@/app/lib/prisma';
import {
  recurrenceEquivalents,
  recurrencePatternSignature,
} from '@/app/lib/recurrences/recurrence-domain';
import { isSupportedCurrency, type SupportedCurrency } from '@/app/types/financial-summary';
import type {
  RecurrenceCurrencyTotals,
  RecurrenceSummaryItem,
} from '@/app/types/recurrence';

export function recurrenceSummarySignature(item: RecurrenceSummaryItem) {
  return recurrencePatternSignature({
    accountId: item.account.id,
    categoryId: item.category.id,
    type: item.type,
    merchantId: item.merchant?.id,
    description: item.description,
    frequency: item.frequency,
    interval: item.interval,
  });
}

export async function getFormalRecurrenceSummaryForUser(userId: string) {
  const series = await prisma.transactionSeries.findMany({
    where: {
      userId,
      type: 'RECURRING',
      endedAt: null,
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
          merchant: {
            select: { id: true, name: true },
          },
        },
        orderBy: [
          { year: 'asc' },
          { month: 'asc' },
          { day: 'asc' },
          { seriesIndex: 'asc' },
        ],
      },
      _count: {
        select: {
          transactions: true,
        },
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
      type: next.type,
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
      occurrenceCount: item._count.transactions,
      remainingOccurrences: item.transactions.length,
      account: { id: next.account.id, name: next.account.name },
      category: { id: next.category.id, name: next.category.name },
      merchant: next.merchant
        ? { id: next.merchant.id, name: next.merchant.name }
        : null,
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
