import { apiClient } from '@/app/services/api-client';
import type { ApiResponse } from '@/app/services/base-service';
import type { SupportedCurrency } from '@/app/types/financial-summary';
import type { MonthlyClosingData } from '@/app/types/monthly-closing';

export const monthlyClosingService = {
  get(params: { year: number; month: number; currency: SupportedCurrency }) {
    return apiClient<ApiResponse<MonthlyClosingData>>('/api/monthly-closing', {
      queryParams: params,
    });
  },
};
