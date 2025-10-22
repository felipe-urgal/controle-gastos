import { apiClient } from "./apiClient";
import { TransactionModel, TransactionResponse, GetTransactionsParams, TransactionFormData } from '@/app/types/transaction'

export const transactionService = {
  async getTransactions(
    userId: string,
    { 
      search = "", 
      type = "", 
      month = "",
      year = "",
      category = "",
      account = "",
      day = "",
    }: GetTransactionsParams = {}
  ): Promise<TransactionResponse> {
    return apiClient<TransactionResponse>(`/api/transactions`, {
      method: "GET",
      queryParams: { 
        userId, 
        search, 
        type,
        month,
        year,
        category,
        account,
        day
      },
    });
  },

  async createTransaction(data: Omit<TransactionFormData, "id">): Promise<TransactionModel> {
    console.log('🔍 transactionService.createTransaction chamado com:', data);
    
    const result = await apiClient<TransactionModel, Omit<TransactionFormData, "id">>(`/api/transactions`, {
      method: "POST",
      body: data,
    });

    console.log('🔍 transactionService.createTransaction retornou:', result);
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
};