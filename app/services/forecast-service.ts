import { apiClient } from '@/app/services/api-client';
import type { ApiResponse } from '@/app/services/base-service';
import type { SupportedCurrency } from '@/app/types/financial-summary';
import type { ForecastData, ForecastHorizonDays } from '@/app/types/forecast';

export const forecastService = {
  async get(
    currency: SupportedCurrency,
    days: ForecastHorizonDays,
  ): Promise<ApiResponse<ForecastData>> {
    return apiClient<ApiResponse<ForecastData>>('/api/forecast', {
      method: 'GET',
      queryParams: { currency, days },
    });
  },
};
