import { baseCrudHandler } from "@/app/lib/api/base-crud-handler";
import { HttpError } from "@/app/lib/http-error";
import { toCategoryDTO } from "@/app/lib/mappers/category.mapper";
import { prisma } from "@/app/lib/prisma";
import { createCategorySchema, updateCategorySchema } from "@/app/schemas/category.schema";

export const categoryCrud = baseCrudHandler({
  model: (db) => db.category,
  entityName: "Categoria",
  createSchema: createCategorySchema,
  updateSchema: updateCategorySchema,
  filterableFields: ["isActive", "type"],
  searchableFields: ["name", "description"],
  orderBy: { createdAt: "desc" },
  include: {
    _count: {
      select: {
        transactions: true,
      },
    },
  },
  beforeUpdate: async (data, category, userId) => {
    if (category.type === "EXPENSE" && data.type === "INCOME") {
      const monthlyLimitCount = await prisma.categoryMonthlyLimit.count({
        where: {
          userId,
          categoryId: category.id,
        },
      });

      if (monthlyLimitCount > 0) {
        throw new HttpError(
          "Remova os limites mensais da categoria antes de alterá-la para receita",
          400,
        );
      }
    }

    return data;
  },
  checkBeforeDelete: (category) => {
    if (category._count.transactions > 0)
      return "Categoria possui transações vinculadas";
    return null;
  },
  mapper: toCategoryDTO,
});
