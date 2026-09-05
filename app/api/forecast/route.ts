import { ZodError } from "zod";

import { failure, success } from "@/app/lib/api-response";
import { getAuthenticatedUserId } from "@/app/lib/auth";
import { getForecastForUser } from "@/app/lib/forecast/forecast";
import { forecastQuerySchema } from "@/app/schemas/forecast.schema";

function parseForecastQuery(request: Request) {
  const url = new URL(request.url);

  return forecastQuerySchema.parse({
    currency: url.searchParams.get("currency") ?? undefined,
    days: url.searchParams.get("days") ?? undefined,
  });
}

export async function GET(request: Request) {
  try {
    const userId = await getAuthenticatedUserId();
    const input = parseForecastQuery(request);
    const forecast = await getForecastForUser(userId, input);

    return success(forecast);
  } catch (error) {
    if (error instanceof ZodError) {
      return failure(error.issues[0]?.message ?? "Parâmetros inválidos", 400);
    }

    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return failure("Não autenticado", 401);
    }

    return failure("Erro ao carregar projeção financeira", 500);
  }
}
