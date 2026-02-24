import { apiClient } from "./apiClient";
import { AccountModel, AccountResponse } from '@/app/types/account'

export const accountService = {
  async getAccounts(): Promise<AccountResponse> {
    return apiClient<AccountResponse>(`/api/account`, {
      method: "GET",
    });
  },

  async createAccount(data: Omit<AccountModel, "id">): Promise<AccountModel> {
    return apiClient<AccountModel, Omit<AccountModel, "id">>(`/api/account`, {
      method: "POST",
      body: data,
    });
  },

  async updateAccount(id: string, data: Partial<AccountModel>): Promise<AccountModel> {
    return apiClient<AccountModel, Partial<AccountModel>>(
      `/api/account/${id}`,
      {
        method: "PUT",
        body: data,
      }
    );
  },

  async deleteAccount(id: string): Promise<{ success: boolean }> {
    return apiClient<{ success: boolean }>(
      `/api/account/${id}`,
      {
        method: "DELETE",
      }
    );
  },

  async getAccountById(id: string): Promise<AccountModel> {
    return apiClient<AccountModel>(`/api/account/${id}`, {
      method: "GET",
    });
  }
};
