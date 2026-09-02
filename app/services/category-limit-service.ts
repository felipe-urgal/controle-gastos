import { apiClient } from "@/app/services/api-client";
import { ApiResponse } from "@/app/services/base-service";
import {
  CategoryMonthlyLimitListResponse,
  CategoryMonthlyLimitSummary,
  UpsertCategoryMonthlyLimitInput,
} from "@/app/types/category-monthly-limit";
import type { SupportedCurrency } from "@/app/types/financial-summary";

export const categoryLimitService = {
  async getAll(
    year: number,
    month: number,
    currency: SupportedCurrency,
  ): Promise<ApiResponse<CategoryMonthlyLimitListResponse>> {
    return apiClient<ApiResponse<CategoryMonthlyLimitListResponse>>("/api/category-limits", {
      method: "GET",
      queryParams: { year, month, currency },
    });
  },

  async save(
    input: UpsertCategoryMonthlyLimitInput,
  ): Promise<ApiResponse<CategoryMonthlyLimitSummary>> {
    return apiClient<ApiResponse<CategoryMonthlyLimitSummary>, UpsertCategoryMonthlyLimitInput>(
      "/api/category-limits",
      {
        method: "PUT",
        body: input,
      },
    );
  },

  async remove(
    categoryId: string,
    year: number,
    month: number,
    currency: SupportedCurrency,
  ): Promise<ApiResponse<null>> {
    return apiClient<ApiResponse<null>>("/api/category-limits", {
      method: "DELETE",
      queryParams: { categoryId, year, month, currency },
    });
  },
};
