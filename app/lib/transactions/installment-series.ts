import { Prisma } from "@prisma/client";
import { ZodError } from "zod";

import { failure, success } from "@/app/lib/api-response";
import { getAuthenticatedUserId } from "@/app/lib/auth";
import { HttpError, isHttpError } from "@/app/lib/http-error";
import { toTransactionDTO } from "@/app/lib/mappers/transaction.mapper";
import { prisma } from "@/app/lib/prisma";
import { buildInstallmentOccurrences } from "@/app/lib/transactions/installments";
import {
  CreateInstallmentTransactionInput,
  createInstallmentTransactionSchema,
} from "@/app/schemas/transaction-installment.schema";

const installmentTransactionInclude = {
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

export async function createInstallmentSeriesWithTx(
  tx: Prisma.TransactionClient,
  userId: string,
  input: CreateInstallmentTransactionInput
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

  if (category.type !== "EXPENSE") {
    throw new HttpError("Parcelamento está disponível apenas para despesas", 400);
  }

  const start = {
    year: input.transaction.year,
    month: input.transaction.month,
    day: input.transaction.day,
  };

  let occurrences;
  try {
    occurrences = buildInstallmentOccurrences({
      totalCents: input.transaction.amount,
      count: input.installmentCount,
      start,
      firstStatus: input.transaction.status,
    });
  } catch (error) {
    throw new HttpError(
      error instanceof Error ? error.message : "Parcelamento inválido",
      400
    );
  }

  const lastOccurrence = occurrences.at(-1)!;
  const series = await tx.transactionSeries.create({
    data: {
      type: "INSTALLMENT",
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
    data: occurrences.map((occurrence) => ({
      amount: occurrence.amount,
      year: occurrence.year,
      month: occurrence.month,
      day: occurrence.day,
      type: "EXPENSE" as const,
      description: input.transaction.description,
      status: occurrence.status,
      accountId: account.id,
      categoryId: category.id,
      userId,
      seriesId: series.id,
      seriesIndex: occurrence.index,
    })),
  });

  const firstOccurrence = await tx.transaction.findFirstOrThrow({
    where: {
      seriesId: series.id,
      userId,
      seriesIndex: 1,
    },
    include: installmentTransactionInclude,
  });

  return {
    series,
    firstOccurrence,
    occurrenceCount: occurrences.length,
  };
}

export async function createInstallmentTransactions(request: Request) {
  try {
    const userId = await getAuthenticatedUserId();
    const input = createInstallmentTransactionSchema.parse(await request.json());

    const created = await prisma.$transaction((tx) =>
      createInstallmentSeriesWithTx(tx, userId, input)
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
      "Parcelamento criado com sucesso",
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

    return failure("Erro ao criar parcelamento", 500);
  }
}
