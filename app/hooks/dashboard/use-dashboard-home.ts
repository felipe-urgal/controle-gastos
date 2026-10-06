'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { dashboardService } from '@/app/services/dashboard-service';
import type { DashboardHome } from '@/app/types/dashboard';
import type { SupportedCurrency } from '@/app/types/financial-summary';

function getInitialPeriodValue() {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
}

function parsePeriodValue(value: string) {
  const [year, month] = value.split('-').map(Number);
  return { year, month };
}

function isAbortError(error: unknown) {
  return error instanceof Error && error.name === 'AbortError';
}

export function useDashboardHome() {
  const [periodValue, setPeriodValueState] = useState(getInitialPeriodValue);
  const [currency, setCurrencyState] = useState<SupportedCurrency>('BRL');
  const [data, setData] = useState<DashboardHome | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retryVersion, setRetryVersion] = useState(0);
  const requestSequence = useRef(0);

  const period = useMemo(() => parsePeriodValue(periodValue), [periodValue]);

  useEffect(() => {
    const sequence = ++requestSequence.current;
    const controller = new AbortController();

    async function load() {
      setLoading(true);
      setError('');

      try {
        const response = await dashboardService.getHome(
          period.year,
          period.month,
          currency,
          controller.signal,
        );

        if (sequence !== requestSequence.current) return;
        setData(response.data);
      } catch (caught) {
        if (isAbortError(caught) || sequence !== requestSequence.current) {
          return;
        }

        setData(null);
        setError(
          caught instanceof Error
            ? caught.message
            : 'Erro ao carregar dashboard financeiro',
        );
      } finally {
        if (sequence === requestSequence.current) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      controller.abort();
    };
  }, [currency, period.month, period.year, retryVersion]);

  const setPeriodValue = useCallback((value: string) => {
    setData(null);
    setError('');
    setLoading(true);
    setPeriodValueState(value);
  }, []);

  const setCurrency = useCallback((value: SupportedCurrency) => {
    setData(null);
    setError('');
    setLoading(true);
    setCurrencyState(value);
  }, []);

  const retry = useCallback(() => {
    setRetryVersion((value) => value + 1);
  }, []);

  return {
    data,
    loading,
    error,
    periodValue,
    currency,
    setPeriodValue,
    setCurrency,
    retry,
  };
}
