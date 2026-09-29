import { getOwnedActiveAccountOrThrow } from "@/app/lib/accounts/account-ownership";
import { assertAccountCategoryCompatibility } from "@/app/lib/accounts/account-transaction-compatibility";
import { assertCardPurchaseStatementMutable } from "@/app/lib/cards/credit-card-purchase-guards";
import { baseCrudHandler } from "@/app/lib/api/base-crud-handler";
import { failure, rateLimitFailure, success } from "@/app/lib/api-response";
import { getAuthenticatedUserId } from "@/app/lib/auth";
import { isUnauthorizedError } from "@/app/lib/auth/auth-errors";
import { getOwnedCategoryOrThrow } from "@/app/lib/categories/category-ownership";
import { HttpError } from "@/app/lib/http-error";
import { validateTransactionAllocationSet } from "@/app/lib/transactions/transaction-allocations";
import { prisma } from "@/app/lib/prisma";
import { consumeTransactionMutationRateLimit } from "@/app/lib/security/application-rate-limit";
import {
  createTransactionSchema,
  isValidTransactionDate,
  updateTransactionSchema,
} from "@/app/lib/transactions/transaction-schema";
import { toTransactionDTO } from "@/app/lib/transactions/transaction-dto";
import {
  isSupportedCurrency,
  SUPPORTED_CURRENCIES,
  type CurrencyFinancialSummary,
} from "@/app/types/financial-summary";

const transactionAccountSelect = {
  id: true,
  name: true,
  currency: true,
  type: true,
  color: true,
  icon: true,
} as const;

const transactionInclude = {
  account: {
    select: transactionAccountSelect,
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
  allocations: {
    orderBy: { createdAt: "asc" as const },
    select: {
      id: true,
      amount: true,
      category: {
        select: {
          id: true,
          name: true,
          type: true,
          color: true,
          icon: true,
        },
      },
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
  transfer: {
    select: {
      transactions: {
        select: {
          id: true,
          userId: true,
          transferRole: true,
          account: {
            select: transactionAccountSelect,
          },
        },
      },
    },
  },
};

const DEDICATED_MUTATION_ERROR =
  "Esta movimentação deve ser alterada pelo fluxo dedicado";
const RECONCILED_MUTATION_ERROR =
  "Transação reconciliada exige desfazer a reconciliação antes de alterações";
const TRANSACTION_RATE_LIMIT_MESSAGE =
  "Muitas alterações financeiras em pouco tempo. Tente novamente em instantes";

async function enforceTransactionMutationRateLimit(userId: string) {
  const limit = await consumeTransactionMutationRateLimit(userId);
  if (!limit.limited) return;

  throw new HttpError(
    TRANSACTION_RATE_LIMIT_MESSAGE,
    429,
    "TRANSACTION_RATE_LIMITED",
    { "Retry-After": String(limit.retryAfterSeconds) },
  );
}

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

    const limit = await consumeTransactionMutationRateLimit(userId);
    if (limit.limited) {
      return rateLimitFailure(
        TRANSACTION_RATE_LIMIT_MESSAGE,
        limit.retryAfterSeconds,
        "TRANSACTION_RATE_LIMITED",
      );
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
    if (isUnauthorizedError(error)) {
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
    "reconciliationStatus",
    "year",
    "month",
    "type",
  ],
  numericFilterFields: ["year", "month"],
  searchableFields: ["description"],
  orderBy: [
    { year: "desc" },
    { month: "desc" },
    { day: "desc" },
    { createdAt: "desc" },
    { id: "desc" },
  ],
  limit: true,
  include: transactionInclude,
  mapper: toTransactionDTO,

  checkBeforeDelete(entity) {
    if (entity.reconciliationStatus === "RECONCILED") {
      return RECONCILED_MUTATION_ERROR;
    }

    return entity.kind !== "NORMAL" ? DEDICATED_MUTATION_ERROR : null;
  },

  async beforeDelete(entity, userId) {
    await enforceTransactionMutationRateLimit(userId);
    if (entity.kind !== "NORMAL") return;

    const current = await prisma.transaction.findFirst({
      where: { id: entity.id, userId },
      include: { account: true },
    });
    if (!current) throw new HttpError("Transação não encontrada", 404);

    await prisma.$transaction((tx) =>
      assertCardPurchaseStatementMutable(
        tx,
        userId,
        current.account,
        { year: current.year, month: current.month, day: current.day },
      ),
    );
  },

  async beforeCreate(data, userId) {
    await enforceTransactionMutationRateLimit(userId);

    return prisma.$transaction(async (tx) => {
      const account = await getOwnedActiveAccountOrThrow(tx, userId, data.accountId);
      const category = await getOwnedCategoryOrThrow(tx, userId, data.categoryId);
      assertAccountCategoryCompatibility(account, category);

      const { allocations = [], ...transactionData } = data;
      const allocationError = validateTransactionAllocationSet({
        amount: transactionData.amount,
        categoryId: transactionData.categoryId,
        allocations,
      });
      if (allocationError) throw new HttpError(allocationError, 400);

      if (allocations.length > 0) {
        const categoryIds = [...new Set(allocations.map((item) => item.categoryId))];
        const allocationCategories = await tx.category.findMany({
          where: { id: { in: categoryIds }, userId, isActive: true },
          select: { id: true, type: true },
        });
        if (
          allocationCategories.length !== categoryIds.length ||
          allocationCategories.some((item) => item.type !== category.type)
        ) {
          throw new HttpError("Todas as categorias da divisão devem pertencer ao usuário e ter o mesmo tipo", 400);
        }
      }

      return tx.transaction.create({
        data: {
          ...transactionData,
          type: category.type,
          userId,
          allocations: allocations.length > 0
            ? { create: allocations.map((item) => ({ userId, categoryId: item.categoryId, amount: item.amount })) }
            : undefined,
        },
        include: transactionInclude,
      });
    });
  },

  async beforeUpdate(data, existing, userId) {
    await enforceTransactionMutationRateLimit(userId);

    return prisma.$transaction(async (tx) => {
      const current = await tx.transaction.findFirst({
        where: { id: existing.id, userId },
        include: {
          account: true,
          category: true,
          series: { select: { type: true } },
          allocations: { select: { categoryId: true, amount: true } },
        },
      });

      if (!current) {
        throw new HttpError("Transação não encontrada", 404);
      }

      if (current.reconciliationStatus === "RECONCILED") {
        throw new HttpError(RECONCILED_MUTATION_ERROR, 409);
      }

      if (current.kind !== "NORMAL") {
        throw new HttpError(DEDICATED_MUTATION_ERROR, 400);
      }

      const nextYear = data.year ?? current.year;
      const nextMonth = data.month ?? current.month;
      const nextDay = data.day ?? current.day;
      if (!isValidTransactionDate(nextYear, nextMonth, nextDay)) {
        throw new HttpError("Data inválida", 400);
      }

      await assertCardPurchaseStatementMutable(
        tx,
        userId,
        current.account,
        { year: current.year, month: current.month, day: current.day },
      );

      let nextAccount = current.account;
      if (data.accountId && data.accountId !== current.accountId) {
        nextAccount = await getOwnedActiveAccountOrThrow(tx, userId, data.accountId);
      }

      let nextCategory = current.category;
      let newType = current.type;

      if (data.categoryId) {
        nextCategory = await getOwnedCategoryOrThrow(tx, userId, data.categoryId);

        if (current.series?.type === "INSTALLMENT" && nextCategory.type !== "EXPENSE") {
          throw new HttpError(
            "Parcelas devem permanecer em categorias de despesa",
            400
          );
        }

        newType = nextCategory.type;
      }

      if (!nextCategory) {
        throw new HttpError("Categoria inválida", 400);
      }

      const nextAllocations = data.allocations === undefined ? current.allocations : data.allocations;
      const allocationError = validateTransactionAllocationSet({
        amount: data.amount ?? current.amount,
        categoryId: nextCategory.id,
        allocations: nextAllocations,
      });
      if (allocationError) throw new HttpError(allocationError, 400);

      if (nextAllocations.length > 0) {
        const categoryIds = [...new Set(nextAllocations.map((item) => item.categoryId))];
        const allocationCategories = await tx.category.findMany({
          where: { id: { in: categoryIds }, userId, isActive: true },
          select: { id: true, type: true },
        });
        if (
          allocationCategories.length !== categoryIds.length ||
          allocationCategories.some((item) => item.type !== nextCategory.type)
        ) {
          throw new HttpError("Todas as categorias da divisão devem pertencer ao usuário e ter o mesmo tipo", 400);
        }
      }

      assertAccountCategoryCompatibility(nextAccount, nextCategory);
      await assertCardPurchaseStatementMutable(
        tx,
        userId,
        nextAccount,
        { year: nextYear, month: nextMonth, day: nextDay },
      );

      return {
        ...data,
        type: newType,
      };
    });
  },

  async customUpdate({ data, entity, userId }) {
    const { allocations, ...transactionData } = data;

    return prisma.$transaction(async (tx) => {
      const updated = await tx.transaction.updateMany({
        where: {
          id: entity.id,
          userId,
          reconciliationStatus: { not: "RECONCILED" },
        },
        data: transactionData,
      });

      if (updated.count !== 1) {
        throw new HttpError(RECONCILED_MUTATION_ERROR, 409);
      }

      if (allocations !== undefined) {
        await tx.transactionAllocation.deleteMany({ where: { transactionId: entity.id, userId } });
        if (allocations.length > 0) {
          await tx.transactionAllocation.createMany({
            data: allocations.map((item: { categoryId: string; amount: number }) => ({
              userId,
              transactionId: entity.id,
              categoryId: item.categoryId,
              amount: item.amount,
            })),
          });
        }
      }

      const result = await tx.transaction.findFirst({
        where: { id: entity.id, userId },
        include: transactionInclude,
      });
      if (!result) throw new HttpError("Transação não encontrada", 404);
      return result;
    });
  },

  async customDelete(entity, userId) {
    const deleted = await prisma.transaction.deleteMany({
      where: {
        id: entity.id,
        userId,
        reconciliationStatus: { not: "RECONCILED" },
      },
    });

    if (deleted.count !== 1) {
      throw new HttpError(RECONCILED_MUTATION_ERROR, 409);
    }
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