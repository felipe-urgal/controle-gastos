import { baseCrudHandler } from "@/app/lib/api/base-crud-handler";
import { HttpError } from "@/app/lib/http-error";
import { toCategoryDTO } from "@/app/lib/categories/category-dto";
import { createCategorySchema, updateCategorySchema } from "@/app/lib/categories/category-schema";

export const categoryCrud = baseCrudHandler({
  model: (db) => db.category,
  entityName: "Categoria",
  createSchema: createCategorySchema,
  updateSchema: updateCategorySchema,
  filterableFields: ["isActive", "type"],
  searchableFields: ["name", "description"],
  limit: true,
  orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  include: {
    _count: {
      select: {
        transactions: true,
      },
    },
  },
  beforeUpdate: async (data, category) => {
    if (data.type !== undefined && data.type !== category.type) {
      throw new HttpError(
        "O tipo da categoria não pode ser alterado após a criação",
        409,
        "CATEGORY_TYPE_IMMUTABLE",
      );
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
