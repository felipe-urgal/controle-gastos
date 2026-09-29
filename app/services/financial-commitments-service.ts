import { apiClient } from '@/app/services/api-client';
import type { ApiResponse } from '@/app/services/base-service';
import type { FinancialCommitmentsData } from '@/app/types/financial-commitment';
import type { SupportedCurrency } from '@/app/types/financial-summary';

export const financialCommitmentsService = {
  get(currency: SupportedCurrency, days: 7 | 30 | 60 | 90) {
    return apiClient<ApiResponse<FinancialCommitmentsData>>('/api/commitments', {
      queryParams: { currency, days },
    });
  },
};
