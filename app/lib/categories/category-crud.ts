import { Prisma } from "@prisma/client";

import { baseCrudHandler } from "@/app/lib/api/base-crud-handler";
import {
  assertCategoryDeletable,
  assertCategoryTypeChangeAllowed,
  getCategoryUsage,
  lockOwnedCategoryForMutation,
} from "@/app/lib/categories/category-structure";
import { toCategoryDTO } from "@/app/lib/categories/category-dto";
import {
  withCategoryTransactionUsage,
  withCategoryTransactionUsages,
} from "@/app/lib/categories/category-usage";
import { createCategorySchema, updateCategorySchema } from "@/app/lib/categories/category-schema";
import { HttpError } from "@/app/lib/http-error";
import { prisma } from "@/app/lib/prisma";

function rethrowCategoryWriteError(error: unknown): never {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  ) {
    throw new HttpError(
      "Já existe uma categoria com este nome e tipo",
      409,
      "CATEGORY_NAME_CONFLICT",
    );
  }
  throw error;
}

const include = {
  _count: {
    select: {
      transactions: true,
    },
  },
} as const;

export const categoryCrud = baseCrudHandler({
  model: (db) => db.category,
  entityName: "Categoria",
  createSchema: createCategorySchema,
  updateSchema: updateCategorySchema,
  filterableFields: ["isActive", "type"],
  searchableFields: ["name", "description"],
  limit: true,
  orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  include,
  beforeCreate: async (data, userId) => {
    try {
      return await prisma.category.create({
        data: { ...data, userId },
        include,
      });
    } catch (error) {
      rethrowCategoryWriteError(error);
    }
  },
  beforeUpdate: async (data, category) => {
    assertCategoryTypeChangeAllowed(data, category);
    return data;
  },
  customUpdate: async ({ data, entity, userId, include: updateInclude }) =>
    prisma.$transaction(async (tx) => {
      await lockOwnedCategoryForMutation(tx, userId, entity.id);
      const current = await tx.category.findFirst({
        where: { id: entity.id, userId },
      });
      if (!current) throw new HttpError("Categoria não encontrada", 404);

      assertCategoryTypeChangeAllowed(data, current);
      try {
        return await tx.category.update({
          where: { id: current.id },
          data,
          include: updateInclude,
        });
      } catch (error) {
        rethrowCategoryWriteError(error);
      }
    }),
  customDelete: async (category, userId) => {
    try {
      await prisma.$transaction(async (tx) => {
        await lockOwnedCategoryForMutation(tx, userId, category.id);
        const usage = await getCategoryUsage(tx, userId, category.id);
        assertCategoryDeletable(usage);
        await tx.category.delete({ where: { id: category.id } });
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2003"
      ) {
        throw new HttpError(
          "Categoria possui dados vinculados",
          409,
          "CATEGORY_HAS_LINKED_DATA",
        );
      }
      throw error;
    }
  },
  afterRead: (category, userId) => withCategoryTransactionUsage(category, userId),
  afterList: ({ items, userId }) => withCategoryTransactionUsages(items, userId),
  mapper: toCategoryDTO,
});
