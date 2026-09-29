import { success } from '@/app/lib/api-response';
import { apiFailureFromError } from '@/app/lib/api/api-error-response';
import { parseQuery } from '@/app/lib/api/query';
import { getAuthenticatedUserId } from '@/app/lib/auth';
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
