import { apiClient } from '@/app/services/api-client';
import type { ApiResponse } from '@/app/services/base-service';
import type { FinancialInsightsData } from '@/app/types/financial-insight';
import type { SupportedCurrency } from '@/app/types/financial-summary';

export const financialInsightsService = {
  async get(
    year: number,
    month: number,
    currency: SupportedCurrency,
  ): Promise<ApiResponse<FinancialInsightsData>> {
    return apiClient<ApiResponse<FinancialInsightsData>>('/api/insights', {
      method: 'GET',
      queryParams: { year, month, currency },
    });
  },
};
