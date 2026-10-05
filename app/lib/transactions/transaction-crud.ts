import { createHash } from "node:crypto";

import { Prisma } from "@prisma/client";

import { getOwnedActiveAccountOrThrow } from "@/app/lib/accounts/account-ownership";
import { assertAccountCategoryCompatibility } from "@/app/lib/accounts/account-transaction-compatibility";
import { assertCardPurchaseStatementMutable } from "@/app/lib/cards/credit-card-purchase-guards";
import { baseCrudHandler } from "@/app/lib/api/base-crud-handler";
import { failure, rateLimitFailure, success } from "@/app/lib/api-response";
import { getAuthenticatedUserId } from "@/app/lib/auth";
import { isUnauthorizedError } from "@/app/lib/auth/auth-errors";
import { getOwnedActiveCategoryOrThrow } from "@/app/lib/categories/category-ownership";
import { HttpError, isHttpError } from "@/app/lib/http-error";
import { getOwnedActiveMerchantOrThrow } from "@/app/lib/merchants/merchant-ownership";
import { assertOwnedTags } from "@/app/lib/tags/tag-ownership";
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
  merchant: {
    select: {
      id: true,
      name: true,
      isActive: true,
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
  tagLinks: {
    orderBy: { createdAt: "asc" as const },
    select: {
      tag: { select: { id: true, name: true } },
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

type NormalTransactionCreateInput = {
  amount: number;
  description: string;
  year: number;
  month: number;
  day: number;
  accountId: string;
  categoryId: string;
  merchantId?: string | null;
  status: "COMPLETED" | "PENDING" | "CANCELLED";
  allocations?: Array<{ categoryId: string; amount: number }>;
  tagIds?: string[];
};

type TransactionCreateOperationReader = Pick<
  Prisma.TransactionClient,
  "transactionCreateOperation"
>;

type TransactionCreateOperationWithTransaction =
  Prisma.TransactionCreateOperationGetPayload<{
    include: {
      transaction: {
        include: typeof transactionInclude;
      };
    };
  }>;

function sha256(value: string) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function normalizeTransactionIdempotencyKey(value: string | null) {
  if (value === null) return null;

  const normalized = value.trim();
  if (!normalized || normalized.length > 128) {
    throw new HttpError("Chave de idempotência inválida", 400);
  }

  return normalized;
}

function hashNormalTransactionInput(input: NormalTransactionCreateInput) {
  const allocations = [...(input.allocations ?? [])].sort((left, right) =>
    left.categoryId.localeCompare(right.categoryId),
  );
  const tagIds = [...(input.tagIds ?? [])].sort();

  return sha256(
    JSON.stringify({
      amount: input.amount,
      description: input.description,
      year: input.year,
      month: input.month,
      day: input.day,
      accountId: input.accountId,
      categoryId: input.categoryId,
      merchantId: input.merchantId ?? null,
      status: input.status,
      allocations,
      tagIds,
    }),
  );
}

async function findTransactionCreateOperation(
  db: TransactionCreateOperationReader,
  userId: string,
  idempotencyKeyHash: string,
) {
  return db.transactionCreateOperation.findFirst({
    where: { userId, idempotencyKeyHash },
    include: {
      transaction: {
        include: transactionInclude,
      },
    },
  });
}

function replayTransactionCreateOperation(
  operation: TransactionCreateOperationWithTransaction,
  requestHash: string,
) {
  if (operation.requestHash !== requestHash) {
    throw new HttpError(
      "Chave de idempotência já utilizada com outro payload",
      409,
      "IDEMPOTENCY_PAYLOAD_CONFLICT",
    );
  }

  if (!operation.transaction) {
    throw new HttpError(
      "Transação já removida para esta chave de idempotência",
      409,
      "IDEMPOTENCY_OPERATION_REMOVED",
    );
  }

  return operation.transaction;
}

async function transactionWhere(userId: string, request?: Request) {
  const filters: Record<string, unknown> = { userId };
  const AND: Record<string, unknown>[] = [filters];
  if (!request) return { AND };

  const { searchParams } = new URL(request.url);
  for (const field of [
    "accountId",
    "categoryId",
    "merchantId",
    "status",
    "reconciliationStatus",
    "type",
  ]) {
    const value = searchParams.get(field);
    if (value) filters[field] = value;
  }

  for (const field of ["year", "month"]) {
    const value = searchParams.get(field);
    if (!value) continue;
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
      throw new HttpError(`Filtro ${field} inválido`, 400, "INVALID_QUERY");
    }
    filters[field] = parsed;
  }

  const search = searchParams.get("search")?.trim();
  if (search) {
    AND.push({
      OR: [
        { description: { contains: search, mode: "insensitive" } },
        { tagLinks: { some: { userId, tag: { name: { contains: search, mode: "insensitive" } } } } },
      ],
    });
  }

  const tagId = searchParams.get("tagId");
  if (tagId) {
    AND.push({ tagLinks: { some: { userId, tagId } } });
  }

  return { AND };
}

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

    await prisma.$transaction(async (tx) => {
      const current = await tx.transaction.findFirst({
        where: {
          id,
          userId,
          kind: "NORMAL",
          status: "PENDING",
        },
        include: { account: true },
      });

      if (!current) {
        throw new HttpError("Transação pendente não encontrada", 404);
      }

      await assertCardPurchaseStatementMutable(
        tx,
        userId,
        current.account,
        { year: current.year, month: current.month, day: current.day },
      );

      const result = await tx.transaction.updateMany({
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
        throw new HttpError("Transação pendente não encontrada", 404);
      }
    });

    return success(
      { id, status: "COMPLETED" as const },
      "Transação concluída com sucesso"
    );
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return failure("Não autenticado", 401);
    }
    if (isHttpError(error)) {
      return failure(error.message, error.status, error.code);
    }

    return failure("Erro ao concluir transação", 500);
  }
}

export const transactionCrud = baseCrudHandler({
  model: (db) => db.transaction,
  entityName: "Transação",
  createSchema: createTransactionSchema,
  updateSchema: updateTransactionSchema,
  customWhere: transactionWhere,
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

  async beforeCreate(data, userId, request) {
    const normalizedIdempotencyKey = normalizeTransactionIdempotencyKey(
      request.headers.get("Idempotency-Key"),
    );
    const idempotencyKeyHash = normalizedIdempotencyKey
      ? sha256(normalizedIdempotencyKey)
      : null;
    const requestHash = normalizedIdempotencyKey
      ? hashNormalTransactionInput(data)
      : null;

    if (idempotencyKeyHash && requestHash) {
      const existing = await findTransactionCreateOperation(
        prisma,
        userId,
        idempotencyKeyHash,
      );
      if (existing) {
        return replayTransactionCreateOperation(existing, requestHash);
      }
    }

    await enforceTransactionMutationRateLimit(userId);

    try {
      return await prisma.$transaction(async (tx) => {
        if (idempotencyKeyHash && requestHash) {
          const existing = await findTransactionCreateOperation(
            tx,
            userId,
            idempotencyKeyHash,
          );
          if (existing) {
            return replayTransactionCreateOperation(existing, requestHash);
          }
        }
      const account = await getOwnedActiveAccountOrThrow(tx, userId, data.accountId);
      const category = await getOwnedActiveCategoryOrThrow(tx, userId, data.categoryId);
      assertAccountCategoryCompatibility(account, category);
      await assertCardPurchaseStatementMutable(
        tx,
        userId,
        account,
        { year: data.year, month: data.month, day: data.day },
      );
      if (data.merchantId) {
        await getOwnedActiveMerchantOrThrow(tx, userId, data.merchantId);
      }

      const { allocations = [], tagIds = [], ...transactionData } = data;
      await assertOwnedTags(tx, userId, tagIds);
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

        const created = await tx.transaction.create({
          data: {
            ...transactionData,
            type: category.type,
            userId,
            allocations: allocations.length > 0
              ? { create: allocations.map((item) => ({ userId, categoryId: item.categoryId, amount: item.amount })) }
              : undefined,
            tagLinks: tagIds.length > 0
              ? { create: tagIds.map((tagId) => ({ userId, tagId })) }
              : undefined,
          },
          include: transactionInclude,
        });

        if (idempotencyKeyHash && requestHash) {
          await tx.transactionCreateOperation.create({
            data: {
              userId,
              idempotencyKeyHash,
              requestHash,
              transactionId: created.id,
            },
          });
        }

        return created;
      });
    } catch (error) {
      if (
        idempotencyKeyHash &&
        requestHash &&
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        const existing = await findTransactionCreateOperation(
          prisma,
          userId,
          idempotencyKeyHash,
        );
        if (existing) {
          return replayTransactionCreateOperation(existing, requestHash);
        }
      }

      throw error;
    }
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
          tagLinks: { select: { tagId: true } },
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
        nextCategory = await getOwnedActiveCategoryOrThrow(tx, userId, data.categoryId);

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

      if (data.merchantId && data.merchantId !== current.merchantId) {
        await getOwnedActiveMerchantOrThrow(tx, userId, data.merchantId);
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

      if (data.tagIds !== undefined) {
        await assertOwnedTags(tx, userId, data.tagIds);
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
    const { allocations, tagIds, ...transactionData } = data;

    return prisma.$transaction(async (tx) => {
      const current = await tx.transaction.findFirst({
        where: { id: entity.id, userId },
        include: { account: true },
      });
      if (!current) throw new HttpError("Transação não encontrada", 404);
      if (current.kind !== "NORMAL") throw new HttpError(DEDICATED_MUTATION_ERROR, 400);
      if (current.reconciliationStatus === "RECONCILED") {
        throw new HttpError(RECONCILED_MUTATION_ERROR, 409);
      }

      await assertCardPurchaseStatementMutable(
        tx,
        userId,
        current.account,
        { year: current.year, month: current.month, day: current.day },
      );

      const nextAccount =
        transactionData.accountId && transactionData.accountId !== current.accountId
          ? await getOwnedActiveAccountOrThrow(tx, userId, transactionData.accountId)
          : current.account;
      await assertCardPurchaseStatementMutable(
        tx,
        userId,
        nextAccount,
        {
          year: transactionData.year ?? current.year,
          month: transactionData.month ?? current.month,
          day: transactionData.day ?? current.day,
        },
      );

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

      if (tagIds !== undefined) {
        await tx.transactionTag.deleteMany({ where: { transactionId: entity.id, userId } });
        if (tagIds.length > 0) {
          await tx.transactionTag.createMany({
            data: tagIds.map((tagId: string) => ({
              userId,
              transactionId: entity.id,
              tagId,
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
    await prisma.$transaction(async (tx) => {
      const current = await tx.transaction.findFirst({
        where: { id: entity.id, userId },
        include: { account: true },
      });
      if (!current) throw new HttpError("Transação não encontrada", 404);
      if (current.kind !== "NORMAL") throw new HttpError(DEDICATED_MUTATION_ERROR, 400);
      if (current.reconciliationStatus === "RECONCILED") {
        throw new HttpError(RECONCILED_MUTATION_ERROR, 409);
      }

      await assertCardPurchaseStatementMutable(
        tx,
        userId,
        current.account,
        { year: current.year, month: current.month, day: current.day },
      );

      const deleted = await tx.transaction.deleteMany({
        where: {
          id: entity.id,
          userId,
          kind: "NORMAL",
          reconciliationStatus: { not: "RECONCILED" },
        },
      });

      if (deleted.count !== 1) {
        throw new HttpError(RECONCILED_MUTATION_ERROR, 409);
      }
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
      select: { id: true, currency: true, type: true },
    });
    const accountById = new Map(
      accounts.map((account) => [account.id, account]),
    );
    const summaries = new Map<string, CurrencyFinancialSummary>();

    for (const row of rows) {
      const account = accountById.get(row.accountId);
      const currency = account?.currency;
      if (!account || !isSupportedCurrency(currency)) continue;

      const summary = summaries.get(currency) ?? {
        currency,
        income: 0,
        expense: 0,
        balance: 0,
      };
      const amount = row._sum.amount ?? 0;

      if (account.type === "CREDIT_CARD") {
        if (row.type === "EXPENSE") summary.expense += amount;
        if (row.type === "INCOME") summary.expense -= amount;
      } else {
        if (row.type === "INCOME") summary.income += amount;
        if (row.type === "EXPENSE") summary.expense += amount;
      }
      summary.balance = summary.income - summary.expense;
      summaries.set(currency, summary);
    }

    return SUPPORTED_CURRENCIES.flatMap((currency) => {
      const summary = summaries.get(currency);
      return summary ? [summary] : [];
    });
  },
});