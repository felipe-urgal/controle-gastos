import { apiClient } from "@/app/services/api-client";
import { ApiResponse, createBaseService } from "@/app/services/base-service";
import { TransactionDTO } from "@/app/types/transaction";

export type TransactionListResponse = {
  items: TransactionDTO[];
  summary: {
    income: number;
    expense: number;
    balance: number;
  };
};

const baseTransactionService = createBaseService<TransactionDTO, TransactionListResponse>("transactions");

export const transactionService = {
  ...baseTransactionService,

  async complete(id: string): Promise<ApiResponse<TransactionDTO>> {
    return apiClient<ApiResponse<TransactionDTO>>(`/api/transactions/${id}/complete`, {
      method: "POST",
    });
  },
};
