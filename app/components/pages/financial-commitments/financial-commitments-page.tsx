'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { useAuth } from '@/app/context';
import { formatCurrency } from '@/app/lib/currency/format-currency';
import { financialCommitmentsService } from '@/app/services/financial-commitments-service';
import type { FinancialCommitmentsData, FinancialCommitmentType } from '@/app/types/financial-commitment';
import type { SupportedCurrency } from '@/app/types/financial-summary';

const typeLabel: Record<FinancialCommitmentType, string> = {
  PENDING: 'Pendente',
  RECURRING: 'Recorrência',
  INSTALLMENT: 'Parcela',
  CARD_STATEMENT: 'Fatura',
  DEBT_INSTALLMENT: 'Dívida',
  GOAL_DEADLINE: 'Meta',
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

  useEffect(() => {
    let active = true;
    financialCommitmentsService.get(currency, days)
      .then((response) => {
        if (!active) return;
        setData(response.data);
        setError('');
      })
      .catch((cause) => {
        if (!active) return;
        setData(null);
        setError(cause instanceof Error ? cause.message : 'Erro ao carregar compromissos');
      });
    return () => { active = false; };
  }, [currency, days, requestKey]);

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-5 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-4 border-b border-[var(--border)] pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--orbit-primary)]">Planejamento</p>
          <h1 className="mt-1 text-2xl font-black text-[var(--foreground)] sm:text-3xl">Próximos compromissos</h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">Pendências, recorrências, parcelas, dívidas, faturas e prazos de metas em uma única linha do tempo.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <select aria-label="Horizonte" value={days} onChange={(event) => setDays(Number(event.target.value) as 7 | 30 | 60 | 90)} className="ds-control min-h-11 bg-[var(--surface)] px-3">
            <option value={7}>7 dias</option>
            <option value={30}>30 dias</option>
            <option value={60}>60 dias</option>
            <option value={90}>90 dias</option>
          </select>
          <select aria-label="Moeda" value={currency} onChange={(event) => setCurrency(event.target.value as SupportedCurrency)} className="ds-control min-h-11 bg-[var(--surface)] px-3">
            <option value="BRL">BRL</option>
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
          </select>
          <button type="button" onClick={() => setRequestKey((value) => value + 1)} className="min-h-11 rounded-xl border border-[var(--border)] px-4 text-sm font-semibold">Atualizar</button>
        </div>
      </header>

      {error && <p role="alert" className="mt-5 rounded-xl border border-[var(--expense)]/35 bg-[var(--danger-subtle)] p-4 text-sm text-[var(--expense)]">{error}</p>}

      {data && !error && (
        <div className="mt-5 space-y-4">
          <section className="grid gap-3 sm:grid-cols-3">
            <article className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
              <p className="text-xs text-[var(--text-muted)]">Compromissos financeiros</p>
              <strong className="mt-1 block text-2xl">{data.totals.monetaryCount}</strong>
            </article>
            <article className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
              <p className="text-xs text-[var(--text-muted)]">Valor conhecido</p>
              <strong className="mt-1 block text-2xl">{showValues ? formatCurrency(data.totals.monetaryAmount, currency) : '••••'}</strong>
            </article>
            <article className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
              <p className="text-xs text-[var(--text-muted)]">Marcos sem valor</p>
              <strong className="mt-1 block text-2xl">{data.totals.milestoneCount}</strong>
            </article>
          </section>

          <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
            {data.items.length === 0 ? (
              <p className="p-6 text-sm text-[var(--text-muted)]">Nenhum compromisso no horizonte selecionado.</p>
            ) : (
              <div className="divide-y divide-[var(--border)]">
                {data.items.map((item) => (
                  <Link key={item.id} href={item.href} className="grid gap-2 px-4 py-4 hover:bg-[var(--surface-hover)] sm:grid-cols-[110px_120px_minmax(0,1fr)_auto] sm:items-center">
                    <span className="text-sm font-semibold">{dateLabel(item.date)}</span>
                    <span className="w-fit rounded-full bg-[var(--orbit-primary-subtle)] px-2.5 py-1 text-xs font-semibold text-[var(--orbit-primary)]">{typeLabel[item.type]}</span>
                    <span className="min-w-0">
                      <strong className="block truncate text-sm">{item.title}</strong>
                      {item.accountName && <small className="text-[var(--text-muted)]">{item.accountName}</small>}
                    </span>
                    <strong className="text-sm">{item.amount === null ? '—' : showValues ? formatCurrency(item.amount, currency) : '••••'}</strong>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </main>
  );
}
