import { prisma } from "@/app/lib/prisma";
import { baseCrudHandler } from "@/app/lib/api/base-crud-handler";
import {
  createCategorySchema,
  updateCategorySchema
} from "@/app/schemas/category.schema";
import { toCategoryDTO } from "@/app/lib/mappers/category.mapper";

export const categoryCrud = baseCrudHandler({
  model: prisma.category,
  entityName: "Categoria",
  createSchema: createCategorySchema,
  updateSchema: updateCategorySchema,
  orderBy: [
    { isActive: "desc" },
    { position: "asc" },
    { name: "asc" }
  ],
  include: {
    _count: {
      select: {
        transactions: true
      }
    }
  },
  checkBeforeDelete: (category) => {
    if (category._count.transactions > 0)
      return "Categoria possui transações vinculadas";
    return null;
  },
  mapper: toCategoryDTO,
});
