import { apiClient } from "@/app/services/api-client";
import { ApiResponse } from "@/app/services/base-service";
import {
  CategoryMonthlyLimitListResponse,
  CategoryMonthlyLimitSummary,
  UpsertCategoryMonthlyLimitInput,
} from "@/app/types/category-monthly-limit";

export const categoryLimitService = {
  async getAll(year: number, month: number): Promise<ApiResponse<CategoryMonthlyLimitListResponse>> {
    return apiClient<ApiResponse<CategoryMonthlyLimitListResponse>>("/api/category-limits", {
      method: "GET",
      queryParams: { year, month },
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

  async remove(categoryId: string, year: number, month: number): Promise<ApiResponse<null>> {
    return apiClient<ApiResponse<null>>("/api/category-limits", {
      method: "DELETE",
      queryParams: { categoryId, year, month },
    });
  },
};
