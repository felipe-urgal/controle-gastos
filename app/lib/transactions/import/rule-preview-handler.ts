import { failure, success } from "@/app/lib/api-response";
import { getAuthenticatedUserId } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";
import { applyImportRulesToPreview } from "@/app/lib/transactions/import/rule-preview";
import { previewTransactionImport } from "@/app/lib/transactions/import/transaction-import";

export async function previewTransactionImportWithRules(request: Request) {
  const baseResponse = await previewTransactionImport(request);
  if (!baseResponse.ok) return baseResponse;

  try {
    const body = await baseResponse.json();
    const userId = await getAuthenticatedUserId();
    const accountId = body.data?.accountId;
    const items = body.data?.items;

    if (typeof accountId !== "string" || !Array.isArray(items)) {
      return failure("Não foi possível analisar o preview", 500);
    }

    const rules = await prisma.transactionImportRule.findMany({
      where: {
        userId,
        isActive: true,
        OR: [{ accountId: null }, { accountId }],
        category: { isActive: true },
      },
      select: {
        id: true,
        name: true,
        isActive: true,
        priority: true,
        accountId: true,
        transactionType: true,
        descriptionOperator: true,
        descriptionPattern: true,
        minAmountCents: true,
        maxAmountCents: true,
        categoryId: true,
        normalizedDescription: true,
        category: { select: { type: true } },
      },
      orderBy: [{ priority: "asc" }, { id: "asc" }],
    });

    const eligibleRules = rules.filter(
      (rule) => rule.category.type === rule.transactionType,
    );

    return success(
      {
        ...body.data,
        items: applyImportRulesToPreview({
          accountId,
          items,
          rules: eligibleRules,
        }),
      },
      body.message,
      baseResponse.status,
    );
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return failure("Não autorizado", 401);
    }

    console.error("Erro ao aplicar regras no preview de importação", {
      name: error instanceof Error ? error.name : "UnknownError",
    });
    return failure("Não foi possível aplicar as regras ao preview", 500);
  }
}
