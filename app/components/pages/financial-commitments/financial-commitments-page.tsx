'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { PageEmpty, PageLoading } from '@/app/components/feedback';
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
    <section className="mx-auto w-full max-w-6xl px-4 py-5 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-4 border-b border-[var(--border)] pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--orbit-primary)]">
            Planejamento
          </p>
          <h1 className="mt-1 text-2xl font-black text-[var(--foreground)] sm:text-3xl">
            Compromissos financeiros
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-[var(--text-muted)]">
            Acompanhe separadamente valores a pagar, a receber, vencidos e marcos de planejamento.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <select
            aria-label="Horizonte"
            value={days}
            onChange={(event) => {
              beginReload();
              setDays(Number(event.target.value) as 7 | 30 | 60 | 90);
            }}
            className="ds-control min-h-11 bg-[var(--surface)] px-3"
          >
            <option value={7}>7 dias</option>
            <option value={30}>30 dias</option>
            <option value={60}>60 dias</option>
            <option value={90}>90 dias</option>
          </select>
          <select
            aria-label="Moeda"
            value={currency}
            onChange={(event) => {
              beginReload();
              setCurrency(event.target.value as SupportedCurrency);
            }}
            className="ds-control min-h-11 bg-[var(--surface)] px-3"
          >
            <option value="BRL">BRL</option>
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
          </select>
          <button
            type="button"
            onClick={() => {
              beginReload();
              setRequestKey((value) => value + 1);
            }}
            disabled={loading}
            className="min-h-11 rounded-xl border border-[var(--border)] px-4 text-sm font-semibold disabled:opacity-50"
          >
            {loading ? 'Atualizando…' : 'Atualizar'}
          </button>
        </div>
      </header>

      {error && (
        <div role="alert" className="mt-5 rounded-xl border border-[var(--expense)]/35 bg-[var(--danger-subtle)] p-4">
          <p className="text-sm font-semibold text-[var(--expense)]">{error}</p>
          <button
            type="button"
            onClick={() => {
              beginReload();
              setRequestKey((value) => value + 1);
            }}
            className="mt-3 min-h-11 rounded-xl border border-[var(--border)] px-4 text-sm font-bold text-[var(--foreground)]"
          >
            Tentar novamente
          </button>
        </div>
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
                        <small className="text-[var(--text-muted)]">{item.accountName}</small>
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
    </section>
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
