import { apiClient } from "@/app/services/api-client";
import type { ApiResponse } from "@/app/services/base-service";
import type { EconomicIndicatorSnapshot } from "@/app/types/economic-indicator";

export const economicIndicatorService = {
  async getCurrent(): Promise<ApiResponse<EconomicIndicatorSnapshot>> {
    return apiClient("/api/economic-indicators", { method: "GET" });
  },
};
