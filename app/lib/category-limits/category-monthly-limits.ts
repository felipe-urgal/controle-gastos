import { ZodError } from "zod";

import { failure, success } from "@/app/lib/api-response";
import { getAuthenticatedUserId } from "@/app/lib/auth";
import { HttpError, isHttpError } from "@/app/lib/http-error";
import { prisma } from "@/app/lib/prisma";
import {
  categoryMonthlyLimitPeriodSchema,
  removeCategoryMonthlyLimitSchema,
  upsertCategoryMonthlyLimitSchema,
} from "@/app/schemas/category-monthly-limit.schema";
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
    return [];
  }

  const categoryIds = categories.map((category) => category.id);
  const realizedGroups = await prisma.transaction.groupBy({
    by: ["categoryId"],
    where: {
      userId,
      categoryId: { in: categoryIds },
      type: "EXPENSE",
      status: "COMPLETED",
      year,
      month,
      account: { is: { userId, currency } },
    },
    _sum: { amount: true },
  });
  const realizedByCategory = new Map(
    realizedGroups.map((group) => [group.categoryId, group._sum.amount ?? 0]),
  );

  return categories.map((category) => {
    const limit = category.monthlyLimits[0] ?? null;
    const realized = realizedByCategory.get(category.id) ?? 0;
    const remaining = limit ? limit.amount - realized : null;
    const percentage = limit
      ? Math.round((realized / limit.amount) * 1000) / 10
      : null;

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
      realized,
      remaining,
      percentage,
    };
  });
}

export async function getCategoryMonthlyLimits(request: Request) {
  try {
    const userId = await getAuthenticatedUserId();
    const { year, month, currency } = periodFromRequest(request);
    const items = await listCategoryMonthlyLimitsForUser(userId, year, month, currency);

    return success({ year, month, currency, items });
  } catch (error) {
    return handleCategoryLimitError(error, "Erro ao carregar limites mensais");
  }
}

export async function upsertCategoryMonthlyLimit(request: Request) {
  try {
    const userId = await getAuthenticatedUserId();
    const input = upsertCategoryMonthlyLimitSchema.parse(await request.json());

    const category = await prisma.category.findFirst({
      where: {
        id: input.categoryId,
        userId,
        type: "EXPENSE",
      },
      select: { id: true },
    });

    if (!category) {
      throw new HttpError("Categoria de despesa inválida", 400);
    }

    const limit = await prisma.categoryMonthlyLimit.upsert({
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

  if (error instanceof Error && error.message === "UNAUTHORIZED") {
    return failure("Não autenticado", 401);
  }

  return failure(fallback, 500);
}
