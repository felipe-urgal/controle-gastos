import { prisma } from "@/app/lib/prisma";
import { baseCrudHandler } from "@/app/lib/api/base-crud-handler";
import { success, failure } from "@/app/lib/api-response";
import { getAuthenticatedUserId } from "@/app/lib/auth";
import { HttpError } from "@/app/lib/http-error";
import { createTransactionSchema, updateTransactionSchema } from "@/app/schemas/transaction.schema";
import { toTransactionDTO } from "@/app/lib/mappers/transaction.mapper";
import {
  isSupportedCurrency,
  SUPPORTED_CURRENCIES,
  type CurrencyFinancialSummary,
} from "@/app/types/financial-summary";

const transactionInclude = {
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

const TRANSFER_MUTATION_ERROR =
  "Transferências devem ser alteradas pelo fluxo dedicado";

export async function completePendingTransaction(
  request: Request,
  context?: { params: Promise<{ id: string }> }
) {
  try {
    void request;
    const userId = await getAuthenticatedUserId();

    if (!context) {
      return failure("Transação pendente não encontrada", 404);
    }

    const { id } = await context.params;

    const result = await prisma.transaction.updateMany({
      where: {
        id,
        userId,
        kind: "NORMAL",
        status: "PENDING",
      },
      data: {
        status: "COMPLETED",
      },
    });

    if (result.count !== 1) {
      return failure("Transação pendente não encontrada", 404);
    }

    return success(
      { id, status: "COMPLETED" as const },
      "Transação concluída com sucesso"
    );
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return failure("Não autenticado", 401);
    }

    return failure("Erro ao concluir transação", 500);
  }
}

export const transactionCrud = baseCrudHandler({
  model: (db) => db.transaction,
  entityName: "Transação",
  createSchema: createTransactionSchema,
  updateSchema: updateTransactionSchema,
  filterableFields: [
    "accountId",
    "categoryId",
    "status",
    "year",
    "month",
    "type",
  ],
  searchableFields: ["description"],
  orderBy: [
    { year: "desc" },
    { month: "desc" },
    { day: "desc" },
    { createdAt: "desc" },
  ],
  limit: true,
  include: transactionInclude,
  mapper: toTransactionDTO,

  checkBeforeDelete(entity) {
    return entity.kind === "TRANSFER" ? TRANSFER_MUTATION_ERROR : null;
  },

  async beforeCreate(data, userId) {
    return prisma.$transaction(async (tx) => {
      const account = await tx.account.findFirst({
        where: {
          id: data.accountId,
          userId,
          isActive: true,
        },
      });

      if (!account) {
        throw new HttpError("Conta inválida ou inativa", 400);
      }

      const category = await tx.category.findFirst({
        where: {
          id: data.categoryId,
          userId,
        },
      });

      if (!category) {
        throw new HttpError("Categoria inválida", 400);
      }

      const transactionType = category.type;

      const transaction = await tx.transaction.create({
        data: {
          ...data,
          type: transactionType,
          userId,
        },
      });

      return transaction;
    });
  },

  async beforeUpdate(data, existing, userId) {
    return prisma.$transaction(async (tx) => {
      const current = await tx.transaction.findFirst({
        where: { id: existing.id, userId },
        include: {
          account: true,
          category: true,
          series: { select: { type: true } },
        },
      });

      if (!current) {
        throw new HttpError("Transação não encontrada", 404);
      }

      if (current.kind === "TRANSFER") {
        throw new HttpError(TRANSFER_MUTATION_ERROR, 400);
      }

      if (data.accountId && data.accountId !== current.accountId) {
        const account = await tx.account.findFirst({
          where: {
            id: data.accountId,
            userId,
            isActive: true,
          },
        });

        if (!account) {
          throw new HttpError("Conta inválida ou inativa", 400);
        }
      }

      let newType = current.type;

      if (data.categoryId) {
        const category = await tx.category.findFirst({
          where: { id: data.categoryId, userId },
        });

        if (!category) {
          throw new HttpError("Categoria inválida", 400);
        }

        if (current.series?.type === "INSTALLMENT" && category.type !== "EXPENSE") {
          throw new HttpError(
            "Parcelas devem permanecer em categorias de despesa",
            400
          );
        }

        newType = category.type;
      }

      return {
        ...data,
        type: newType,
      };
    });
  },

  summary: async ({ where, userId }) => {
    const rows = await prisma.transaction.groupBy({
      by: ["accountId", "type"],
      where: {
        ...where,
        kind: "NORMAL",
        status: "COMPLETED",
      },
      _sum: { amount: true },
    });

    if (rows.length === 0) return [];

    const accounts = await prisma.account.findMany({
      where: {
        userId,
        id: { in: [...new Set(rows.map((row) => row.accountId))] },
      },
      select: { id: true, currency: true },
    });
    const currencyByAccount = new Map(
      accounts.map((account) => [account.id, account.currency]),
    );
    const summaries = new Map<string, CurrencyFinancialSummary>();

    for (const row of rows) {
      const currency = currencyByAccount.get(row.accountId);
      if (!isSupportedCurrency(currency)) continue;

      const summary = summaries.get(currency) ?? {
        currency,
        income: 0,
        expense: 0,
        balance: 0,
      };
      const amount = row._sum.amount ?? 0;

      if (row.type === "INCOME") summary.income += amount;
      if (row.type === "EXPENSE") summary.expense += amount;
      summary.balance = summary.income - summary.expense;
      summaries.set(currency, summary);
    }

    return SUPPORTED_CURRENCIES.flatMap((currency) => {
      const summary = summaries.get(currency);
      return summary ? [summary] : [];
    });
  },
});
