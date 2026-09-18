import { Prisma } from "@prisma/client";
import { ZodError } from "zod";
import { getOwnedActiveAccountOrThrow } from "@/app/lib/accounts/account-ownership";
import { parseJsonBody } from "@/app/lib/api/request-json";
import { failure, rateLimitFailure, success } from "@/app/lib/api-response";
import { getAuthenticatedUserId } from "@/app/lib/auth";
import { getOwnedCategoryOrThrow } from "@/app/lib/categories/category-ownership";
import { HttpError, isHttpError } from "@/app/lib/http-error";
import { prisma } from "@/app/lib/prisma";
import { consumeTransactionMutationRateLimit } from "@/app/lib/security/application-rate-limit";
import { toTransactionDTO } from "@/app/lib/transactions/transaction-dto";
import {
  buildMonthlyOccurrences,
  MonthlyRecurrenceRule,
  parseIsoLogicalDate,
} from "@/app/lib/transactions/monthly-recurrence";
import {
  CreateMonthlyRecurringTransactionInput,
  createMonthlyRecurringTransactionSchema,
} from "@/app/lib/transactions/monthly-recurrence-schema";

const recurringTransactionInclude = {
  account: {
    select: {
      id: true,
      name: true,
      currency: true,
      type: true,
      color: true,
      icon: true,
    },
  },
  category: {
    select: {
      id: true,
      name: true,
      type: true,
      color: true,
      icon: true,
    },
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

function toRule(
  recurrence: CreateMonthlyRecurringTransactionInput["recurrence"]
): MonthlyRecurrenceRule {
  if (recurrence.mode === "count") {
    return {
      mode: "count",
      occurrences: recurrence.occurrences,
    };
  }

  const endDate = parseIsoLogicalDate(recurrence.endDate);
  if (!endDate) {
    throw new HttpError("Data final inválida", 400);
  }

  return {
    mode: "endDate",
    endDate,
  };
}

export async function createMonthlySeriesWithTx(
  tx: Prisma.TransactionClient,
  userId: string,
  input: CreateMonthlyRecurringTransactionInput
) {
  const account = await getOwnedActiveAccountOrThrow(
    tx,
    userId,
    input.transaction.accountId,
  );
  const category = await getOwnedCategoryOrThrow(
    tx,
    userId,
    input.transaction.categoryId,
  );

  const start = {
    year: input.transaction.year,
    month: input.transaction.month,
    day: input.transaction.day,
  };

  let occurrences;
  try {
    occurrences = buildMonthlyOccurrences({
      start,
      rule: toRule(input.recurrence),
      firstStatus: input.transaction.status,
    });
  } catch (error) {
    if (isHttpError(error)) throw error;
    throw new HttpError(
      error instanceof Error ? error.message : "Recorrência inválida",
      400
    );
  }

  const lastOccurrence = occurrences.at(-1)!;
  const series = await tx.transactionSeries.create({
    data: {
      type: "RECURRING",
      frequency: "MONTHLY",
      interval: 1,
      description: input.transaction.description,
      anchorDay: start.day,
      startYear: start.year,
      startMonth: start.month,
      startDay: start.day,
      endYear: lastOccurrence.year,
      endMonth: lastOccurrence.month,
      endDay: lastOccurrence.day,
      occurrenceCount: occurrences.length,
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
      userId,
      seriesId: series.id,
      seriesIndex: index + 1,
    })),
  });

  const firstOccurrence = await tx.transaction.findFirstOrThrow({
    where: {
      seriesId: series.id,
      userId,
      seriesIndex: 1,
    },
    include: recurringTransactionInclude,
  });

  return {
    series,
    firstOccurrence,
    occurrenceCount: occurrences.length,
  };
}

export async function createMonthlyRecurringTransactions(request: Request) {
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
    const input = createMonthlyRecurringTransactionSchema.parse(
      await parseJsonBody(request)
    );

    const created = await prisma.$transaction((tx) =>
      createMonthlySeriesWithTx(tx, userId, input)
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
      "Recorrência mensal criada com sucesso",
      201
    );
  } catch (error) {
    if (error instanceof ZodError) {
      return failure(error.issues[0]?.message ?? "Dados inválidos", 400);
    }

    if (isHttpError(error)) {
      return failure(error.message, error.status, error.code);
    }

    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return failure("Não autenticado", 401);
    }

    return failure("Erro ao criar recorrência mensal", 500);
  }
}
