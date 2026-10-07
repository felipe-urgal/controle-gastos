import { ZodError } from "zod";

import { parseJsonBody } from "@/app/lib/api/request-json";
import { failure, success } from "@/app/lib/api-response";
import { getAuthenticatedUserId } from "@/app/lib/auth";
import { isUnauthorizedError } from "@/app/lib/auth/auth-errors";
import { findImportRuleRelationships } from "@/app/lib/import-rules/import-rule-guards";
import { isHttpError } from "@/app/lib/http-error";
import { prisma } from "@/app/lib/prisma";
import { importRuleInputSchema } from "@/app/lib/transactions/import/import-rule-schema";

const IMPACT_RULE_BUDGET = 5_000;

export async function POST(request: Request) {
  try {
    const userId = await getAuthenticatedUserId();
    const input = importRuleInputSchema.parse(await parseJsonBody(request));
    const excludeRuleId =
      new URL(request.url).searchParams.get("excludeRuleId") ?? undefined;

    const rules = await prisma.transactionImportRule.findMany({
      where: {
        userId,
        transactionType: input.transactionType,
        ...(input.accountId
          ? { OR: [{ accountId: null }, { accountId: input.accountId }] }
          : {}),
      },
      select: {
        id: true,
        name: true,
        priority: true,
        accountId: true,
        transactionType: true,
        descriptionOperator: true,
        descriptionPattern: true,
        minAmountCents: true,
        maxAmountCents: true,
        categoryId: true,
      },
      orderBy: [{ priority: "asc" }, { createdAt: "asc" }, { id: "asc" }],
      take: IMPACT_RULE_BUDGET + 1,
    });

    if (rules.length > IMPACT_RULE_BUDGET) {
      return failure(
        "Há regras demais para calcular o impacto completo. Refine ou pause regras antigas antes de continuar.",
        422,
        "IMPORT_RULE_IMPACT_BUDGET_EXCEEDED",
      );
    }

    return success({
      relationships: findImportRuleRelationships(input, rules, {
        excludeRuleId,
      }),
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return failure(error.issues[0]?.message ?? "Dados inválidos", 400);
    }
    if (isHttpError(error)) {
      return failure(error.message, error.status, error.code);
    }
    if (isUnauthorizedError(error)) {
      return failure("Não autenticado", 401);
    }
    return failure("Não foi possível calcular o impacto da regra", 500);
  }
}
