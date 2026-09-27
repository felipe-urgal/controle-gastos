import { apiClient } from "@/app/services/api-client";
import type { ApiResponse } from "@/app/services/base-service";
import type {
  FinancialGoal,
  FinancialGoalEntryType,
  FinancialGoalStatus,
} from "@/app/types/financial-goal";
import type { SupportedCurrency } from "@/app/types/financial-summary";

export type FinancialGoalInput = {
  name: string;
  targetAmount: number;
  currency: SupportedCurrency;
  targetDate?: string | null;
  description?: string | null;
  accountId?: string | null;
};

export const financialGoalService = {
  async getAll(query?: {
    status?: FinancialGoalStatus;
    currency?: SupportedCurrency;
  }): Promise<ApiResponse<{ items: FinancialGoal[]; total: number }>> {
    const params = new URLSearchParams();
    if (query?.status) params.set("status", query.status);
    if (query?.currency) params.set("currency", query.currency);
    const suffix = params.size ? `?${params.toString()}` : "";
    return apiClient(`/api/goals${suffix}`, { method: "GET" });
  },

  async getById(id: string): Promise<ApiResponse<FinancialGoal>> {
    return apiClient(`/api/goals/${id}`, { method: "GET" });
  },

  async create(input: FinancialGoalInput): Promise<ApiResponse<FinancialGoal>> {
    return apiClient("/api/goals", { method: "POST", body: input });
  },

  async update(
    id: string,
    input: Partial<FinancialGoalInput> & {
      status?: "ACTIVE" | "ARCHIVED";
    },
  ): Promise<ApiResponse<FinancialGoal>> {
    return apiClient(`/api/goals/${id}`, { method: "PUT", body: input });
  },

  async remove(id: string): Promise<ApiResponse<null>> {
    return apiClient(`/api/goals/${id}`, { method: "DELETE" });
  },

  async addEntry(
    id: string,
    input: {
      type: FinancialGoalEntryType;
      amount: number;
      description?: string | null;
    },
  ) {
    return apiClient(`/api/goals/${id}/entries`, {
      method: "POST",
      body: input,
    });
  },
};
