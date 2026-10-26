'use client';

import { PageContainer, PageTitle } from '@/app/components/base-pages';
import { ProtectedRoute } from '@/app/components/layout';
import { useEffect, useState } from 'react';

import { PageError, PageLoading } from '@/app/components/feedback';
import FinancialCommitmentsView from '@/app/components/pages/financial-commitments/financial-commitments-view';
import { CurrencySelect, Select, ShowBelow, ShowFrom } from '@/app/components/ui';
import { useAuth } from '@/app/context';
import { financialCommitmentsService } from '@/app/services/financial-commitments-service';
import type { FinancialCommitmentsData } from '@/app/types/financial-commitment';
import type { SupportedCurrency } from '@/app/types/financial-summary';

const HORIZONS = [7, 30, 60, 90] as const;

export default function FinancialCommitmentsPage() {
  const { user } = useAuth();
  const showValues = user?.showValues !== false;
  const [currency, setCurrency] = useState<SupportedCurrency>('BRL');
  const [days, setDays] = useState<(typeof HORIZONS)[number]>(30);
  const [data, setData] = useState<FinancialCommitmentsData | null>(null);
  const [error, setError] = useState('');
  const [requestKey, setRequestKey] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    financialCommitmentsService.get(currency, days)
      .then((response) => {
        if (!active) return;
        setData(response.data);
      })
      .catch((cause) => {
        if (!active) return;
        setData(null);
        setError(cause instanceof Error ? cause.message : 'Erro ao carregar compromissos');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [currency, days, requestKey]);

  function beginReload() {
    setLoading(true);
    setError('');
    setData(null);
  }

  const headerControls = (
    <div className="flex flex-wrap items-center gap-2.5">
      <div className="min-w-0 flex-1 sm:w-[190px] sm:flex-none">
        <Select
          ariaLabel="Horizonte"
          value={days}
          onChange={(value) => {
            beginReload();
            setDays(Number(value) as (typeof HORIZONS)[number]);
          }}
          options={HORIZONS.map((option) => ({ value: option, label: `Próximos ${option} dias` }))}
        />
      </div>
      <CurrencySelect
        value={currency}
        onChange={(option) => {
          beginReload();
          setCurrency(option);
        }}
      />
    </div>
  );

  return (
    <ProtectedRoute>
    <PageContainer as="section">
      <PageTitle title="Compromissos financeiros" sidebarAligned actions={<ShowFrom breakpoint="lg">{headerControls}</ShowFrom>} />
      <ShowBelow breakpoint="lg">
        <div className="mt-4">{headerControls}</div>
      </ShowBelow>

      {error && (
        <PageError
          message={error}
          buttonText="Tentar novamente"
          onRetry={() => {
            beginReload();
            setRequestKey((value) => value + 1);
          }}
        />
      )}

      <div className="mt-5">
        {loading && !data ? (
          <PageLoading />
        ) : data && !error ? (
          <FinancialCommitmentsView data={data} showValues={showValues} />
        ) : null}
      </div>
    </PageContainer>
    </ProtectedRoute>
  );
}
