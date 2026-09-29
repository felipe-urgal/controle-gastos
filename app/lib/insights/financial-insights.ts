import { ZodError } from 'zod';

import { failure, success } from '@/app/lib/api-response';
import { getAuthenticatedUserId, isUnauthorizedError } from '@/app/lib/auth';
import { dashboardPeriodSchema } from '@/app/lib/dashboard/dashboard-schema';
import { getMonthlyDashboardForUser } from '@/app/lib/dashboard/monthly-dashboard';
import { getForecastForUser } from '@/app/lib/forecast/forecast';
import {
  buildFinancialInsights,
  FINANCIAL_INSIGHT_LIMIT,
} from '@/app/lib/insights/financial-insights-domain';
import { getFormalRecurrenceSummaryForUser } from '@/app/lib/recurrences/recurrences';
import type { FinancialInsightsData } from '@/app/types/financial-insight';
import type { SupportedCurrency } from '@/app/types/financial-summary';

export async function getFinancialInsightsForUser(
  userId: string,
  period: { year: number; month: number },
  currency: SupportedCurrency,
  now: Date = new Date(),
): Promise<FinancialInsightsData> {
  const [dashboard, forecast, recurrenceSummary] = await Promise.all([
    getMonthlyDashboardForUser(userId, period, currency),
    getForecastForUser(userId, { currency, days: 30 }, now),
    getFormalRecurrenceSummaryForUser(userId),
  ]);

  const recurrenceTotal =
    recurrenceSummary.totals.find((item) => item.currency === currency) ?? null;

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
  });

  return {
    period,
    currency,
    items,
    limit: FINANCIAL_INSIGHT_LIMIT,
  };
}

function parseRequest(request: Request) {
  const url = new URL(request.url);
  return dashboardPeriodSchema.parse({
    year: url.searchParams.get('year'),
    month: url.searchParams.get('month'),
    currency: url.searchParams.get('currency') ?? undefined,
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
    if (error instanceof ZodError) {
      return failure(error.issues[0]?.message ?? 'Período inválido', 400);
    }

    if (isUnauthorizedError(error)) {
      return failure('Não autenticado', 401);
    }

    return failure('Erro ao carregar insights financeiros', 500);
  }
}
