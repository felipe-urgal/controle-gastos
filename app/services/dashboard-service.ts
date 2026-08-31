import { apiClient } from '@/app/services/api-client';
import type { ApiResponse } from '@/app/services/base-service';
import type { MonthlyDashboard } from '@/app/types/dashboard';

export const dashboardService = {
  async getMonthly(year: number, month: number): Promise<ApiResponse<MonthlyDashboard>> {
    return apiClient<ApiResponse<MonthlyDashboard>>('/api/dashboard', {
      method: 'GET',
      queryParams: { year, month },
    });
  },
};
