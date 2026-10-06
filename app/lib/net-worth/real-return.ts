import { z } from "zod";

import { success } from "@/app/lib/api-response";
import { apiFailureFromError } from "@/app/lib/api/api-error-response";
import { parseQuery } from "@/app/lib/api/query";
import { getAuthenticatedUserId } from "@/app/lib/auth";
import { getNetWorthForUser } from "@/app/lib/net-worth/net-worth";
import { buildNetWorthRealEvolutionFromHistory } from "@/app/lib/net-worth/real-return-builder";

const realReturnQuerySchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100),
  month: z.coerce.number().int().min(1).max(12),
  months: z.coerce.number().int().min(1).max(60).default(12),
});

type RealReturnInput = z.infer<typeof realReturnQuerySchema>;

export async function getNetWorthRealReturnForUser(
  userId: string,
  input: RealReturnInput,
) {
  const netWorth = await getNetWorthForUser(userId, {
    year: input.year,
    month: input.month,
    months: input.months + 1,
  });

  return buildNetWorthRealEvolutionFromHistory(
    netWorth.history,
    input.months,
  );
}

export async function getNetWorthRealReturn(request: Request) {
  try {
    const userId = await getAuthenticatedUserId();
    const input = parseQuery(request, realReturnQuerySchema, {
      year: null,
      month: null,
      months: undefined,
    });
    return success(await getNetWorthRealReturnForUser(userId, input));
  } catch (error) {
    return apiFailureFromError(error, {
      fallbackMessage: "Erro ao calcular evolução real do patrimônio",
      zodMessage: "Parâmetros inválidos",
    });
  }
}
