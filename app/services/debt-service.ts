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
  status?: "ACTIVE" | "ARCHIVED";
};

export type DebtPaymentInput = {
  amount: number;
  description?: string | null;
  effectiveDate?: string;
  transactionId?: string | null;
};

export const debtService = {
  async getAll(): Promise<ApiResponse<{ items: Debt[]; total: number }>> {
    return apiClient("/api/debts", { method: "GET" });
  },
  async getById(
    id: string,
    query?: { page?: number; limit?: number },
  ): Promise<ApiResponse<Debt>> {
    return apiClient(`/api/debts/${id}`, {
      method: "GET",
      queryParams: {
        ...(query?.page ? { page: query.page } : {}),
        ...(query?.limit ? { limit: query.limit } : {}),
      },
    });
  },
  async create(input: DebtInput): Promise<ApiResponse<Debt>> {
    return apiClient("/api/debts", { method: "POST", body: input });
  },
  async update(id: string, input: DebtUpdateInput): Promise<ApiResponse<Debt>> {
    return apiClient(`/api/debts/${id}`, { method: "PUT", body: input });
  },
  async adjust(
    id: string,
    input: {
      newBalance: number;
      description?: string | null;
      effectiveDate?: string;
    },
  ): Promise<ApiResponse<Debt>> {
    return apiClient(`/api/debts/${id}/adjustments`, {
      method: "POST",
      body: input,
    });
  },
  async pay(
    id: string,
    input: DebtPaymentInput,
    idempotencyKey: string,
  ): Promise<ApiResponse<Debt>> {
    return apiClient(`/api/debts/${id}/pay`, {
      method: "POST",
      body: input,
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": idempotencyKey,
      },
    });
  },
  async remove(id: string): Promise<ApiResponse<null>> {
    return apiClient(`/api/debts/${id}`, { method: "DELETE" });
  },
};
