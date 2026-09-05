import { Prisma } from "@prisma/client";
import { ZodError } from "zod";

import { failure, success } from "@/app/lib/api-response";
import { getAuthenticatedUserId } from "@/app/lib/auth";
import { HttpError, isHttpError } from "@/app/lib/http-error";
import { toTransactionDTO } from "@/app/lib/mappers/transaction.mapper";
import { prisma } from "@/app/lib/prisma";
import {
  buildLogicalRecurrenceOccurrences,
  type LogicalRecurrenceRule,
} from "@/app/lib/transactions/logical-recurrence";
import { parseIsoLogicalDate } from "@/app/lib/transactions/monthly-recurrence";
import {
  createFlexibleRecurringTransactionSchema,
  type CreateFlexibleRecurringTransactionInput,
} from "@/app/schemas/transaction-flexible-recurrence.schema";

const recurringTransactionInclude = {
  account: {
    select: { id: true, name: true, currency: true, type: true, color: true, icon: true },
  },
  category: {
    select: { id: true, name: true, type: true, color: true, icon: true },
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
) {
  const account = await tx.account.findFirst({
    where: { id: input.transaction.accountId, userId, isActive: true },
  });
  if (!account) throw new HttpError("Conta inválida ou inativa", 400);

  const category = await tx.category.findFirst({
    where: { id: input.transaction.categoryId, userId, isActive: true },
  });
  if (!category) throw new HttpError("Categoria inválida", 400);

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
    where: { seriesId: series.id, userId, seriesIndex: 1 },
    include: recurringTransactionInclude,
  });

  return { series, firstOccurrence, occurrenceCount: occurrences.length };
}

export async function createFlexibleRecurringTransactions(request: Request) {
  try {
    const userId = await getAuthenticatedUserId();
    const input = createFlexibleRecurringTransactionSchema.parse(await request.json());
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
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return failure("Não autenticado", 401);
    }
    return failure("Erro ao criar recorrência", 500);
  }
}
