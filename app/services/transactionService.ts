import { apiClient } from "./apiClient";
import { TransactionShowResponse, TransactionModel, TransactionResponse, GetTransactionsParams, TransactionFormData } from '@/app/types/transaction'

export const transactionService = {
  async getTransactions(
    userId: string,
    { 
      month = "",
      year = "",
      account = "",
      day = "",
      status = ""
    }: GetTransactionsParams & { status?: string } = {}
  ): Promise<TransactionResponse> {
    return apiClient<TransactionResponse>(`/api/transactions`, {
      method: "GET",
      queryParams: { 
        userId, 
        month,
        year,
        account,
        day,
        status
      },
    });
  },

  async createTransaction(data: Omit<TransactionFormData, "id">): Promise<TransactionModel> {
    const result = await apiClient<TransactionModel, Omit<TransactionFormData, "id">>(`/api/transactions`, {
      method: "POST",
      body: data,
    });
    return result;
  },

  async updateTransaction(data: TransactionFormData): Promise<TransactionModel> {
    return apiClient<TransactionModel, TransactionFormData>(`/api/transactions`, {
      method: "PUT",
      body: data,
    });
  },

  async deleteTransaction(id: string): Promise<{ success: boolean, message: string }> {
    return apiClient<{ success: boolean, message: string }, { id: string }>(`/api/transactions`, {
      method: "DELETE",
      body: { id },
    });
  },

  async getTransactionById(id: string): Promise<TransactionShowResponse> {
    return apiClient<TransactionShowResponse>(`/api/transactions/${id}`, {
      method: "GET",
    });
  }
};