import { apiClient } from "./apiClient";
import { TransactionModel, TransactionResponse, GetTransactionsParams, TransactionFormData } from '@/app/types/transaction'

export const transactionService = {
  async getTransactions(
    userId: string,
    { 
      page = "1", 
      limit = "8", 
      search = "", 
      type = "", 
      month = "",
      year = ""
    }: GetTransactionsParams = {}
  ): Promise<TransactionResponse> {
    return apiClient<TransactionResponse>(`/api/transactions`, {
      method: "GET",
      queryParams: { 
        userId, 
        page, 
        limit, 
        search, 
        type,
        month,
        year
      },
    });
  },

  async getTransactionById(id: string): Promise<TransactionModel> {
    return apiClient<TransactionModel>(`/api/transactions/${id}`, {
      method: "GET",
    });
  },

  async createTransaction(data: Omit<TransactionFormData, "id">): Promise<TransactionModel> {
    return apiClient<TransactionModel>(`/api/transactions`, {
      method: "POST",
      body: data,
    });
  },

  async updateTransaction(data: TransactionFormData): Promise<TransactionFormData> {
    return apiClient<TransactionFormData>(`/api/transactions`, {
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
};