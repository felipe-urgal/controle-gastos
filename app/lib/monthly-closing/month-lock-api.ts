import { z } from "zod";

import { apiFailureFromError } from "@/app/lib/api/api-error-response";
import { parseJsonBody } from "@/app/lib/api/request-json";
import { success } from "@/app/lib/api-response";
import { getAuthenticatedUserId } from "@/app/lib/auth";
import { logicalDateFromInstant } from "@/app/lib/date/logical-date";
import { lockMonthForUser, unlockMonthForUser } from "@/app/lib/monthly-closing/month-lock";

const monthLockBodySchema = z.object({
  year: z.number().int().min(2000).max(2100),
  month: z.number().int().min(1).max(12),
});

export async function lockMonth(request: Request) {
  try {
    const userId = await getAuthenticatedUserId();
    const period = monthLockBodySchema.parse(await parseJsonBody(request));
    const state = await lockMonthForUser(userId, period, logicalDateFromInstant(new Date()));
    return success(state, "Mês travado");
  } catch (error) {
    return apiFailureFromError(error, {
      fallbackMessage: "Erro ao travar o mês",
      zodMessage: "Período inválido",
    });
  }
}

export async function unlockMonth(request: Request) {
  try {
    const userId = await getAuthenticatedUserId();
    const period = monthLockBodySchema.parse(await parseJsonBody(request));
    return success(await unlockMonthForUser(userId, period), "Mês reaberto");
  } catch (error) {
    return apiFailureFromError(error, {
      fallbackMessage: "Erro ao reabrir o mês",
      zodMessage: "Período inválido",
    });
  }
}
