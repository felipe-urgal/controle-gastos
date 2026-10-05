import { ZodError } from "zod";

import { parseJsonBody } from "@/app/lib/api/request-json";
import { failure, success } from "@/app/lib/api-response";
import { getAuthenticatedUserId } from "@/app/lib/auth";
import { isUnauthorizedError } from "@/app/lib/auth/auth-errors";
import { lockOwnedCategoryForMutation } from "@/app/lib/categories/category-structure";
import { HttpError, isHttpError } from "@/app/lib/http-error";
import { prisma } from "@/app/lib/prisma";
import {
  categoryMonthlyLimitPeriodSchema,
  removeCategoryMonthlyLimitSchema,
  upsertCategoryMonthlyLimitSchema,
  batchCategoryMonthlyLimitsSchema,
  copyCategoryMonthlyLimitsSchema,
} from "@/app/lib/category-limits/category-monthly-limit-schema";
import {
  calculateMonthlyPlanningAmounts,
  summarizeMonthlyPlanning,
} from "@/app/lib/category-limits/monthly-planning-domain";
import type { SupportedCurrency } from "@/app/types/financial-summary";

function periodFromRequest(request: Request) {
  const url = new URL(request.url);
  return categoryMonthlyLimitPeriodSchema.parse({
    year: url.searchParams.get("year"),
    month: url.searchParams.get("month"),
    currency: url.searchParams.get("currency") ?? undefined,
  });
}

function removeInputFromRequest(request: Request) {
  const url = new URL(request.url);
  return removeCategoryMonthlyLimitSchema.parse({
    categoryId: url.searchParams.get("categoryId"),
    year: url.searchParams.get("year"),
    month: url.searchParams.get("month"),
    currency: url.searchParams.get("currency") ?? undefined,
  });
}

export async function listCategoryMonthlyLimitsForUser(
  userId: string,
  year: number,
  month: number,
  currency: SupportedCurrency,
) {
  const categories = await prisma.category.findMany({
    where: {
      userId,
      type: "EXPENSE",
    },
    select: {
      id: true,
      name: true,
      color: true,
      icon: true,
      isActive: true,
      monthlyLimits: {
        where: { userId, year, month, currency },
        select: {
          id: true,
          amount: true,
          currency: true,
        },
        take: 1,
      },
    },
    orderBy: [{ position: "asc" }, { name: "asc" }],
  });

  if (categories.length === 0) {
    return {
      items: [],
      summary: {
        budget: 0,
        realized: 0,
        committed: 0,
        available: 0,
        overBudgetCategories: 0,
        realizedIncome: 0,
        expectedIncome: 0,
        totalIncome: 0,
      },
    };
  }

  const categoryIds = categories.map((category) => category.id);
  const [realizedGroups, realizedAllocationGroups, committedGroups, committedAllocationGroups, incomeGroups] = await Promise.all([
    prisma.transaction.groupBy({
      by: ["categoryId"],
      where: {
        userId,
        categoryId: { in: categoryIds },
        allocations: { none: {} },
        type: "EXPENSE",
        status: "COMPLETED",
        year,
        month,
        account: { is: { userId, currency } },
      },
      _sum: { amount: true },
    }),
    prisma.transactionAllocation.groupBy({
      by: ["categoryId"],
      where: {
        userId,
        categoryId: { in: categoryIds },
        transaction: { is: { userId, type: "EXPENSE", status: "COMPLETED", year, month, account: { is: { userId, currency } } } },
      },
      _sum: { amount: true },
    }),
    prisma.transaction.groupBy({
      by: ["categoryId"],
      where: {
        userId,
        categoryId: { in: categoryIds },
        allocations: { none: {} },
        type: "EXPENSE",
        status: "PENDING",
        year,
        month,
        account: { is: { userId, currency } },
      },
      _sum: { amount: true },
    }),
    prisma.transactionAllocation.groupBy({
      by: ["categoryId"],
      where: {
        userId,
        categoryId: { in: categoryIds },
        transaction: { is: { userId, type: "EXPENSE", status: "PENDING", year, month, account: { is: { userId, currency } } } },
      },
      _sum: { amount: true },
    }),
    prisma.transaction.groupBy({
      by: ["status"],
      where: {
        userId,
        type: "INCOME",
        kind: "NORMAL",
        status: { in: ["COMPLETED", "PENDING"] },
        year,
        month,
        account: {
          is: {
            userId,
            currency,
            type: { not: "CREDIT_CARD" },
          },
        },
      },
      _sum: { amount: true },
    }),
  ]);
  const realizedByCategory = new Map(
    realizedGroups.map((group) => [group.categoryId, group._sum.amount ?? 0]),
  );
  for (const group of realizedAllocationGroups) {
    realizedByCategory.set(group.categoryId, (realizedByCategory.get(group.categoryId) ?? 0) + (group._sum.amount ?? 0));
  }
  const committedByCategory = new Map(
    committedGroups.map((group) => [group.categoryId, group._sum.amount ?? 0]),
  );
  for (const group of committedAllocationGroups) {
    committedByCategory.set(group.categoryId, (committedByCategory.get(group.categoryId) ?? 0) + (group._sum.amount ?? 0));
  }
  const incomeByStatus = new Map(
    incomeGroups.map((group) => [group.status, group._sum.amount ?? 0]),
  );

  const items = categories.map((category) => {
    const limit = category.monthlyLimits[0] ?? null;
    const realized = realizedByCategory.get(category.id) ?? 0;
    const committed = committedByCategory.get(category.id) ?? 0;
    const planning = calculateMonthlyPlanningAmounts({
      budget: limit?.amount ?? null,
      realized,
      committed,
    });

    return {
      category: {
        id: category.id,
        name: category.name,
        color: category.color,
        icon: category.icon,
        isActive: category.isActive,
      },
      currency,
      limit: limit
        ? {
            ...limit,
            currency: limit.currency as SupportedCurrency,
          }
        : null,
      realized: planning.realized,
      committed: planning.committed,
      consumption: planning.consumption,
      remaining:
        limit === null ? null : limit.amount - planning.realized,
      available: planning.available,
      percentage:
        limit === null
          ? null
          : limit.amount === 0
            ? planning.realized > 0
              ? null
              : 0
            : Math.round((planning.realized / limit.amount) * 1000) / 10,
      planningPercentage: planning.percentage,
      isOverBudget: planning.isOverBudget,
    };
  });

  const summary = summarizeMonthlyPlanning(
    items.map((item) =>
      calculateMonthlyPlanningAmounts({
        budget: item.limit?.amount ?? null,
        realized: item.realized,
        committed: item.committed,
      }),
    ),
  );

  return {
    items,
    summary: {
      ...summary,
      realizedIncome: incomeByStatus.get("COMPLETED") ?? 0,
      expectedIncome: incomeByStatus.get("PENDING") ?? 0,
      totalIncome:
        (incomeByStatus.get("COMPLETED") ?? 0) +
        (incomeByStatus.get("PENDING") ?? 0),
    },
  };
}

export async function getCategoryMonthlyLimits(request: Request) {
  try {
    const userId = await getAuthenticatedUserId();
    const { year, month, currency } = periodFromRequest(request);
    const planning = await listCategoryMonthlyLimitsForUser(userId, year, month, currency);

    return success({ year, month, currency, ...planning });
  } catch (error) {
    return handleCategoryLimitError(error, "Erro ao carregar limites mensais");
  }
}

export async function upsertCategoryMonthlyLimit(request: Request) {
  try {
    const userId = await getAuthenticatedUserId();
    const input = upsertCategoryMonthlyLimitSchema.parse(
      await parseJsonBody(request),
    );

    const limit = await prisma.$transaction(async (tx) => {
      await lockOwnedCategoryForMutation(tx, userId, input.categoryId);

      const [category, existingLimit] = await Promise.all([
        tx.category.findFirst({
          where: {
            id: input.categoryId,
            userId,
            type: "EXPENSE",
          },
          select: { id: true, isActive: true },
        }),
        tx.categoryMonthlyLimit.findUnique({
          where: {
            userId_categoryId_year_month_currency: {
              userId,
              categoryId: input.categoryId,
              year: input.year,
              month: input.month,
              currency: input.currency,
            },
          },
          select: { id: true },
        }),
      ]);

      if (!category) {
        throw new HttpError("Categoria de despesa inválida", 400);
      }
      if (!category.isActive && !existingLimit) {
        throw new HttpError(
          "Categoria inativa não pode receber um novo limite mensal",
          409,
          "CATEGORY_INACTIVE",
        );
      }

      return tx.categoryMonthlyLimit.upsert({
        where: {
          userId_categoryId_year_month_currency: {
            userId,
            categoryId: input.categoryId,
            year: input.year,
            month: input.month,
            currency: input.currency,
          },
        },
        update: { amount: input.amount },
        create: {
          userId,
          categoryId: input.categoryId,
          year: input.year,
          month: input.month,
          currency: input.currency,
          amount: input.amount,
        },
        select: {
          id: true,
          amount: true,
          currency: true,
          year: true,
          month: true,
          categoryId: true,
        },
      });
    });

    return success(limit, "Limite mensal salvo com sucesso");
  } catch (error) {
    return handleCategoryLimitError(error, "Erro ao salvar limite mensal");
  }
}

export async function removeCategoryMonthlyLimit(request: Request) {
  try {
    const userId = await getAuthenticatedUserId();
    const input = removeInputFromRequest(request);

    const removed = await prisma.categoryMonthlyLimit.deleteMany({
      where: {
        userId,
        categoryId: input.categoryId,
        year: input.year,
        month: input.month,
        currency: input.currency,
      },
    });

    if (removed.count === 0) {
      throw new HttpError("Limite mensal não encontrado", 404);
    }

    return success(null, "Limite mensal removido com sucesso");
  } catch (error) {
    return handleCategoryLimitError(error, "Erro ao remover limite mensal");
  }
}

function handleCategoryLimitError(error: unknown, fallback: string) {
  if (error instanceof ZodError) {
    return failure(error.issues[0]?.message ?? "Dados inválidos", 400);
  }

  if (isHttpError(error)) {
    return failure(error.message, error.status, error.code);
  }

  if (isUnauthorizedError(error)) {
    return failure("Não autenticado", 401);
  }

  return failure(fallback, 500);
}


export async function batchUpsertCategoryMonthlyLimits(request: Request) {
  try {
    const userId = await getAuthenticatedUserId();
    const input = batchCategoryMonthlyLimitsSchema.parse(await parseJsonBody(request));
    const categoryIds = [...new Set(input.items.map((item) => item.categoryId))];

    if (categoryIds.length !== input.items.length) {
      throw new HttpError(
        "Cada categoria pode aparecer apenas uma vez por operação",
        400,
        "CATEGORY_LIMIT_DUPLICATE_CATEGORY",
      );
    }

    await prisma.$transaction(async (tx) => {
      for (const categoryId of categoryIds) {
        await lockOwnedCategoryForMutation(tx, userId, categoryId);
      }

      const [ownedCategories, existingLimits] = await Promise.all([
        tx.category.findMany({
          where: {
            userId,
            type: "EXPENSE",
            id: { in: categoryIds },
          },
          select: { id: true, isActive: true },
        }),
        tx.categoryMonthlyLimit.findMany({
          where: {
            userId,
            categoryId: { in: categoryIds },
            year: input.year,
            month: input.month,
            currency: input.currency,
          },
          select: { categoryId: true },
        }),
      ]);

      if (ownedCategories.length !== categoryIds.length) {
        throw new HttpError(
          "Uma ou mais categorias de despesa são inválidas",
          400,
          "CATEGORY_LIMIT_INVALID_CATEGORY",
        );
      }

      const existingIds = new Set(existingLimits.map((item) => item.categoryId));
      const inactiveNewCategory = ownedCategories.find(
        (category) => !category.isActive && !existingIds.has(category.id),
      );
      if (inactiveNewCategory) {
        throw new HttpError(
          "Categoria inativa não pode receber um novo limite mensal",
          409,
          "CATEGORY_INACTIVE",
        );
      }

      for (const item of input.items) {
        await tx.categoryMonthlyLimit.upsert({
          where: {
            userId_categoryId_year_month_currency: {
              userId,
              categoryId: item.categoryId,
              year: input.year,
              month: input.month,
              currency: input.currency,
            },
          },
          update: { amount: item.amount },
          create: {
            userId,
            categoryId: item.categoryId,
            year: input.year,
            month: input.month,
            currency: input.currency,
            amount: item.amount,
          },
        });
      }
    });

    const planning = await listCategoryMonthlyLimitsForUser(
      userId,
      input.year,
      input.month,
      input.currency,
    );

    return success(
      { year: input.year, month: input.month, currency: input.currency, ...planning },
      "Planejamento mensal atualizado com sucesso",
    );
  } catch (error) {
    return handleCategoryLimitError(error, "Erro ao atualizar planejamento mensal");
  }
}

export async function copyCategoryMonthlyLimits(request: Request) {
  try {
    const userId = await getAuthenticatedUserId();
    const input = copyCategoryMonthlyLimitsSchema.parse(await parseJsonBody(request));

    if (
      input.sourceYear === input.targetYear &&
      input.sourceMonth === input.targetMonth
    ) {
      throw new HttpError(
        "Mês de origem e destino devem ser diferentes",
        400,
        "CATEGORY_LIMIT_SAME_PERIOD",
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const sourceCategoryRows = await tx.categoryMonthlyLimit.findMany({
        where: {
          userId,
          year: input.sourceYear,
          month: input.sourceMonth,
          currency: input.currency,
        },
        select: { categoryId: true },
      });
      const sourceCategoryIds = [
        ...new Set(sourceCategoryRows.map((item) => item.categoryId)),
      ];

      for (const categoryId of sourceCategoryIds) {
        await lockOwnedCategoryForMutation(tx, userId, categoryId);
      }

      const sourceLimits = await tx.categoryMonthlyLimit.findMany({
        where: {
          userId,
          year: input.sourceYear,
          month: input.sourceMonth,
          currency: input.currency,
          category: { is: { userId, type: "EXPENSE", isActive: true } },
        },
        select: { categoryId: true, amount: true },
      });

      if (sourceLimits.length === 0) {
        return { copied: 0, preserved: 0 };
      }

      const created = await tx.categoryMonthlyLimit.createMany({
        data: sourceLimits.map((limit) => ({
          userId,
          categoryId: limit.categoryId,
          year: input.targetYear,
          month: input.targetMonth,
          currency: input.currency,
          amount: limit.amount,
        })),
        skipDuplicates: true,
      });

      return {
        copied: created.count,
        preserved: sourceLimits.length - created.count,
      };
    });

    return success(
      result,
      result.copied === 0 && result.preserved === 0
        ? "Mês de origem não possui limites ativos para copiar"
        : "Planejamento copiado sem sobrescrever ajustes existentes",
    );
  } catch (error) {
    return handleCategoryLimitError(error, "Erro ao copiar planejamento mensal");
  }
}
