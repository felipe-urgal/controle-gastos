import { success } from '@/app/lib/api-response';
import { apiFailureFromError } from '@/app/lib/api/api-error-response';
import { parseQuery } from '@/app/lib/api/query';
import { getAuthenticatedUserId } from '@/app/lib/auth';
import { dashboardPeriodSchema } from '@/app/lib/dashboard/dashboard-schema';
import { getMonthlyDashboardForUser } from '@/app/lib/dashboard/monthly-dashboard';
import { getForecastForUser } from '@/app/lib/forecast/forecast';
import { parseIsoLogicalDate } from '@/app/lib/date/logical-date';
import {
  buildFinancialInsights,
  FINANCIAL_INSIGHT_LIMIT,
} from '@/app/lib/insights/financial-insights-domain';
import { getFormalRecurrenceSummaryForUser } from '@/app/lib/recurrences/recurrences';
import { getSubscriptionsForUser } from '@/app/lib/subscriptions/subscriptions';
import { shiftDashboardPeriod } from '@/app/lib/dashboard/monthly-dashboard';
import { prisma } from '@/app/lib/prisma';
import type { MonthlyDashboard } from '@/app/types/dashboard';
import type { FinancialInsightsData } from '@/app/types/financial-insight';
import type { SupportedCurrency } from '@/app/types/financial-summary';


async function getCategorySpendingSeriesForUser(
  userId: string,
  period: { year: number; month: number },
  currency: SupportedCurrency,
  categories: readonly { id: string; name: string; realized: number }[],
) {
  if (categories.length === 0) return [];

  const historicalPeriods = Array.from({ length: 6 }, (_, index) =>
    shiftDashboardPeriod(period, index - 6),
  );
  const categoryIds = categories.map((category) => category.id);

  const [plainRows, allocationRows] = await Promise.all([
    prisma.transaction.groupBy({
      by: ['categoryId', 'year', 'month'],
      where: {
        userId,
        categoryId: { in: categoryIds },
        type: 'EXPENSE',
        kind: 'NORMAL',
        status: 'COMPLETED',
        allocations: { none: {} },
        OR: historicalPeriods,
        account: { is: { userId, currency } },
      },
      _sum: { amount: true },
    }),
    prisma.transactionAllocation.findMany({
      where: {
        userId,
        categoryId: { in: categoryIds },
        transaction: {
          is: {
            userId,
            type: 'EXPENSE',
            kind: 'NORMAL',
            status: 'COMPLETED',
            OR: historicalPeriods,
            account: { is: { userId, currency } },
          },
        },
      },
      select: {
        categoryId: true,
        amount: true,
        transaction: { select: { year: true, month: true } },
      },
    }),
  ]);

  const totals = new Map<string, number>();
  for (const row of plainRows) {
    if (!row.categoryId) continue;
    const key = `${row.categoryId}:${row.year}-${row.month}`;
    totals.set(key, (totals.get(key) ?? 0) + (row._sum.amount ?? 0));
  }
  for (const row of allocationRows) {
    const key = `${row.categoryId}:${row.transaction.year}-${row.transaction.month}`;
    totals.set(key, (totals.get(key) ?? 0) + row.amount);
  }

  return categories.map((category) => ({
    category: { id: category.id, name: category.name },
    currentAmount: category.realized,
    history: historicalPeriods.map(
      (historicalPeriod) =>
        totals.get(`${category.id}:${historicalPeriod.year}-${historicalPeriod.month}`) ?? 0,
    ),
  }));
}

export async function getFinancialInsightsFromContext(
  userId: string,
  period: { year: number; month: number },
  currency: SupportedCurrency,
  dashboard: MonthlyDashboard,
  forecast: Awaited<ReturnType<typeof getForecastForUser>>,
): Promise<FinancialInsightsData> {
  const [recurrenceSummary, subscriptions] = await Promise.all([
    getFormalRecurrenceSummaryForUser(userId),
    getSubscriptionsForUser(userId),
  ]);

  const recurrenceTotal =
    recurrenceSummary.totals.find((item) => item.currency === currency) ?? null;
  const categorySpendingSeries = await getCategorySpendingSeriesForUser(
    userId,
    period,
    currency,
    dashboard.categories,
  );

  const items = buildFinancialInsights({
    period,
    currency,
    asOf: forecast.asOf,
    categoryBudgets: dashboard.limits.map((item) => ({
      category: {
        id: item.category.id,
        name: item.category.name,
      },
      budget: item.amount,
      consumption: item.consumption,
    })),
    pendingExpenses: forecast.upcoming
      .filter(
        (item) => item.type === 'EXPENSE' && item.kind === 'NORMAL',
      )
      .map((item) => ({
        amount: item.amount,
        date: {
          year: item.year,
          month: item.month,
          day: item.day,
        },
      })),
    recurringMonthlyEquivalent: recurrenceTotal?.monthlyEquivalent ?? null,
    knownMonthlyExpense:
      dashboard.planning.realized + dashboard.planning.committed,
    forecastAccounts: forecast.accounts.map((account) => ({
      realizedBalance: account.realizedBalance,
      projectedBalance: account.projectedBalance,
    })),
    categorySpendingSeries,
    safeToSpend: forecast.safeToSpend,
    subscriptions: [...subscriptions.confirmed, ...subscriptions.possible],
    incomeChange: {
      currentIncome: dashboard.summary.income,
      previousIncome:
        dashboard.summary.income - dashboard.comparison.income.difference,
      previousPeriod: dashboard.comparison.previousPeriod,
    },
    goals: dashboard.goals.map((goal) => ({
      id: goal.id,
      name: goal.name,
      targetAmount: goal.targetAmount,
      currentAmount: goal.currentAmount,
      remainingAmount: goal.remainingAmount,
      targetDate: goal.targetDate ? parseIsoLogicalDate(goal.targetDate) : null,
    })),
  });

  return {
    period,
    currency,
    items,
    limit: FINANCIAL_INSIGHT_LIMIT,
  };
}

export async function getFinancialInsightsForUser(
  userId: string,
  period: { year: number; month: number },
  currency: SupportedCurrency,
  now: Date = new Date(),
): Promise<FinancialInsightsData> {
  const [dashboard, forecast] = await Promise.all([
    getMonthlyDashboardForUser(userId, period, currency),
    getForecastForUser(userId, { currency, days: 30 }, now),
  ]);

  return getFinancialInsightsFromContext(
    userId,
    period,
    currency,
    dashboard,
    forecast,
  );
}

function parseRequest(request: Request) {
  return parseQuery(request, dashboardPeriodSchema, {
    year: null,
    month: null,
    currency: undefined,
  });
}

export async function getFinancialInsights(request: Request) {
  try {
    const userId = await getAuthenticatedUserId();
    const { year, month, currency } = parseRequest(request);

    return success(
      await getFinancialInsightsForUser(
        userId,
        { year, month },
        currency,
      ),
    );
  } catch (error) {
    return apiFailureFromError(error, {
      fallbackMessage: 'Erro ao carregar insights financeiros',
      zodMessage: 'Período inválido',
    });
  }
}
