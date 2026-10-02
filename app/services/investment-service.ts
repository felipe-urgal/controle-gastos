import { apiClient } from "@/app/services/api-client";
import type { ApiResponse } from "@/app/services/base-service";
import type {
  InvestmentAsset,
  InvestmentAssetType,
  InvestmentOperation,
  InvestmentOperationType,
  InvestmentPortfolio,
  InvestmentQuoteRefreshResult,
} from "@/app/types/investment";
import type { SupportedCurrency } from "@/app/types/financial-summary";

export type InvestmentAssetInput = {
  symbol: string;
  name?: string | null;
  type: InvestmentAssetType;
  currency: SupportedCurrency;
  market?: string | null;
};

export type InvestmentOperationInput = {
  type: InvestmentOperationType;
  accountId: string;
  assetId: string;
  quantity: string;
  unitPriceCents: number;
  feesCents?: number;
  date: string;
  note?: string | null;
};

export const investmentService = {
  async getPortfolio(): Promise<ApiResponse<InvestmentPortfolio>> {
    return apiClient("/api/investments", { method: "GET" });
  },
  async createAsset(
    input: InvestmentAssetInput,
  ): Promise<ApiResponse<InvestmentAsset>> {
    return apiClient("/api/investments/assets", {
      method: "POST",
      body: input,
    });
  },
  async removeAsset(id: string): Promise<ApiResponse<null>> {
    return apiClient(`/api/investments/assets/${id}`, {
      method: "DELETE",
    });
  },
  async createOperation(
    input: InvestmentOperationInput,
  ): Promise<ApiResponse<InvestmentOperation>> {
    return apiClient("/api/investments/operations", {
      method: "POST",
      body: input,
    });
  },
  async removeOperation(id: string): Promise<ApiResponse<null>> {
    return apiClient(`/api/investments/operations/${id}`, {
      method: "DELETE",
    });
  },
  async refreshQuotes(): Promise<ApiResponse<InvestmentQuoteRefreshResult>> {
    return apiClient("/api/investments/quotes/refresh", { method: "POST" });
  },
};
