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
      year = "",
      category = "",
      account = "",
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
        year,
        category,
        account
      },
    });
  },

  async getTransactionById(id: string): Promise<TransactionModel> {
    return apiClient<TransactionModel>(`/api/transactions/${id}`, {
      method: "GET",
    });
  },

  async createTransaction(data: Omit<TransactionFormData, "id">): Promise<TransactionModel> {
    return apiClient<TransactionModel, Omit<TransactionFormData, "id">>(`/api/transactions`, {
      method: "POST",
      body: data,
    });
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

  async deleteTransactionBatch(ids: string[]): Promise<{ success: boolean; message: string; count?: number }> {
    return apiClient<{ success: boolean, message: string }, { ids: string[] }>(`/api/transactions`, { method: "DELETE", body: { ids } });
  },

  async importTransactions(file: File, userId: string): Promise<{ 
  success: boolean; 
    message: string; 
    details?: { errors: string[], logId: string, errorCount: number }
  }> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('userId', userId);

    return apiClient(`/api/transactions/import`, {
      method: 'POST',
      body: formData,
      headers: {}
    });
  },
};