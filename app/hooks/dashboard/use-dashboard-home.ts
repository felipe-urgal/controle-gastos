'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  DEFAULT_DASHBOARD_CURRENCY,
  parseDashboardUrlState,
} from '@/app/components/pages/dashboard/dashboard/dashboard-helpers';
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

/** Período e moeda ficam na URL (`?m=2026-10&c=USD`): compartilháveis e preservados no F5 e no voltar. */
export function useDashboardHome() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchKey = searchParams.toString();
  const { period: periodValue, currency } = useMemo(
    () => parseDashboardUrlState(new URLSearchParams(searchKey), getInitialPeriodValue()),
    [searchKey],
  );
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

  // Os dados anteriores continuam na tela (esmaecidos) até os novos chegarem; só falha limpa.
  const navigate = useCallback(
    (nextPeriod: string, nextCurrency: SupportedCurrency) => {
      const next = new URLSearchParams();
      next.set('m', nextPeriod);
      if (nextCurrency !== DEFAULT_DASHBOARD_CURRENCY) next.set('c', nextCurrency);
      router.replace(`${pathname}?${next.toString()}`, { scroll: false });
    },
    [pathname, router],
  );

  const setPeriodValue = useCallback(
    (value: string) => navigate(value, currency),
    [currency, navigate],
  );

  const setCurrency = useCallback(
    (value: SupportedCurrency) => navigate(periodValue, value),
    [navigate, periodValue],
  );

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
