import { apiClient } from "./apiClient";
import { InvestmentModel, InvestmentResponse, GetInvestmentParams, InvestmentFormData } from '@/app/types/investment'

export const investmentService = {
  async getInvestments(
    userId: string,
    { 
      page = "1", 
      limit = "8", 
      search = "", 
      type = "", 
      account = "",
    }: GetInvestmentParams = {}
  ): Promise<InvestmentResponse> {
    return apiClient<InvestmentResponse>(`/api/investments`, {
      method: "GET",
      queryParams: { 
        userId, 
        page, 
        limit, 
        search, 
        type,
        account
      },
    });
  },

  async getInvestmentById(id: string): Promise<InvestmentModel> {
    return apiClient<InvestmentModel>(`/api/investments/${id}`, {
      method: "GET",
    });
  },

  async createInvestment(data: Omit<InvestmentFormData, "id">): Promise<InvestmentModel> {
    return apiClient<InvestmentModel, Omit<InvestmentFormData, "id">>(`/api/investments`, {
      method: "POST",
      body: data,
    });
  },

  async updateInvestment(data: InvestmentFormData): Promise<InvestmentModel> {
    return apiClient<InvestmentModel, InvestmentFormData>(`/api/investments`, {
      method: "PUT",
      body: data,
    });
  },

  async deleteInvestment(id: string): Promise<{ success: boolean, message: string }> {
    return apiClient<{ success: boolean, message: string }, { id: string }>(`/api/investments`, {
      method: "DELETE",
      body: { id },
    });
  },

  async deleteInvestmentBatch(ids: string[]): Promise<{ success: boolean; message: string; count?: number }> {
    return apiClient<{ success: boolean, message: string }, { ids: string[] }>(`/api/investments`, { method: "DELETE", body: { ids } });
  },

  async importInvestments(file: File, userId: string): Promise<{ 
  success: boolean; 
    message: string; 
    details?: { errors: string[], logId: string, errorCount: number }
  }> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('userId', userId);

    return apiClient(`/api/investments/import`, {
      method: 'POST',
      body: formData,
      headers: {}
    });
  },
};