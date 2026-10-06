import { apiClient } from '@/app/services/api-client';
import type { ApiResponse } from '@/app/services/base-service';
import type { DashboardHome, MonthlyDashboard } from '@/app/types/dashboard';
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
