import type { Category, Prisma, PrismaClient } from "@prisma/client";
import { z } from "zod";

import { updateCategorySchema } from "@/app/lib/categories/category-schema";
import { HttpError } from "@/app/lib/http-error";

type CategoryUpdate = z.infer<typeof updateCategorySchema>;
type CategoryDb = PrismaClient | Prisma.TransactionClient;

export type CategoryUsage = {
  transactions: number;
  allocations: number;
  monthlyLimits: number;
  importRules: number;
  transactionTemplates: number;
};

export async function lockOwnedCategoryForMutation(
  tx: Prisma.TransactionClient,
  userId: string,
  categoryId: string,
) {
  const rows = await tx.$queryRaw<Array<{ id: string }>>`
    SELECT "id"
    FROM "categories"
    WHERE "id" = ${categoryId} AND "userId" = ${userId}
    FOR UPDATE
  `;

  if (rows.length !== 1) {
    throw new HttpError("Categoria não encontrada", 404);
  }
}

export async function getCategoryUsage(
  db: CategoryDb,
  userId: string,
  categoryId: string,
): Promise<CategoryUsage> {
  const [
    transactions,
    allocations,
    monthlyLimits,
    importRules,
    transactionTemplates,
  ] = await Promise.all([
    db.transaction.count({ where: { userId, categoryId } }),
    db.transactionAllocation.count({ where: { userId, categoryId } }),
    db.categoryMonthlyLimit.count({ where: { userId, categoryId } }),
    db.transactionImportRule.count({ where: { userId, categoryId } }),
    db.transactionTemplate.count({ where: { userId, categoryId } }),
  ]);

  return {
    transactions,
    allocations,
    monthlyLimits,
    importRules,
    transactionTemplates,
  };
}

export function assertCategoryTypeChangeAllowed(
  data: CategoryUpdate,
  entity: Pick<Category, "type">,
) {
  if (data.type !== undefined && data.type !== entity.type) {
    throw new HttpError(
      "O tipo da categoria não pode ser alterado após a criação",
      409,
      "CATEGORY_TYPE_IMMUTABLE",
    );
  }
}

export function assertCategoryDeletable(usage: CategoryUsage) {
  if (usage.transactions > 0) {
    throw new HttpError(
      "Categoria possui transações vinculadas",
      409,
      "CATEGORY_HAS_TRANSACTIONS",
    );
  }
  if (usage.allocations > 0) {
    throw new HttpError(
      "Categoria possui divisões de transações vinculadas",
      409,
      "CATEGORY_HAS_ALLOCATIONS",
    );
  }
  if (usage.monthlyLimits > 0) {
    throw new HttpError(
      "Categoria possui limites mensais vinculados",
      409,
      "CATEGORY_HAS_MONTHLY_LIMITS",
    );
  }
  if (usage.importRules > 0) {
    throw new HttpError(
      "Categoria possui regras de importação vinculadas",
      409,
      "CATEGORY_HAS_IMPORT_RULES",
    );
  }
  if (usage.transactionTemplates > 0) {
    throw new HttpError(
      "Categoria possui modelos de lançamento vinculados",
      409,
      "CATEGORY_HAS_TEMPLATES",
    );
  }
}
