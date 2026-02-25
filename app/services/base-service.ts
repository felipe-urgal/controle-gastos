import { apiClient } from "@/app/services/api-client";

type Id = string;

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export function createBaseService<TModel>(resource: string) {
  return {
    async getAll(): Promise<ApiResponse<{ items: TModel[] }>> {
      return apiClient<ApiResponse<{ items: TModel[] }>>(
        `/api/${resource}`,
        { method: "GET" }
      );
    },

    async getById(id: Id): Promise<ApiResponse<TModel>> {
      return apiClient<ApiResponse<TModel>>(
        `/api/${resource}/${id}`,
        { method: "GET" }
      );
    },

    async create<TBody extends Partial<TModel>>(
      data: TBody
    ): Promise<ApiResponse<TModel>> {
      return apiClient<ApiResponse<TModel>, TBody>(
        `/api/${resource}`,
        {
          method: "POST",
          body: data,
        }
      );
    },

    async update<TBody extends Partial<TModel>>(
      id: Id,
      data: TBody
    ): Promise<ApiResponse<TModel>> {
      return apiClient<ApiResponse<TModel>, TBody>(
        `/api/${resource}/${id}`,
        {
          method: "PUT",
          body: data,
        }
      );
    },

    async delete(id: Id): Promise<ApiResponse<null>> {
      return apiClient<ApiResponse<null>>(
        `/api/${resource}/${id}`,
        {
          method: "DELETE",
        }
      );
    },
  };
};
