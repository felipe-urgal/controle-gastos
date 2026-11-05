import { apiClient } from "@/app/services/api-client";
import type { ApiResponse } from "@/app/services/base-service";
import type { NetWorthData, NetWorthRealReturnData } from "@/app/types/net-worth";
import type { SupportedCurrency } from "@/app/types/financial-summary";

export type NetWorthTarget = { currency: SupportedCurrency; amount: number };

export const netWorthService = {
  async get(args: {
    year: number;
    month: number;
    months?: number;
    baseCurrency?: "BRL" | "USD" | "EUR";
    includeRealEvolution?: boolean;
  }): Promise<ApiResponse<NetWorthData>> {
    return apiClient("/api/net-worth", {
      method: "GET",
      queryParams: {
        year: args.year,
        month: args.month,
        months: args.months ?? 12,
        ...(args.baseCurrency ? { baseCurrency: args.baseCurrency } : {}),
        ...(args.includeRealEvolution ? { includeRealEvolution: "1" } : {}),
      },
    });
  },

  async getRealReturn(args: {
    year: number;
    month: number;
    months?: number;
  }): Promise<ApiResponse<NetWorthRealReturnData>> {
    return apiClient("/api/net-worth/real-return", {
      method: "GET",
      queryParams: {
        year: args.year,
        month: args.month,
        months: args.months ?? 12,
      },
    });
  },

  getTargets(): Promise<ApiResponse<NetWorthTarget[]>> {
    return apiClient("/api/net-worth/target", { method: "GET" });
  },

  saveTarget(target: NetWorthTarget): Promise<ApiResponse<NetWorthTarget>> {
    return apiClient("/api/net-worth/target", { method: "PUT", body: target });
  },

  removeTarget(currency: SupportedCurrency): Promise<ApiResponse<{ currency: SupportedCurrency }>> {
    return apiClient("/api/net-worth/target", { method: "DELETE", body: { currency } });
  },
};
