import { apiClient } from '@/app/services/api-client';
import type { ApiResponse } from '@/app/services/base-service';
import type { FinancialComparisonData } from '@/app/types/financial-comparison';
import type { SupportedCurrency } from '@/app/types/financial-summary';

export const financialComparisonService = {
  get(params: { aFrom: string; aTo: string; bFrom: string; bTo: string; currency: SupportedCurrency }) {
    return apiClient<ApiResponse<FinancialComparisonData>>('/api/financial-comparison', { queryParams: params });
  },
};
