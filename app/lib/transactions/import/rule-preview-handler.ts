import { NextResponse } from "next/server";
import { failure, success } from "@/app/lib/api-response";
import { getAuthenticatedUserId } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";
import {
  getRequestId,
  logServerOperation,
  type LogContext,
  withRequestId,
} from "@/app/lib/observability";
import { applyImportRulesToPreview } from "@/app/lib/transactions/import/rule-preview";
import { previewTransactionImport } from "@/app/lib/transactions/import/transaction-import";

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

    const previewItems = applyImportRulesToPreview({
      accountId,
      items,
      rules: eligibleRules,
    });
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
        validCount:
          typeof summary?.valid === "number" ? summary.valid : undefined,
        invalidCount:
          typeof summary?.invalid === "number" ? summary.invalid : undefined,
        duplicateCount:
          typeof summary?.duplicates === "number"
            ? summary.duplicates
            : undefined,
      },
    );
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
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
