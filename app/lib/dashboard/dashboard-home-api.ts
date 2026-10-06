import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

import { failure, success } from '@/app/lib/api-response';
import { parseQuery } from '@/app/lib/api/query';
import { getAuthenticatedUserId } from '@/app/lib/auth';
import { isUnauthorizedError } from '@/app/lib/auth/auth-errors';
import { getDashboardHomeForUser } from '@/app/lib/dashboard/dashboard-home';
import { dashboardPeriodSchema } from '@/app/lib/dashboard/dashboard-schema';
import {
  getRequestId,
  logServerOperation,
  type LogContext,
  withRequestId,
} from '@/app/lib/observability';

export async function getDashboardHome(request: Request) {
  const requestId = getRequestId(request);
  const startedAt = performance.now();

  function finish(
    response: NextResponse,
    context: LogContext = {},
    error?: unknown,
  ) {
    logServerOperation({
      event: 'dashboard_home',
      requestId,
      route: '/api/dashboard/home',
      status: response.status,
      startedAt,
      context,
      error,
    });
    return withRequestId(response, requestId);
  }

  try {
    const userId = await getAuthenticatedUserId();
    const { currency, year, month } = parseQuery(
      request,
      dashboardPeriodSchema,
      {
        year: null,
        month: null,
        currency: undefined,
      },
    );

    const home = await getDashboardHomeForUser(
      userId,
      { year, month },
      currency,
    );

    return finish(success(home), {
      result: 'success',
      currency,
      selectedPeriodRelation: home.scope.selectedPeriodRelation,
      cashAccountCount: home.current.cash.accounts.length,
      recentTransactionsStatus: home.recentTransactions.status,
      forecastStatus: home.current.forecast.status,
      commitmentsStatus: home.current.commitments.status,
      netWorthStatus: home.netWorth.status,
      insightsStatus: home.insights.status,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return finish(
        failure(error.issues[0]?.message ?? 'Período inválido', 400),
        { result: 'invalid_input' },
      );
    }

    if (isUnauthorizedError(error)) {
      return finish(
        failure('Não autenticado', 401),
        { result: 'unauthorized' },
      );
    }

    return finish(
      failure('Erro ao carregar dashboard financeiro', 500),
      { result: 'error' },
      error,
    );
  }
}
