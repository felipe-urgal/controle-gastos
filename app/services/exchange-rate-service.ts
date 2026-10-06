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
  async getAll(args: {
    page?: number;
    limit?: number;
    from?: ExchangeRateModel['from'];
    to?: ExchangeRateModel['to'];
  } = {}): Promise<ApiResponse<ExchangeRateListData>> {
    return apiClient<ApiResponse<ExchangeRateListData>>('/api/exchange-rates', {
      method: 'GET',
      queryParams: {
        page: args.page ?? 1,
        limit: args.limit ?? 10,
        ...(args.from ? { from: args.from } : {}),
        ...(args.to ? { to: args.to } : {}),
      },
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

  async fetchPtax(input: Pick<ManualExchangeRateInput, 'from' | 'to' | 'referenceDate'> & {
    quoteSide?: 'BUY' | 'SELL';
  }): Promise<ApiResponse<ExchangeRateModel>> {
    return apiClient<
      ApiResponse<ExchangeRateModel>,
      Pick<ManualExchangeRateInput, 'from' | 'to' | 'referenceDate'> & {
        quoteSide?: 'BUY' | 'SELL';
      }
    >('/api/exchange-rates/ptax', {
      method: 'POST',
      body: input,
    });
  },

  async remove(id: string): Promise<ApiResponse<null>> {
    return apiClient<ApiResponse<null>>(`/api/exchange-rates/${id}`, {
      method: 'DELETE',
    });
  },
};
