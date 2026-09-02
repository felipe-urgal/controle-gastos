import { apiClient } from '@/app/services/api-client';
import type { ApiResponse } from '@/app/services/base-service';
import type { MonthlyDashboard } from '@/app/types/dashboard';
import type { SupportedCurrency } from '@/app/types/financial-summary';

export const dashboardService = {
  async getMonthly(
    year: number,
    month: number,
    currency: SupportedCurrency,
  ): Promise<ApiResponse<MonthlyDashboard>> {
    return apiClient<ApiResponse<MonthlyDashboard>>('/api/dashboard', {
      method: 'GET',
      queryParams: { year, month, currency },
    });
  },
};
