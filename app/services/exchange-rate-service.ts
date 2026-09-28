import { apiClient } from '@/app/services/api-client';
import type { ApiResponse } from '@/app/services/base-service';
import type {
  ExchangeRateListData,
  ExchangeRateModel,
} from '@/app/types/exchange-rate';

type ManualExchangeRateInput = {
  from: ExchangeRateModel['from'];
  to: ExchangeRateModel['to'];
  numerator: number;
  denominator: number;
  referenceDate: ExchangeRateModel['referenceDate'];
};

export const exchangeRateService = {
  async getAll(): Promise<ApiResponse<ExchangeRateListData>> {
    return apiClient<ApiResponse<ExchangeRateListData>>('/api/exchange-rates', {
      method: 'GET',
    });
  },

  async save(
    input: ManualExchangeRateInput,
  ): Promise<ApiResponse<ExchangeRateModel>> {
    return apiClient<ApiResponse<ExchangeRateModel>, ManualExchangeRateInput>(
      '/api/exchange-rates',
      { method: 'POST', body: input },
    );
  },

  async remove(id: string): Promise<ApiResponse<null>> {
    return apiClient<ApiResponse<null>>(`/api/exchange-rates/${id}`, {
      method: 'DELETE',
    });
  },
};
