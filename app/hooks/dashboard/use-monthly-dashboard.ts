'use client';

import { useEffect, useMemo, useState } from 'react';

import { dashboardService } from '@/app/services/dashboard-service';
import type { MonthlyDashboard } from '@/app/types/dashboard';
import type { SupportedCurrency } from '@/app/types/financial-summary';

function getInitialPeriodValue() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function parsePeriodValue(value: string) {
  const [year, month] = value.split('-').map(Number);
  return { year, month };
}

export function useMonthlyDashboard() {
  const [periodValue, setPeriodValue] = useState(getInitialPeriodValue);
  const [currency, setCurrency] = useState<SupportedCurrency>('BRL');
  const [data, setData] = useState<MonthlyDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const period = useMemo(() => parsePeriodValue(periodValue), [periodValue]);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setError('');

      try {
        const response = await dashboardService.getMonthly(period.year, period.month, currency);
        if (active) setData(response.data);
      } catch (caught) {
        if (active) {
          setData(null);
          setError(
            caught instanceof Error
              ? caught.message
              : 'Erro ao carregar dashboard financeiro',
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, [currency, period.month, period.year]);

  return {
    data,
    loading,
    error,
    periodValue,
    currency,
    setPeriodValue,
    setCurrency,
  };
}
