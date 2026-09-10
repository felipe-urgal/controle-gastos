import { apiClient } from "@/app/services/api-client";
import type { ApiResponse } from "@/app/services/base-service";
import type {
  CreateTransferInput,
  CreateTransferResponse,
} from "@/app/types/transfer";

export const transferService = {
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
};
