import { createBaseService } from "@/app/services/base-service";
import { apiClient, dedupeInFlightRead } from "@/app/services/api-client";
import type { ApiResponse } from "@/app/services/base-service";
import { CategoryModel } from "@/app/types/category";

export type CategoryMergeResult = {
  targetId: string;
  movedTransactions: number;
  movedAllocations: number;
  movedTemplates: number;
  movedImportRules: number;
  movedLimits: number;
  discardedLimits: number;
};

const baseCategoryService = createBaseService<CategoryModel>("categories");

export const categoryService = {
  ...baseCategoryService,
  // Várias partes da tela pedem as categorias juntas; pedidos simultâneos idênticos viram um só.
  getAll: (query?: Parameters<typeof baseCategoryService.getAll>[0]) =>
    dedupeInFlightRead(`categories:${JSON.stringify(query ?? {})}`, () => baseCategoryService.getAll(query)),
  merge: (id: string, targetId: string) =>
    apiClient<ApiResponse<CategoryMergeResult>, { targetId: string }>(`/api/categories/${id}/merge`, {
      method: "POST",
      body: { targetId },
    }),
};
