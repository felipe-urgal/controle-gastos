import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { failure, success } from "@/app/lib/api-response";
import { getAuthenticatedUserId } from "@/app/lib/auth";
import { getForecastForUser } from "@/app/lib/forecast/forecast";
import { forecastQuerySchema } from "@/app/lib/forecast/forecast-schema";
import {
  getRequestId,
  logServerOperation,
  type LogContext,
  withRequestId,
} from "@/app/lib/observability";

function parseForecastQuery(request: Request) {
  const url = new URL(request.url);

  return forecastQuerySchema.parse({
    currency: url.searchParams.get("currency") ?? undefined,
    days: url.searchParams.get("days") ?? undefined,
  });
}

export async function GET(request: Request) {
  const requestId = getRequestId(request);
  const startedAt = performance.now();

  function finish(
    response: NextResponse,
    context: LogContext = {},
    error?: unknown,
  ) {
    logServerOperation({
      event: "financial_forecast",
      requestId,
      route: "/api/forecast",
      status: response.status,
      startedAt,
      context,
      error,
    });
    return withRequestId(response, requestId);
  }

  try {
    const userId = await getAuthenticatedUserId();
    const input = parseForecastQuery(request);
    const forecast = await getForecastForUser(userId, input);

    return finish(success(forecast), {
      result: "success",
      currency: input.currency,
      horizonDays: input.days,
      accountCount: forecast.accounts.length,
      upcomingCount: forecast.upcoming.length,
      overdueCount: forecast.overdue.length,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return finish(
        failure(error.issues[0]?.message ?? "Parâmetros inválidos", 400),
        { result: "invalid_input" },
      );
    }

    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return finish(failure("Não autenticado", 401), {
        result: "unauthorized",
      });
    }

    return finish(
      failure("Erro ao carregar projeção financeira", 500),
      { result: "error" },
      error,
    );
  }
}
