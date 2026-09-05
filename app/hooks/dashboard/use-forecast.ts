'use client';

import { useEffect, useState } from 'react';

import { forecastService } from '@/app/services/forecast-service';
import type { SupportedCurrency } from '@/app/types/financial-summary';
import type { ForecastData, ForecastHorizonDays } from '@/app/types/forecast';

export function useForecast(initialCurrency: SupportedCurrency = 'BRL') {
  const [currency, setCurrency] = useState<SupportedCurrency>(initialCurrency);
  const [days, setDays] = useState<ForecastHorizonDays>(30);
  const [data, setData] = useState<ForecastData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError('');

      try {
        const response = await forecastService.get(currency, days);
        if (active) setData(response.data);
      } catch (caught) {
        if (active) {
          setData(null);
          setError(
            caught instanceof Error
              ? caught.message
              : 'Erro ao carregar projeção financeira',
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
  }, [currency, days]);

  return {
    currency,
    days,
    data,
    loading,
    error,
    setCurrency,
    setDays,
  };
}
