import { success } from '@/app/lib/api-response';
import { apiFailureFromError } from '@/app/lib/api/api-error-response';
import { parseQuery } from '@/app/lib/api/query';
import { getAuthenticatedUserId } from '@/app/lib/auth';
import { dashboardPeriodSchema } from '@/app/lib/dashboard/dashboard-schema';
import { getMonthlyDashboardForUser } from '@/app/lib/dashboard/monthly-dashboard';
import { getNetWorthForUser } from '@/app/lib/net-worth/net-worth';
import { deriveMonthlyNetWorthChange } from '@/app/lib/monthly-closing/monthly-closing-domain';
import type { SupportedCurrency } from '@/app/types/financial-summary';
import type { MonthlyClosingData } from '@/app/types/monthly-closing';

export async function getMonthlyClosingForUser(
  userId: string,
  period: { year: number; month: number },
  currency: SupportedCurrency,
): Promise<MonthlyClosingData> {
  const dashboard = await getMonthlyDashboardForUser(userId, period, currency);
  const netWorth = await getNetWorthForUser(userId, {
    year: period.year,
    month: period.month,
    months: 2,
  });

  return {
    period,
    currency,
    summary: dashboard.summary,
    comparison: dashboard.comparison,
    planning: dashboard.planning,
    topCategories: dashboard.categories.slice(0, 5).map((category) => ({
      id: category.id,
      name: category.name,
      color: category.color,
      icon: category.icon,
      realized: category.realized,
      sharePercentage: category.sharePercentage,
    })),
    netWorth: deriveMonthlyNetWorthChange(netWorth.history, currency),
  };
}

export async function getMonthlyClosing(request: Request) {
  try {
    const userId = await getAuthenticatedUserId();
    const { currency, ...period } = parseQuery(request, dashboardPeriodSchema, {
      year: null,
      month: null,
      currency: undefined,
    });
    return success(await getMonthlyClosingForUser(userId, period, currency));
  } catch (error) {
    return apiFailureFromError(error, {
      fallbackMessage: 'Erro ao carregar fechamento mensal',
      zodMessage: 'Período inválido',
    });
  }
}
