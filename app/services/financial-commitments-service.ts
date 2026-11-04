import { apiClient } from '@/app/services/api-client';
import type { ApiResponse } from '@/app/services/base-service';
import type { FinancialCommitmentsData } from '@/app/types/financial-commitment';
import type { SupportedCurrency } from '@/app/types/financial-summary';

/** Nome do arquivo que o servidor sugeriu, ou um padrão. */
function icsFilename(response: Response, days: number) {
  const header = response.headers.get('content-disposition') ?? '';
  return /filename="([^"]+)"/.exec(header)?.[1] ?? `compromissos-${days}-dias.ics`;
}

export const financialCommitmentsService = {
  get(currency: SupportedCurrency, days: 7 | 30 | 60 | 90) {
    return apiClient<ApiResponse<FinancialCommitmentsData>>('/api/commitments', {
      queryParams: { currency, days },
    });
  },

  /** Baixa os compromissos como .ics (agenda). `showValues: false` deixa os valores de fora do arquivo. */
  async exportIcs(currency: SupportedCurrency, days: 7 | 30 | 60 | 90, showValues: boolean) {
    const query = new URLSearchParams({ currency, days: String(days), ...(showValues ? {} : { values: '0' }) });
    const response = await fetch(`/api/commitments/ics?${query}`, { credentials: 'include' });
    if (!response.ok) {
      let message = 'Não foi possível exportar os compromissos.';
      try {
        const body = (await response.json()) as { error?: { message?: string }; message?: string };
        message = body?.error?.message || body?.message || message;
      } catch {
        // Mantém a mensagem padrão quando o corpo não é JSON.
      }
      throw new Error(message);
    }

    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = icsFilename(response, days);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
  },
};
