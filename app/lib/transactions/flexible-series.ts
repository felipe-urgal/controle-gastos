import { Prisma } from "@prisma/client";
import { ZodError } from "zod";

import { getOwnedActiveAccountOrThrow } from "@/app/lib/accounts/account-ownership";
import { assertAccountCategoryCompatibility } from "@/app/lib/accounts/account-transaction-compatibility";
import { assertCardPurchaseStatementsMutable } from "@/app/lib/cards/credit-card-purchase-guards";
import { parseJsonBody } from "@/app/lib/api/request-json";
import { failure, rateLimitFailure, success } from "@/app/lib/api-response";
import { getAuthenticatedUserId } from "@/app/lib/auth";
import { isUnauthorizedError } from "@/app/lib/auth/auth-errors";
import { getOwnedActiveCategoryOrThrow } from "@/app/lib/categories/category-ownership";
import { getOwnedActiveMerchantOrThrow } from "@/app/lib/merchants/merchant-ownership";
import { HttpError, isHttpError } from "@/app/lib/http-error";
import { attachTagsToTransactions } from "@/app/lib/tags/tag-ownership";
import { prisma } from "@/app/lib/prisma";
import { consumeTransactionMutationRateLimit } from "@/app/lib/security/application-rate-limit";
import { toTransactionDTO } from "@/app/lib/transactions/transaction-dto";
import {
  buildLogicalRecurrenceOccurrences,
  type LogicalRecurrenceRule,
} from "@/app/lib/transactions/logical-recurrence";
import { parseIsoLogicalDate } from "@/app/lib/transactions/monthly-recurrence";
import {
  createFlexibleRecurringTransactionSchema,
  type CreateFlexibleRecurringTransactionInput,
} from "@/app/lib/transactions/flexible-recurrence-schema";

const recurringTransactionInclude = {
  account: {
    select: { id: true, name: true, currency: true, type: true, color: true, icon: true },
  },
  category: {
    select: { id: true, name: true, type: true, color: true, icon: true },
  },
  merchant: {
    select: { id: true, name: true, isActive: true },
  },
  tagLinks: {
    orderBy: { createdAt: "asc" as const },
    select: { tag: { select: { id: true, name: true } } },
  },
  series: {
    select: {
      id: true,
      type: true,
      frequency: true,
      interval: true,
      description: true,
      anchorDay: true,
      occurrenceCount: true,
      startYear: true,
      startMonth: true,
      startDay: true,
      endYear: true,
      endMonth: true,
      endDay: true,
    },
  },
};

function toLogicalRule(
  recurrence: CreateFlexibleRecurringTransactionInput["recurrence"],
): LogicalRecurrenceRule {
  const base = {
    frequency: recurrence.frequency,
    interval: recurrence.interval,
  };

  if (recurrence.mode === "count") {
    return { ...base, mode: "count", occurrences: recurrence.occurrences };
  }

  const endDate = parseIsoLogicalDate(recurrence.endDate);
  if (!endDate) throw new HttpError("Data final inválida", 400);

  return { ...base, mode: "endDate", endDate };
}

export async function createFlexibleSeriesWithTx(
  tx: Prisma.TransactionClient,
  userId: string,
  input: CreateFlexibleRecurringTransactionInput,
  options: { sourceKey?: string | null } = {},
) {
  const account = await getOwnedActiveAccountOrThrow(
    tx,
    userId,
    input.transaction.accountId,
  );
  const category = await getOwnedActiveCategoryOrThrow(
    tx,
    userId,
    input.transaction.categoryId,
  );
  if (input.transaction.merchantId) {
    await getOwnedActiveMerchantOrThrow(
      tx,
      userId,
      input.transaction.merchantId,
    );
  }

  assertAccountCategoryCompatibility(account, category);

  const start = {
    year: input.transaction.year,
    month: input.transaction.month,
    day: input.transaction.day,
  };

  let occurrences;
  try {
    occurrences = buildLogicalRecurrenceOccurrences({
      start,
      rule: toLogicalRule(input.recurrence),
      firstStatus: input.transaction.status,
    });
  } catch (error) {
    if (isHttpError(error)) throw error;
    throw new HttpError(
      error instanceof Error ? error.message : "Recorrência inválida",
      400,
    );
  }

  await assertCardPurchaseStatementsMutable(
    tx,
    userId,
    account,
    occurrences.map(({ year, month, day }) => ({ year, month, day })),
  );

  const lastOccurrence = occurrences.at(-1)!;
  const series = await tx.transactionSeries.create({
    data: {
      type: "RECURRING",
      frequency: input.recurrence.frequency,
      interval: input.recurrence.interval,
      description: input.transaction.description,
      anchorDay: start.day,
      startYear: start.year,
      startMonth: start.month,
      startDay: start.day,
      endYear: lastOccurrence.year,
      endMonth: lastOccurrence.month,
      endDay: lastOccurrence.day,
      occurrenceCount: occurrences.length,
      sourceKey: options.sourceKey ?? null,
      userId,
    },
  });

  await tx.transaction.createMany({
    data: occurrences.map((occurrence, index) => ({
      amount: input.transaction.amount,
      year: occurrence.year,
      month: occurrence.month,
      day: occurrence.day,
      type: category.type,
      description: input.transaction.description,
      status: occurrence.status,
      accountId: account.id,
      categoryId: category.id,
      merchantId: input.transaction.merchantId ?? null,
      userId,
      seriesId: series.id,
      seriesIndex: index + 1,
    })),
  });

  if (input.transaction.tagIds?.length) {
    const createdTransactions = await tx.transaction.findMany({
      where: { seriesId: series.id, userId },
      select: { id: true },
    });
    await attachTagsToTransactions(
      tx,
      userId,
      createdTransactions.map((item) => item.id),
      input.transaction.tagIds,
    );
  }

  const firstOccurrence = await tx.transaction.findFirstOrThrow({
    where: { seriesId: series.id, userId, seriesIndex: 1 },
    include: recurringTransactionInclude,
  });

  return { series, firstOccurrence, occurrenceCount: occurrences.length };
}

export async function createFlexibleRecurringTransactions(request: Request) {
  try {
    const userId = await getAuthenticatedUserId();
    const limit = await consumeTransactionMutationRateLimit(userId);
    if (limit.limited) {
      return rateLimitFailure(
        "Muitas alterações financeiras em pouco tempo. Tente novamente em instantes",
        limit.retryAfterSeconds,
        "TRANSACTION_RATE_LIMITED",
      );
    }
    const input = createFlexibleRecurringTransactionSchema.parse(
      await parseJsonBody(request),
    );
    const created = await prisma.$transaction((tx) =>
      createFlexibleSeriesWithTx(tx, userId, input),
    );

    return success(
      {
        series: {
          id: created.series.id,
          type: created.series.type,
          frequency: created.series.frequency,
          interval: created.series.interval,
          description: created.series.description,
          anchorDay: created.series.anchorDay,
          occurrenceCount: created.series.occurrenceCount,
          start: {
            year: created.series.startYear,
            month: created.series.startMonth,
            day: created.series.startDay,
          },
          end: {
            year: created.series.endYear,
            month: created.series.endMonth,
            day: created.series.endDay,
          },
        },
        occurrenceCount: created.occurrenceCount,
        firstOccurrence: toTransactionDTO(created.firstOccurrence),
      },
      "Recorrência criada com sucesso",
      201,
    );
  } catch (error) {
    if (error instanceof ZodError) {
      return failure(error.issues[0]?.message ?? "Dados inválidos", 400);
    }
    if (isHttpError(error)) return failure(error.message, error.status, error.code);
    if (isUnauthorizedError(error)) {
      return failure("Não autenticado", 401);
    }
    return failure("Erro ao criar recorrência", 500);
  }
}
