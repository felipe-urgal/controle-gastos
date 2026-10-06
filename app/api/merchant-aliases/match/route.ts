import { ZodError, z } from "zod";

import { parseJsonBody } from "@/app/lib/api/request-json";
import { failure, success } from "@/app/lib/api-response";
import { getAuthenticatedUserId } from "@/app/lib/auth";
import { isUnauthorizedError } from "@/app/lib/auth/auth-errors";
import { matchMerchantAlias } from "@/app/lib/merchants/merchant-alias-matching";
import { findMatchingMerchantAliasesForUser } from "@/app/lib/merchants/merchant-alias-query";

const schema = z.object({
  description: z.string().trim().min(2).max(255),
});

export async function POST(request: Request) {
  try {
    const userId = await getAuthenticatedUserId();
    const input = schema.parse(await parseJsonBody(request));
    const aliases = await findMatchingMerchantAliasesForUser(
      userId,
      input.description,
    );
    const match = matchMerchantAlias(aliases, input.description);

    return success({
      matchedAliasId: match?.aliasId ?? null,
      merchantId: match?.conflict ? null : (match?.merchantId ?? null),
      merchantName: match?.conflict ? null : (match?.merchantName ?? null),
      conflict: match?.conflict ?? false,
      matchingAliasIds: match?.matchingAliasIds ?? [],
    });
  } catch (error) {
    if (isUnauthorizedError(error)) return failure("Não autorizado", 401);
    if (error instanceof ZodError) {
      return failure(error.issues[0]?.message ?? "Descrição inválida", 400);
    }
    return failure("Não foi possível reconhecer o estabelecimento", 500);
  }
}
