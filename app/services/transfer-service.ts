import { apiClient } from "@/app/services/api-client";
import type { ApiResponse } from "@/app/services/base-service";
import type {
  CreateTransferInput,
  CreateTransferResponse,
  TransferDTO,
  TransferMutationResponse,
  UpdateTransferInput,
} from "@/app/types/transfer";

export const transferService = {
  async getById(id: string): Promise<ApiResponse<TransferDTO>> {
    return apiClient<ApiResponse<TransferDTO>>(
      `/api/transfers/${id}`,
      { method: "GET" },
    );
  },

  async create(
    data: CreateTransferInput,
    idempotencyKey: string,
  ): Promise<ApiResponse<CreateTransferResponse>> {
    return apiClient<ApiResponse<CreateTransferResponse>, CreateTransferInput>(
      "/api/transfers",
      {
        method: "POST",
        body: data,
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey,
        },
      },
    );
  },

  async update(
    id: string,
    data: UpdateTransferInput,
  ): Promise<ApiResponse<TransferMutationResponse>> {
    return apiClient<ApiResponse<TransferMutationResponse>, UpdateTransferInput>(
      `/api/transfers/${id}`,
      { method: "PATCH", body: data },
    );
  },

  async delete(id: string): Promise<ApiResponse<TransferMutationResponse>> {
    return apiClient<ApiResponse<TransferMutationResponse>>(
      `/api/transfers/${id}`,
      { method: "DELETE" },
    );
  },
};
