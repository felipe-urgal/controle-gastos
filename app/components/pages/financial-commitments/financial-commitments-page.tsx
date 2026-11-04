'use client';

import { PageContainer, PageTitle } from '@/app/components/base-pages';
import { ProtectedRoute } from '@/app/components/layout';
import { useEffect, useState } from 'react';

import { PageError, PageLoading } from '@/app/components/feedback';
import FinancialCommitmentsView from '@/app/components/pages/financial-commitments/financial-commitments-view';
import { CurrencySelect, Select, ShowBelow, ShowFrom } from '@/app/components/ui';
import { useAuth } from '@/app/context';
import { TRANSACTIONS_CHANGED_EVENT } from '@/app/lib/transactions/transaction-events';
import { financialCommitmentsService } from '@/app/services/financial-commitments-service';
import { transactionService } from '@/app/services/transaction-service';
import type { FinancialCommitment, FinancialCommitmentsData } from '@/app/types/financial-commitment';
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

  // Conclui o lançamento e recarrega a lista em silêncio (sem esvaziar a tela); se a API recusar, o erro volta para a linha.
  async function completeCommitment(item: FinancialCommitment) {
    await transactionService.complete(item.source.id);
    window.dispatchEvent(new Event(TRANSACTIONS_CHANGED_EVENT));
    setRequestKey((value) => value + 1);
  }

  function beginReload() {
    setLoading(true);
    setError('');
    setData(null);
  }

  const headerControls = (
    <div className="flex flex-wrap items-center gap-2.5">
      <div className="min-w-0 flex-1 sm:w-[190px] sm:flex-none">
        <Select
          animated
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
        animated
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
      <PageTitle title="Compromissos financeiros" sidebarAligned animated="conveyor" actions={<ShowFrom breakpoint="lg">{headerControls}</ShowFrom>} />
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
          <FinancialCommitmentsView data={data} showValues={showValues} onComplete={completeCommitment} />
        ) : null}
      </div>
    </PageContainer>
    </ProtectedRoute>
  );
}
