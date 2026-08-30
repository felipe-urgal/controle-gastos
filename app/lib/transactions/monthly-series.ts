import { Prisma } from "@prisma/client";
import { ZodError } from "zod";
import { success, failure } from "@/app/lib/api-response";
import { getAuthenticatedUserId } from "@/app/lib/auth";
import { HttpError, isHttpError } from "@/app/lib/http-error";
import { prisma } from "@/app/lib/prisma";
import { toTransactionDTO } from "@/app/lib/mappers/transaction.mapper";
import {
  buildMonthlyOccurrences,
  getUtcLogicalToday,
  LogicalDate,
  MonthlyRecurrenceRule,
  parseIsoLogicalDate,
} from "@/app/lib/transactions/monthly-recurrence";
import {
  CreateMonthlyRecurringTransactionInput,
  createMonthlyRecurringTransactionSchema,
} from "@/app/schemas/transaction-recurrence.schema";

const recurringTransactionInclude = {
  account: true,
  category: true,
  series: true,
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
  input: CreateMonthlyRecurringTransactionInput,
  today: LogicalDate = getUtcLogicalToday()
) {
  const account = await tx.account.findFirst({
    where: {
      id: input.transaction.accountId,
      userId,
      isActive: true,
    },
  });

  if (!account) {
    throw new HttpError("Conta inválida ou inativa", 400);
  }

  const category = await tx.category.findFirst({
    where: {
      id: input.transaction.categoryId,
      userId,
    },
  });

  if (!category) {
    throw new HttpError("Categoria inválida", 400);
  }

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
      today,
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
      frequency: "MONTHLY",
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
    data: occurrences.map((occurrence) => ({
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
    })),
  });

  const firstOccurrence = await tx.transaction.findFirstOrThrow({
    where: {
      seriesId: series.id,
      userId,
      year: start.year,
      month: start.month,
      day: start.day,
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
    const input = createMonthlyRecurringTransactionSchema.parse(
      await request.json()
    );

    const created = await prisma.$transaction((tx) =>
      createMonthlySeriesWithTx(tx, userId, input)
    );

    return success(
      {
        series: {
          id: created.series.id,
          frequency: created.series.frequency,
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
