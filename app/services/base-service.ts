import { apiClient } from "@/app/services/api-client";

type Id = string;

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export function createBaseService<TModel, TListResponse = { items: TModel[] }>(resource: string) {
  return {
    async getAll(query?: Record<string, string | number | undefined>): Promise<ApiResponse<TListResponse>> {
      return apiClient<ApiResponse<TListResponse>>(`/api/v1/${resource}`, {
        method: "GET",
        queryParams: query,
      });
    },

    async getById(id: Id): Promise<ApiResponse<TModel>> {
      return apiClient<ApiResponse<TModel>>(`/api/v1/${resource}/${id}`, {
        method: "GET",
      });
    },

    async create<TBody>(data: TBody): Promise<ApiResponse<TModel>> {
      return apiClient<ApiResponse<TModel>, TBody>(`/api/v1/${resource}`, {
        method: "POST",
        body: data,
      });
    },

    async update<TBody>(id: Id, data: TBody): Promise<ApiResponse<TModel>> {
      return apiClient<ApiResponse<TModel>, TBody>(`/api/v1/${resource}/${id}`, {
        method: "PUT",
        body: data,
      });
    },

    async delete(id: Id): Promise<ApiResponse<null>> {
      return apiClient<ApiResponse<null>>(`/api/v1/${resource}/${id}`, {
        method: "DELETE",
      });
    },
  };
};
