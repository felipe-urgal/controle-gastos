import { dedupeInFlightRead } from "@/app/services/api-client";
import { createBaseService } from "@/app/services/base-service";
import { CategoryModel } from "@/app/types/category";

const baseCategoryService = createBaseService<CategoryModel>("categories");

export const categoryService = {
  ...baseCategoryService,
  // Várias partes da tela pedem as categorias juntas; pedidos simultâneos idênticos viram um só.
  getAll: (query?: Parameters<typeof baseCategoryService.getAll>[0]) =>
    dedupeInFlightRead(`categories:${JSON.stringify(query ?? {})}`, () => baseCategoryService.getAll(query)),
};
