import { z } from "zod";

import { apiFailureFromError } from "@/app/lib/api/api-error-response";
import { parseQuery } from "@/app/lib/api/query";
import { success } from "@/app/lib/api-response";
import { getAuthenticatedUserId } from "@/app/lib/auth";
import { TRANSACTION_DESCRIPTION_MAX_LENGTH } from "@/app/lib/transactions/transaction-field-contract";
import { suggestQuickEntry } from "@/app/lib/transactions/quick-entry-suggestion";

const querySchema = z.object({
  description: z.string().trim().max(TRANSACTION_DESCRIPTION_MAX_LENGTH, "Descrição muito longa").default(""),
  type: z.enum(["EXPENSE", "INCOME"]).default("EXPENSE"),
});

/** Sugestão de conta, categoria e estabelecimento para o lançamento rápido (só leitura). */
export async function GET(request: Request) {
  try {
    const userId = await getAuthenticatedUserId();
    const input = parseQuery(request, querySchema);
    return success(await suggestQuickEntry(userId, input));
  } catch (error) {
    return apiFailureFromError(error, {
      fallbackMessage: "Erro ao sugerir o lançamento",
      zodMessage: "Dados inválidos",
    });
  }
}
