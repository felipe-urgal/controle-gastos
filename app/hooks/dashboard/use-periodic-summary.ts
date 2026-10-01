'use client';

import { useEffect, useState } from 'react';

import { periodicSummaryService } from '@/app/services/periodic-summary-service';
import type { SupportedCurrency } from '@/app/types/financial-summary';
import type { PeriodicFinancialSummaryState } from '@/app/types/periodic-financial-summary';

export function usePeriodicSummary(currency: SupportedCurrency) {
  const [data, setData] = useState<PeriodicFinancialSummaryState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError('');

      try {
        const response = await periodicSummaryService.get(currency);
        if (active) setData(response.data);
      } catch (caught) {
        if (active) {
          setData(null);
          setError(
            caught instanceof Error
              ? caught.message
              : 'Não foi possível carregar o resumo semanal.',
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [currency]);

  return { data, loading, error };
}
