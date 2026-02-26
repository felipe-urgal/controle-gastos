import { apiClient } from "@/app/services/api-client";

type Id = string;

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export function createBaseService<
  TModel,
  TListResponse = { items: TModel[] }
>(resource: string) {
  return {
    async getAll(
      query?: Record<string, string | number | undefined>
    ): Promise<ApiResponse<TListResponse>> {
      const queryString = query
        ? "?" +
          Object.entries(query)
            .filter(([_, v]) => v !== undefined)
            .map(
              ([k, v]) =>
                `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`
            )
            .join("&")
        : "";

      return apiClient<ApiResponse<TListResponse>>(
        `/api/${resource}${queryString}`,
        { method: "GET" }
      );
    },

    async getById(id: Id): Promise<ApiResponse<TModel>> {
      return apiClient<ApiResponse<TModel>>(
        `/api/${resource}/${id}`,
        { method: "GET" }
      );
    },

    async create<TBody>(
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

    async update<TBody>(
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
