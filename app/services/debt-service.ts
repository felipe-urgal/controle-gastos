import { apiClient } from "@/app/services/api-client";
import type { ApiResponse } from "@/app/services/base-service";
import type { Debt } from "@/app/types/debt";
import type { SupportedCurrency } from "@/app/types/financial-summary";

export type DebtInput = {
  name: string;
  currency: SupportedCurrency;
  balance: number;
  installmentAmount?: number | null;
  dueDate?: string | null;
  remainingInstallments?: number | null;
  institution?: string | null;
  description?: string | null;
};

export type DebtUpdateInput = Omit<Partial<DebtInput>, "currency" | "balance"> & {
  status?: "ARCHIVED";
};

export const debtService = {
  async getAll(): Promise<ApiResponse<{ items: Debt[]; total: number }>> {
    return apiClient("/api/debts", { method: "GET" });
  },
  async getById(id: string): Promise<ApiResponse<Debt>> {
    return apiClient(`/api/debts/${id}`, { method: "GET" });
  },
  async create(input: DebtInput): Promise<ApiResponse<Debt>> {
    return apiClient("/api/debts", { method: "POST", body: input });
  },
  async update(id: string, input: DebtUpdateInput): Promise<ApiResponse<Debt>> {
    return apiClient(`/api/debts/${id}`, { method: "PUT", body: input });
  },
  async adjust(
    id: string,
    input: { newBalance: number; description?: string | null },
  ): Promise<ApiResponse<Debt>> {
    return apiClient(`/api/debts/${id}/adjustments`, {
      method: "POST",
      body: input,
    });
  },
  async pay(id: string): Promise<ApiResponse<Debt>> {
    return apiClient(`/api/debts/${id}/pay`, { method: "POST" });
  },
  async remove(id: string): Promise<ApiResponse<null>> {
    return apiClient(`/api/debts/${id}`, { method: "DELETE" });
  },
};
