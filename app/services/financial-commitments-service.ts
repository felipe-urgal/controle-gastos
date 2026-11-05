import { apiClient } from '@/app/services/api-client';
import { downloadServerFile } from '@/app/services/download-file';
import type { ApiResponse } from '@/app/services/base-service';
import type { FinancialCommitmentsData } from '@/app/types/financial-commitment';
import type { SupportedCurrency } from '@/app/types/financial-summary';

export const financialCommitmentsService = {
  get(currency: SupportedCurrency, days: 7 | 30 | 60 | 90) {
    return apiClient<ApiResponse<FinancialCommitmentsData>>('/api/commitments', {
      queryParams: { currency, days },
    });
  },

  /** Baixa os compromissos como .ics (agenda). `showValues: false` deixa os valores de fora do arquivo. */
  async exportIcs(currency: SupportedCurrency, days: 7 | 30 | 60 | 90, showValues: boolean) {
    const query = new URLSearchParams({ currency, days: String(days), ...(showValues ? {} : { values: '0' }) });
    await downloadServerFile(
      `/api/commitments/ics?${query}`,
      `compromissos-${days}-dias.ics`,
      'Não foi possível exportar os compromissos.',
    );
  },
};
