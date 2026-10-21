'use client';

import { PageContainer, PageTitle } from '@/app/components/base-pages';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { PageEmpty, PageError, PageLoading } from '@/app/components/feedback';
import { Button, Select } from '@/app/components/ui';
import { useAuth } from '@/app/context';
import { formatCurrency } from '@/app/lib/currency/format-currency';
import { financialCommitmentsService } from '@/app/services/financial-commitments-service';
import type {
  FinancialCommitmentDirection,
  FinancialCommitmentsData,
  FinancialCommitmentType,
} from '@/app/types/financial-commitment';
import type { SupportedCurrency } from '@/app/types/financial-summary';

const typeLabel: Record<FinancialCommitmentType, string> = {
  PENDING: 'Pendente',
  RECURRING: 'Recorrência',
  INSTALLMENT: 'Parcela',
  CARD_STATEMENT: 'Fatura',
  DEBT_INSTALLMENT: 'Dívida',
  GOAL_DEADLINE: 'Meta',
};

const directionLabel: Record<FinancialCommitmentDirection, string> = {
  PAYABLE: 'A pagar',
  RECEIVABLE: 'A receber',
  MILESTONE: 'Marco',
};

function dateLabel(date: { year: number; month: number; day: number }) {
  return new Date(date.year, date.month - 1, date.day).toLocaleDateString('pt-BR');
}

export default function FinancialCommitmentsPage() {
  const { user } = useAuth();
  const showValues = user?.showValues !== false;
  const [currency, setCurrency] = useState<SupportedCurrency>('BRL');
  const [days, setDays] = useState<7 | 30 | 60 | 90>(30);
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

  return (
    <PageContainer as="section">
      <PageTitle
        eyebrow="Planejamento"
        title="Compromissos financeiros"
        description="Acompanhe separadamente valores a pagar, a receber, vencidos e marcos de planejamento."
        actions={
          <>
          <div className="w-32">
            <Select
              ariaLabel="Horizonte"
              value={days}
              onChange={(value) => {
                beginReload();
                setDays(Number(value) as 7 | 30 | 60 | 90);
              }}
              options={[
                { value: 7, label: '7 dias' },
                { value: 30, label: '30 dias' },
                { value: 60, label: '60 dias' },
                { value: 90, label: '90 dias' },
              ]}
            />
          </div>
          <div className="w-28">
            <Select
              ariaLabel="Moeda"
              value={currency}
              onChange={(value) => {
                beginReload();
                setCurrency(value as SupportedCurrency);
              }}
              options={[
                { value: 'BRL', label: 'BRL' },
                { value: 'USD', label: 'USD' },
                { value: 'EUR', label: 'EUR' },
              ]}
            />
          </div>
          <Button
            variant="outline"
            onClick={() => {
              beginReload();
              setRequestKey((value) => value + 1);
            }}
            disabled={loading}
          >
            {loading ? 'Atualizando…' : 'Atualizar'}
          </Button>
          </>
        }
      />

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

      {loading && !data ? (
        <div className="mt-5">
          <PageLoading />
        </div>
      ) : data && !error ? (
        <div className="mt-5 space-y-4">
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Resumo dos compromissos">
            <SummaryCard
              label="A pagar"
              value={showValues ? formatCurrency(data.totals.payable.amount, currency) : '••••'}
              detail={`${data.totals.payable.count} compromisso${data.totals.payable.count === 1 ? '' : 's'}`}
            />
            <SummaryCard
              label="A receber"
              value={showValues ? formatCurrency(data.totals.receivable.amount, currency) : '••••'}
              detail={`${data.totals.receivable.count} entrada${data.totals.receivable.count === 1 ? '' : 's'}`}
            />
            <SummaryCard
              label="Vencidos"
              value={String(data.totals.overdueCount)}
              detail="itens ainda pendentes"
            />
            <SummaryCard
              label="Marcos"
              value={String(data.totals.milestoneCount)}
              detail="sem valor monetário"
            />
          </section>

          <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]" aria-label="Linha do tempo de compromissos">
            {data.items.length === 0 ? (
              <div className="p-6">
                <PageEmpty title="Nenhum compromisso no horizonte selecionado" />
              </div>
            ) : (
              <div className="divide-y divide-[var(--border)]">
                {data.items.map((item) => (
                  <Link
                    key={item.id}
                    href={item.href}
                    className="grid gap-2 px-4 py-4 hover:bg-[var(--surface-hover)] sm:grid-cols-[110px_170px_minmax(0,1fr)_auto] sm:items-center"
                  >
                    <span className="text-sm font-semibold">
                      {dateLabel(item.date)}
                    </span>
                    <span className="flex flex-wrap gap-1.5">
                      <span className="w-fit rounded-full bg-[var(--orbit-primary-subtle)] px-2.5 py-1 text-xs font-semibold text-[var(--orbit-primary)]">
                        {typeLabel[item.type]}
                      </span>
                      <span className={`w-fit rounded-full px-2.5 py-1 text-xs font-semibold ${
                        item.state === 'OVERDUE'
                          ? 'bg-[var(--danger-subtle)] text-[var(--expense)]'
                          : 'bg-[var(--surface-raised)] text-[var(--text-muted)]'
                      }`}>
                        {item.state === 'OVERDUE' ? 'Vencido' : directionLabel[item.direction]}
                      </span>
                    </span>
                    <span className="min-w-0">
                      <strong className="block truncate text-sm">{item.title}</strong>
                      {item.accountName && (
                        <small className="text-xs text-[var(--text-muted)]">{item.accountName}</small>
                      )}
                    </span>
                    <strong className="text-sm">
                      {item.amount === null
                        ? '—'
                        : showValues
                          ? formatCurrency(item.amount, currency)
                          : '••••'}
                    </strong>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>
      ) : null}
    </PageContainer>
  );
}

function SummaryCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <article className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <p className="text-xs font-semibold text-[var(--text-muted)]">{label}</p>
      <strong className="mt-1 block text-2xl text-[var(--foreground)]">{value}</strong>
      <p className="mt-1 text-xs text-[var(--text-muted)]">{detail}</p>
    </article>
  );
}
