import { Prisma } from '@prisma/client';

import { logEvent } from '@/app/lib/observability';
import {
  buildWeeklyFinancialSummary,
  getCompletedWeeklySummaryPeriod,
  weeklyPeriodDates,
} from '@/app/lib/periodic-summary/periodic-summary-domain';
import { prisma } from '@/app/lib/prisma';
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

// Um job diário de 60 s não pode prometer cobertura para volume ilimitado.
// O cron prioriza a quota diária do backlog, com limites de tempo e segurança.
export const PERIODIC_SUMMARY_CRON_MAX_USERS = 200;
export const PERIODIC_SUMMARY_CRON_TIME_BUDGET_MS = 48_000;

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
  // Os registros legados podem conter Forecast/Insights stale: não expor esses
  // campos no contrato de leitura, sem regravar snapshots históricos.
  const stored = row.content as unknown as PeriodicFinancialSummaryContent;
  return {
    id: row.id,
    generatedAt: row.generatedAt.toISOString(),
    content: {
      frequency: stored.frequency,
      currency: stored.currency,
      period: stored.period,
      totals: stored.totals,
      topCategories: stored.topCategories,
    },
  };
}

async function buildContentForUser(
  userId: string,
  currency: SupportedCurrency,
  now: Date,
) {
  const period = getCompletedWeeklySummaryPeriod(now);
  const transactions = await prisma.transaction.findMany({
    where: {
      userId,
      kind: 'NORMAL',
      status: 'COMPLETED',
      account: { is: { userId, currency } },
      OR: weeklyPeriodDates(period),
    },
    select: {
      amount: true,
      type: true,
      account: { select: { type: true } },
      category: { select: { id: true, name: true } },
      allocations: {
        select: {
          amount: true,
          category: { select: { id: true, name: true } },
        },
      },
    },
  });
  return buildWeeklyFinancialSummary({ period, currency, transactions });
}

async function findSummary(userId: string, currency: SupportedCurrency, now: Date) {
  return prisma.periodicFinancialSummary.findFirst({
    where: {
      userId,
      frequency: 'WEEKLY',
      currency,
      ...periodWhere(getCompletedWeeklySummaryPeriod(now)),
    },
    select: { id: true, generatedAt: true, content: true },
  });
}

/** Materialização idempotente: snapshot histórico imutável, inclusive após correções. */
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
      select: { id: true, generatedAt: true, content: true },
    });
    return mapSummary(created);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
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

  if (!preference) return { enabled: false, frequency: 'WEEKLY', summary: null };
  if (!preference.periodicSummaryEnabled) {
    return {
      enabled: false,
      frequency: preference.periodicSummaryFrequency,
      summary: null,
    };
  }

  // GET faz fallback lazy somente quando o cron ainda não criou o período.
  const existing = await findSummary(userId, currency, now);
  if (existing) {
    return {
      enabled: true,
      frequency: preference.periodicSummaryFrequency,
      summary: mapSummary(existing),
    };
  }

  const startedAt = performance.now();
  try {
    const summary = await materializeWeeklySummaryForUser(userId, currency, now);
    logEvent('info', 'periodic_summary.on_demand', {
      currency,
      durationMs: Math.round(performance.now() - startedAt),
      result: 'success',
    });
    return { enabled: true, frequency: preference.periodicSummaryFrequency, summary };
  } catch (error) {
    logEvent('error', 'periodic_summary.on_demand', {
      currency,
      durationMs: Math.round(performance.now() - startedAt),
      result: 'failed',
    }, error);
    throw error;
  }
}

async function currenciesForUser(userId: string) {
  const rows = await prisma.account.findMany({
    where: { userId, isActive: true },
    distinct: ['currency'],
    select: { currency: true },
  });
  const available = new Set(rows.map((row) => row.currency).filter(isSupportedCurrency));
  return SUPPORTED_CURRENCIES.filter((currency) => available.has(currency));
}

function eligibleCronUsersWhere(weekStart: Date) {
  return {
    isActive: true,
    periodicSummaryEnabled: true,
    periodicSummaryFrequency: 'WEEKLY' as const,
    OR: [
      { periodicSummaryLastProcessedAt: null },
      { periodicSummaryLastProcessedAt: { lt: weekStart } },
    ],
  };
}

async function cronUsers(weekStart: Date, take: number) {
  const neverProcessed = await prisma.user.findMany({
    where: {
      ...eligibleCronUsersWhere(weekStart),
      periodicSummaryLastProcessedAt: null,
    },
    select: { id: true },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    take,
  });
  if (neverProcessed.length >= take) return neverProcessed;

  const alreadyProcessed = await prisma.user.findMany({
    where: {
      ...eligibleCronUsersWhere(weekStart),
      periodicSummaryLastProcessedAt: { not: null, lt: weekStart },
    },
    select: { id: true },
    orderBy: [
      { periodicSummaryLastProcessedAt: 'asc' },
      { createdAt: 'asc' },
      { id: 'asc' },
    ],
    take: take - neverProcessed.length,
  });
  return [...neverProcessed, ...alreadyProcessed];
}

export async function runPeriodicSummaryCron(now: Date = new Date()) {
  const startedAt = performance.now();
  const period = getCompletedWeeklySummaryPeriod(now);
  const weekStart = new Date(Date.UTC(
    period.end.year, period.end.month - 1, period.end.day + 1,
  ));
  const daysRemaining = 7 - ((now.getUTCDay() + 6) % 7);
  const [backlog, oldestProcessed] = await Promise.all([
    prisma.user.count({ where: eligibleCronUsersWhere(weekStart) }),
    prisma.user.findFirst({
      where: {
        ...eligibleCronUsersWhere(weekStart),
        periodicSummaryLastProcessedAt: { not: null, lt: weekStart },
      },
      select: { periodicSummaryLastProcessedAt: true },
      orderBy: { periodicSummaryLastProcessedAt: 'asc' },
    }),
  ]);
  const batchLimit = Math.min(
    PERIODIC_SUMMARY_CRON_MAX_USERS,
    Math.ceil(backlog / daysRemaining),
  );
  const users = batchLimit > 0 ? await cronUsers(weekStart, batchLimit) : [];
  let processed = 0;
  let failed = 0;
  let summaries = 0;
  let markerFailures = 0;
  let deadlineReached = false;

  for (const user of users) {
    if (performance.now() - startedAt >= PERIODIC_SUMMARY_CRON_TIME_BUDGET_MS) {
      deadlineReached = true;
      break;
    }
    const userStartedAt = performance.now();
    try {
      const currencies = await currenciesForUser(user.id);
      // Falha parcial por moeda = falha do usuário inteiro; não avançar o marker.
      for (const currency of currencies) {
        await materializeWeeklySummaryForUser(user.id, currency, now);
        summaries += 1;
      }
      processed += 1;
      try {
        await prisma.user.update({
          where: { id: user.id },
          data: { periodicSummaryLastProcessedAt: now },
          select: { id: true },
        });
      } catch (error) {
        markerFailures += 1;
        logEvent('error', 'periodic_summary.rotation_marker_failed', {}, error);
      }
      logEvent('info', 'periodic_summary.user', {
        result: 'success',
        durationMs: Math.round(performance.now() - userStartedAt),
        currencies: currencies.length,
      });
    } catch (error) {
      failed += 1;
      logEvent('error', 'periodic_summary.user_failed', {
        durationMs: Math.round(performance.now() - userStartedAt),
      }, error);
    }
  }

  const backlogRemaining = Math.max(0, backlog - processed + markerFailures);
  const metrics = {
    frequency: 'WEEKLY' as const,
    batchLimit,
    maxUsers: PERIODIC_SUMMARY_CRON_MAX_USERS,
    daysRemaining,
    selectedUsers: users.length,
    processedUsers: processed,
    failedUsers: failed,
    summaries,
    markerFailures,
    backlog,
    backlogRemaining,
    oldestLastProcessedAt: oldestProcessed?.periodicSummaryLastProcessedAt?.toISOString() ?? null,
    coverageAtRisk: backlogRemaining > PERIODIC_SUMMARY_CRON_MAX_USERS * Math.max(0, daysRemaining - 1),
    deadlineReached,
    durationMs: Math.round(performance.now() - startedAt),
  };
  logEvent('info', 'periodic_summary.cron', metrics);
  return metrics;
}
