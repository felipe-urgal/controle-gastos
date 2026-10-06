'use client';

import { useEffect, useRef, useState } from 'react';

import { forecastService } from '@/app/services/forecast-service';
import type { SupportedCurrency } from '@/app/types/financial-summary';
import type { ForecastData, ForecastHorizonDays } from '@/app/types/forecast';

export function useForecast(
  initialCurrency: SupportedCurrency = 'BRL',
  initialData: ForecastData | null = null,
) {
  const [currency, setCurrency] = useState<SupportedCurrency>(initialCurrency);
  const [days, setDays] = useState<ForecastHorizonDays>(
    initialData?.horizonDays ?? 30,
  );
  const [data, setData] = useState<ForecastData | null>(initialData);
  const [loading, setLoading] = useState(initialData === null);
  const [error, setError] = useState('');
  const skippedInitialLoad = useRef(false);

  useEffect(() => {
    if (
      !skippedInitialLoad.current &&
      initialData &&
      initialData.currency === currency &&
      initialData.horizonDays === days
    ) {
      skippedInitialLoad.current = true;
      return;
    }
    skippedInitialLoad.current = true;

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
  }, [currency, days, initialData]);

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
