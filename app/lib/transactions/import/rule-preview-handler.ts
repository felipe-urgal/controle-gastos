import type { CategoryType } from "@prisma/client";
import { NextResponse } from "next/server";
import { failure, success } from "@/app/lib/api-response";
import { getAuthenticatedUserId } from "@/app/lib/auth";
import { isUnauthorizedError } from "@/app/lib/auth/auth-errors";
import { findMatchingMerchantAliasesForDescriptions } from "@/app/lib/merchants/merchant-alias-query";
import { prisma } from "@/app/lib/prisma";
import {
  getRequestId,
  logServerOperation,
  type LogContext,
  withRequestId,
} from "@/app/lib/observability";
import { applyImportRulesToPreview } from "@/app/lib/transactions/import/rule-preview";
import { previewTransactionImport } from "@/app/lib/transactions/import/transaction-import";

const IMPORT_RULE_QUERY_BUDGET = 5_000;
const IMPORT_PREVIEW_EVALUATION_BUDGET_MS = 1_000;

export async function previewTransactionImportWithRules(request: Request) {
  const requestId = getRequestId(request);
  const startedAt = performance.now();

  function finish(
    response: NextResponse,
    context: LogContext = {},
    error?: unknown,
  ) {
    logServerOperation({
      event: "transaction_import_preview",
      requestId,
      route: "/api/transactions/import/preview",
      status: response.status,
      startedAt,
      context,
      error,
    });
    return withRequestId(response, requestId);
  }

  const baseResponse = await previewTransactionImport(request);
  if (!baseResponse.ok) {
    return finish(baseResponse, {
      result: baseResponse.status === 429 ? "rate_limited" : "rejected",
    });
  }

  try {
    const body = await baseResponse.json();
    const userId = await getAuthenticatedUserId();
    const accountId = body.data?.accountId;
    const items = body.data?.items;

    if (typeof accountId !== "string" || !Array.isArray(items)) {
      return finish(
        failure("Não foi possível analisar o preview", 500),
        { result: "invalid_internal_response" },
      );
    }

    const transactionTypes: CategoryType[] = Array.from(
      new Set<CategoryType>(
        items.flatMap((item: { type?: unknown; errors?: unknown; duplicate?: unknown }) =>
          (item.type === "INCOME" || item.type === "EXPENSE") &&
          Array.isArray(item.errors) &&
          item.errors.length === 0 &&
          item.duplicate !== true
            ? [item.type]
            : [],
        ),
      ),
    );
    const descriptions = items.flatMap(
      (item: { description?: unknown; errors?: unknown; duplicate?: unknown }) =>
        typeof item.description === "string" &&
        Array.isArray(item.errors) &&
        item.errors.length === 0 &&
        item.duplicate !== true
          ? [item.description]
          : [],
    );

    const dependencyLoadStartedAt = performance.now();
    const [rules, merchantAliasesByDescription] = await Promise.all([
      prisma.transactionImportRule.findMany({
        where: {
          userId,
          isActive: true,
          transactionType: { in: transactionTypes },
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
          category: { select: { type: true } },
        },
        orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
        take: IMPORT_RULE_QUERY_BUDGET + 1,
      }),
      findMatchingMerchantAliasesForDescriptions(userId, descriptions),
    ]);
    const dependencyLoadMs = performance.now() - dependencyLoadStartedAt;

    if (rules.length > IMPORT_RULE_QUERY_BUDGET) {
      return finish(
        failure(
          "Há regras demais para avaliar com segurança neste preview. Refine ou pause regras antigas antes de continuar.",
          422,
          "IMPORT_RULE_BUDGET_EXCEEDED",
        ),
        {
          result: "rule_budget_exceeded",
          itemCount: items.length,
          ruleCount: rules.length,
          dependencyLoadMs: Math.round(dependencyLoadMs),
        },
      );
    }

    const eligibleRules = rules.filter(
      (rule) => rule.category.type === rule.transactionType,
    );

    const evaluationStartedAt = performance.now();
    const previewItems = applyImportRulesToPreview({
      accountId,
      items,
      rules: eligibleRules,
      merchantAliasesByDescription,
    });
    const evaluationMs = performance.now() - evaluationStartedAt;
    const summary = body.data?.summary;

    return finish(
      success(
        {
          ...body.data,
          items: previewItems,
        },
        body.message,
        baseResponse.status,
      ),
      {
        result: "success",
        itemCount: previewItems.length,
        ruleCount: eligibleRules.length,
        merchantAliasCount: Array.from(
          merchantAliasesByDescription.values(),
        ).reduce((total, aliases) => total + aliases.length, 0),
        validCount:
          typeof summary?.valid === "number" ? summary.valid : undefined,
        invalidCount:
          typeof summary?.invalid === "number" ? summary.invalid : undefined,
        duplicateCount:
          typeof summary?.duplicates === "number"
            ? summary.duplicates
            : undefined,
        dependencyLoadMs: Math.round(dependencyLoadMs),
        evaluationMs: Math.round(evaluationMs),
        evaluationBudgetMs: IMPORT_PREVIEW_EVALUATION_BUDGET_MS,
        evaluationBudgetExceeded:
          evaluationMs > IMPORT_PREVIEW_EVALUATION_BUDGET_MS,
      },
    );
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return finish(failure("Não autorizado", 401), {
        result: "unauthorized",
      });
    }

    return finish(
      failure("Não foi possível aplicar as regras ao preview", 500),
      { result: "error" },
      error,
    );
  }
}
