import { baseCrudHandler } from "@/app/lib/api/base-crud-handler";
import {
  createCategorySchema,
  updateCategorySchema
} from "@/app/schemas/category.schema";
import { toCategoryDTO } from "@/app/lib/mappers/category.mapper";

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
  checkBeforeDelete: (category) => {
    if (category._count.transactions > 0)
      return "Categoria possui transações vinculadas";
    return null;
  },
  mapper: toCategoryDTO,
});
