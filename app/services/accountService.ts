import { apiClient } from "./apiClient";
import { AccountModel, AccountResponse, GetAccountsParams } from '@/app/types/account'

export const accountService = {
  async getAccounts(
    userId: string,
    { search = "", type = "" }: GetAccountsParams = {}
  ): Promise<AccountResponse> {
    return apiClient<AccountResponse>(`/api/account`, {
      method: "GET",
      queryParams: { userId, search, type },
    });
  },

  async createAccount(data: Omit<AccountModel, "id">): Promise<AccountModel> {
    return apiClient<AccountModel, Omit<AccountModel, "id">>(`/api/account`, {
      method: "POST",
      body: data,
    });
  },

  async updateAccount(data: AccountModel): Promise<AccountModel> {
    return apiClient<AccountModel, AccountModel>(`/api/account`, {
      method: "PUT",
      body: data,
    });
  },

  async deleteAccount(id: string): Promise<{ success: boolean, message: string }> {
    return apiClient<{ success: boolean, message: string }, { id: string }>(`/api/account`, {
      method: "DELETE",
      body: { id },
    });
  },

  async getAccountById(id: string): Promise<AccountModel> {
    return apiClient<AccountModel>(`/api/account/${id}`, {
      method: "GET",
    });
  }
};