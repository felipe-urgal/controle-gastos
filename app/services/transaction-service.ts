import { apiClient } from "@/app/services/api-client";
import { ApiResponse, createBaseService } from "@/app/services/base-service";
import {
  CreateInstallmentTransactionInput,
  CreateInstallmentTransactionResponse,
  CreateMonthlyRecurringTransactionInput,
  CreateMonthlyRecurringTransactionResponse,
  TransactionDTO,
} from "@/app/types/transaction";
import type { CurrencyFinancialSummary } from "@/app/types/financial-summary";

export type TransactionListResponse = {
  items: TransactionDTO[];
  summary: CurrencyFinancialSummary[];
};

export type TransactionCompletionResponse = {
  id: string;
  status: "COMPLETED";
};

const baseTransactionService = createBaseService<TransactionDTO, TransactionListResponse>("transactions");

export const transactionService = {
  ...baseTransactionService,

  async complete(id: string): Promise<ApiResponse<TransactionCompletionResponse>> {
    return apiClient<ApiResponse<TransactionCompletionResponse>>(`/api/transactions/${id}/complete`, {
      method: "POST",
    });
  },

  async createMonthlyRecurring(
    data: CreateMonthlyRecurringTransactionInput
  ): Promise<ApiResponse<CreateMonthlyRecurringTransactionResponse>> {
    return apiClient<
      ApiResponse<CreateMonthlyRecurringTransactionResponse>,
      CreateMonthlyRecurringTransactionInput
    >("/api/transactions/recurring", {
      method: "POST",
      body: data,
    });
  },

  async createInstallments(
    data: CreateInstallmentTransactionInput
  ): Promise<ApiResponse<CreateInstallmentTransactionResponse>> {
    return apiClient<
      ApiResponse<CreateInstallmentTransactionResponse>,
      CreateInstallmentTransactionInput
    >("/api/transactions/installments", {
      method: "POST",
      body: data,
    });
  },
};
