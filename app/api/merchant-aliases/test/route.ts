import { ZodError } from "zod";

import { failure, success } from "@/app/lib/api-response";
import { getAuthenticatedUserId } from "@/app/lib/auth";
import { isUnauthorizedError } from "@/app/lib/auth/auth-errors";
import { merchantAliasMatches, normalizeMerchantAliasValue } from "@/app/lib/merchants/merchant-alias-matching";
import { testMerchantAliasSchema } from "@/app/lib/merchants/merchant-alias-schema";
import { parseJsonBody } from "@/app/lib/api/request-json";

export async function POST(request: Request) {
  try {
    await getAuthenticatedUserId();
    const input = testMerchantAliasSchema.parse(await parseJsonBody(request));
    const normalizedPattern = normalizeMerchantAliasValue(input.pattern);
    return success({
      matches: merchantAliasMatches(input.operator, normalizedPattern, input.description),
      normalizedPattern,
      normalizedDescription: normalizeMerchantAliasValue(input.description),
    });
  } catch (error) {
    if (isUnauthorizedError(error)) return failure("Não autorizado", 401);
    if (error instanceof ZodError) return failure(error.issues[0]?.message ?? "Dados inválidos", 400);
    return failure("Não foi possível testar o alias", 500);
  }
}
