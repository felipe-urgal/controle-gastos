import { Prisma } from '@prisma/client';

import { getFinancialInsightsFromContext } from '@/app/lib/insights/financial-insights';
import { getMonthlyDashboardForUser } from '@/app/lib/dashboard/monthly-dashboard';
import { logEvent } from '@/app/lib/observability';
import {
  buildWeeklyFinancialSummary,
  getCompletedWeeklySummaryPeriod,
  weeklyPeriodDates,
} from '@/app/lib/periodic-summary/periodic-summary-domain';
import { prisma } from '@/app/lib/prisma';
import { getForecastForUser, logicalDateFromUtcInstant } from '@/app/lib/forecast/forecast';
import { getSubscriptionsForUser } from '@/app/lib/subscriptions/subscriptions';
import {
  isSupportedCurrency,
  SUPPORTED_CURRENCIES,
  type SupportedCurrency,
} from '@/app/types/financial-summary';
import type {
  PeriodicFinancialSummary,
  PeriodicFinancialSummaryContent,
  PeriodicFinancialSummaryState,
} from '@/app/types/periodic-financial-summary';

export const PERIODIC_SUMMARY_CRON_BATCH_SIZE = 5;

function periodWhere(period: ReturnType<typeof getCompletedWeeklySummaryPeriod>) {
  return {
    periodStartYear: period.start.year,
    periodStartMonth: period.start.month,
    periodStartDay: period.start.day,
  };
}

function mapSummary(row: {
  id: string;
  generatedAt: Date;
  content: Prisma.JsonValue;
}): PeriodicFinancialSummary {
  return {
    id: row.id,
    generatedAt: row.generatedAt.toISOString(),
    content: row.content as unknown as PeriodicFinancialSummaryContent,
  };
}

async function buildContentForUser(
  userId: string,
  currency: SupportedCurrency,
  now: Date,
) {
  const period = getCompletedWeeklySummaryPeriod(now);
  const dates = weeklyPeriodDates(period);
  const asOf = logicalDateFromUtcInstant(now);

  const [transactions, forecast, dashboard, subscriptions] = await Promise.all([
    prisma.transaction.findMany({
      where: {
        userId,
        kind: 'NORMAL',
        status: 'COMPLETED',
        account: { is: { userId, currency } },
        OR: dates.map((date) => ({
          year: date.year,
          month: date.month,
          day: date.day,
        })),
      },
      select: {
        amount: true,
        type: true,
        category: { select: { id: true, name: true } },
        allocations: {
          select: {
            amount: true,
            category: { select: { id: true, name: true } },
          },
        },
      },
    }),
    getForecastForUser(userId, { currency, days: 30 }, now),
    getMonthlyDashboardForUser(
      userId,
      { year: asOf.year, month: asOf.month },
      currency,
      now,
    ),
    getSubscriptionsForUser(userId),
  ]);

  const insights = await getFinancialInsightsFromContext(
    userId,
    { year: asOf.year, month: asOf.month },
    currency,
    dashboard,
    forecast,
  );

  return buildWeeklyFinancialSummary({
    period,
    currency,
    transactions,
    forecast,
    insights,
    subscriptions,
  });
}

async function findSummary(
  userId: string,
  currency: SupportedCurrency,
  now: Date,
) {
  const period = getCompletedWeeklySummaryPeriod(now);
  return prisma.periodicFinancialSummary.findFirst({
    where: {
      userId,
      frequency: 'WEEKLY',
      currency,
      ...periodWhere(period),
    },
    select: {
      id: true,
      generatedAt: true,
      content: true,
    },
  });
}

export async function materializeWeeklySummaryForUser(
  userId: string,
  currency: SupportedCurrency,
  now: Date = new Date(),
): Promise<PeriodicFinancialSummary> {
  const existing = await findSummary(userId, currency, now);
  if (existing) return mapSummary(existing);

  const period = getCompletedWeeklySummaryPeriod(now);
  const content = await buildContentForUser(userId, currency, now);

  try {
    const created = await prisma.periodicFinancialSummary.create({
      data: {
        userId,
        frequency: 'WEEKLY',
        currency,
        periodStartYear: period.start.year,
        periodStartMonth: period.start.month,
        periodStartDay: period.start.day,
        periodEndYear: period.end.year,
        periodEndMonth: period.end.month,
        periodEndDay: period.end.day,
        content: content as unknown as Prisma.InputJsonValue,
      },
      select: {
        id: true,
        generatedAt: true,
        content: true,
      },
    });
    return mapSummary(created);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      const replay = await findSummary(userId, currency, now);
      if (replay) return mapSummary(replay);
    }
    throw error;
  }
}

export async function getPeriodicSummaryStateForUser(
  userId: string,
  currency: SupportedCurrency,
  now: Date = new Date(),
): Promise<PeriodicFinancialSummaryState> {
  const preference = await prisma.user.findFirst({
    where: { id: userId, isActive: true },
    select: {
      periodicSummaryEnabled: true,
      periodicSummaryFrequency: true,
    },
  });

  if (!preference) {
    return { enabled: false, frequency: 'WEEKLY', summary: null };
  }

  if (!preference.periodicSummaryEnabled) {
    return {
      enabled: false,
      frequency: preference.periodicSummaryFrequency,
      summary: null,
    };
  }

  return {
    enabled: true,
    frequency: preference.periodicSummaryFrequency,
    summary: await materializeWeeklySummaryForUser(userId, currency, now),
  };
}

async function currenciesForUser(userId: string) {
  const rows = await prisma.account.findMany({
    where: { userId },
    distinct: ['currency'],
    select: { currency: true },
  });

  const available = new Set(
    rows
      .map((row) => row.currency)
      .filter(isSupportedCurrency),
  );

  return SUPPORTED_CURRENCIES.filter((currency) => available.has(currency));
}

async function cronUsers() {
  const neverProcessed = await prisma.user.findMany({
    where: {
      isActive: true,
      periodicSummaryEnabled: true,
      periodicSummaryFrequency: 'WEEKLY',
      periodicSummaryLastProcessedAt: null,
    },
    select: { id: true },
    orderBy: { createdAt: 'asc' },
    take: PERIODIC_SUMMARY_CRON_BATCH_SIZE,
  });

  if (neverProcessed.length >= PERIODIC_SUMMARY_CRON_BATCH_SIZE) {
    return neverProcessed;
  }

  const remaining = PERIODIC_SUMMARY_CRON_BATCH_SIZE - neverProcessed.length;
  const alreadyProcessed = await prisma.user.findMany({
    where: {
      isActive: true,
      periodicSummaryEnabled: true,
      periodicSummaryFrequency: 'WEEKLY',
      periodicSummaryLastProcessedAt: { not: null },
      id: { notIn: neverProcessed.map((user) => user.id) },
    },
    select: { id: true },
    orderBy: { periodicSummaryLastProcessedAt: 'asc' },
    take: remaining,
  });

  return [...neverProcessed, ...alreadyProcessed];
}

export async function runPeriodicSummaryCron(now: Date = new Date()) {
  const users = await cronUsers();
  let processed = 0;
  let failed = 0;
  let summaries = 0;

  for (const user of users) {
    try {
      const currencies = await currenciesForUser(user.id);
      for (const currency of currencies) {
        await materializeWeeklySummaryForUser(user.id, currency, now);
        summaries += 1;
      }
      processed += 1;
    } catch (error) {
      failed += 1;
      logEvent('error', 'periodic_summary.user_failed', {}, error);
    }

    try {
      await prisma.user.update({
        where: { id: user.id },
        data: { periodicSummaryLastProcessedAt: now },
        select: { id: true },
      });
    } catch (error) {
      logEvent('error', 'periodic_summary.rotation_marker_failed', {}, error);
    }
  }

  return {
    frequency: 'WEEKLY' as const,
    batchLimit: PERIODIC_SUMMARY_CRON_BATCH_SIZE,
    selectedUsers: users.length,
    processedUsers: processed,
    failedUsers: failed,
    summaries,
  };
}
