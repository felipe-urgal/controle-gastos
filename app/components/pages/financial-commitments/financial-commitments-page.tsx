'use client';

import { PageContainer, PageTitle } from '@/app/components/base-pages';
import { ProtectedRoute } from '@/app/components/layout';
import { useEffect, useState } from 'react';

import { PageError, PageLoading } from '@/app/components/feedback';
import FinancialCommitmentsView from '@/app/components/pages/financial-commitments/financial-commitments-view';
import { Chip, CurrencySelect } from '@/app/components/ui';
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
        <div className="grid gap-2 sm:justify-items-end">
            <div className="flex flex-wrap gap-2" role="group" aria-label="Horizonte">
              {HORIZONS.map((option) => (
                <Chip
                  key={option}
                  selected={days === option}
                  onClick={() => {
                    beginReload();
                    setDays(option);
                  }}
                >
                  {option} dias
                </Chip>
              ))}
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
      <PageTitle title="Compromissos financeiros" sidebarAligned />
      <div className="mt-4">{headerControls}</div>

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
