import { apiClient } from "@/app/services/api-client";
import type { ApiResponse } from "@/app/services/base-service";
import type { NetWorthData } from "@/app/types/net-worth";

export const netWorthService = {
  async get(args: {
    year: number;
    month: number;
    months?: number;
    consolidateTo?: "BRL" | "USD" | "EUR";
  }): Promise<ApiResponse<NetWorthData>> {
    return apiClient("/api/net-worth", {
      method: "GET",
      queryParams: {
        year: args.year,
        month: args.month,
        months: args.months ?? 12,
        consolidateTo: args.consolidateTo,
      },
    });
  },
};
