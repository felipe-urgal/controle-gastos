import { apiClient } from "./apiClient";
import { CategoryModel, CategoryResponse, GetCategoriesParams } from '@/app/types/category'

export const categoryService = {
  async getCategories(userId: string, { page = 1, limit = 8, search = "" }: GetCategoriesParams = {}): Promise<CategoryResponse> {
    return apiClient<CategoryResponse>(`/api/category`, {
      method: "GET",
      queryParams: { userId, page, limit, search },
    });
  },

  async getCategoryById(id: string): Promise<CategoryModel> {
    return apiClient<CategoryModel>(`/api/category/${id}`, { method: "GET" });
  },

  async createCategory(data: Omit<CategoryModel, "id">): Promise<CategoryModel> {
    return apiClient<CategoryModel, Omit<CategoryModel, "id">>(`/api/category`, { method: "POST", body: data });
  },

  async updateCategory(data: CategoryModel): Promise<CategoryModel> {
    return apiClient<CategoryModel, CategoryModel>(`/api/category`, { method: "PUT", body: data });
  },

  async deleteCategory(id: string): Promise<{ success: boolean, message: string }> {
    return apiClient<{ success: boolean, message: string }, { id: string }>(`/api/category`, { method: "DELETE", body: { id } });
  },
};