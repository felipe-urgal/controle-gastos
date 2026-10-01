import { apiClient } from '@/app/services/api-client';
import type { ApiResponse } from '@/app/services/base-service';
import type { SupportedCurrency } from '@/app/types/financial-summary';
import type { PeriodicFinancialSummaryState } from '@/app/types/periodic-financial-summary';

export const periodicSummaryService = {
  async get(currency: SupportedCurrency): Promise<ApiResponse<PeriodicFinancialSummaryState>> {
    return apiClient<ApiResponse<PeriodicFinancialSummaryState>>('/api/periodic-summary', {
      method: 'GET',
      queryParams: { currency },
    });
  },
};
