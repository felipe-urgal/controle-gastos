import { apiClient } from '@/app/services/api-client';
import type { ApiResponse } from '@/app/services/base-service';
import type { DashboardHome } from '@/app/types/dashboard';
import type { SupportedCurrency } from '@/app/types/financial-summary';

export const dashboardService = {
  async getHome(
    year: number,
    month: number,
    currency: SupportedCurrency,
    signal?: AbortSignal,
  ): Promise<ApiResponse<DashboardHome>> {
    return apiClient<ApiResponse<DashboardHome>>('/api/dashboard/home', {
      method: 'GET',
      queryParams: { year, month, currency },
      signal,
    });
  },
};
