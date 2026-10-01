'use client';

import Link from 'next/link';
import { FaCalendarWeek } from 'react-icons/fa';

import { formatCurrency } from '@/app/lib/currency/format-currency';
import type { PeriodicFinancialSummaryState } from '@/app/types/periodic-financial-summary';

function money(amount: number, showValues: boolean, currency: string) {
  return showValues ? formatCurrency(amount, currency) : '••••';
}

function dateLabel(date: { year: number; month: number; day: number }) {
  return `${String(date.day).padStart(2, '0')}/${String(date.month).padStart(2, '0')}`;
}

export function PeriodicSummaryCard({
  state,
  loading,
  error,
  showValues,
}: {
  state: PeriodicFinancialSummaryState | null;
  loading: boolean;
  error: string;
  showValues: boolean;
}) {
  if (loading) {
    return (
      <section className="ds-panel p-4 sm:p-5" aria-label="Carregando resumo semanal">
        <div className="h-24 animate-pulse rounded-xl bg-[var(--skeleton)]" />
      </section>
    );
  }

  if (error) {
    return (
      <section className="ds-panel p-4 sm:p-5">
        <p className="text-sm text-[var(--expense)]">{error}</p>
      </section>
    );
  }

  if (!state?.enabled) {
    return (
      <section className="ds-panel p-4 sm:p-5" aria-labelledby="periodic-summary-title">
        <div className="flex items-start gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-[var(--surface-raised)] text-[var(--text-muted)]">
            <FaCalendarWeek aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="periodic-summary-title" className="text-sm font-bold text-[var(--foreground)]">
              Resumo semanal
            </h2>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Ative em Preferências para materializar um resumo financeiro semanal dentro do app.
            </p>
            <Link href="/perfil?tab=preferences" className="mt-3 inline-flex min-h-10 items-center text-sm font-semibold text-[var(--orbit-primary)]">
              Abrir preferências
            </Link>
          </div>
        </div>
      </section>
    );
  }

  const summary = state.summary?.content;
  if (!summary) return null;

  return (
    <section className="ds-panel p-4 sm:p-5" aria-labelledby="periodic-summary-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-[var(--surface-raised)] text-[var(--orbit-primary)]">
            <FaCalendarWeek aria-hidden="true" />
          </span>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--text-muted)]">Semana concluída</p>
            <h2 id="periodic-summary-title" className="mt-0.5 text-base font-bold text-[var(--foreground)]">
              Resumo semanal
            </h2>
            <p className="mt-0.5 text-xs text-[var(--text-muted)]">
              {dateLabel(summary.period.start)}–{dateLabel(summary.period.end)} · {summary.currency}
            </p>
          </div>
        </div>
        <strong className={`text-xl font-black ${summary.totals.balance < 0 ? 'text-[var(--expense)]' : 'text-[var(--income)]'}`}>
          {money(summary.totals.balance, showValues, summary.currency)}
        </strong>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
        <div className="rounded-[10px] bg-[var(--surface-subtle)] p-2.5">
          <span className="block text-[var(--text-muted)]">Entradas</span>
          <strong className="mt-1 block text-[var(--income)]">{money(summary.totals.income, showValues, summary.currency)}</strong>
        </div>
        <div className="rounded-[10px] bg-[var(--surface-subtle)] p-2.5">
          <span className="block text-[var(--text-muted)]">Saídas</span>
          <strong className="mt-1 block text-[var(--expense)]">{money(summary.totals.expense, showValues, summary.currency)}</strong>
        </div>
        <div className="rounded-[10px] bg-[var(--surface-subtle)] p-2.5">
          <span className="block text-[var(--text-muted)]">Próx. 7 dias</span>
          <strong className="mt-1 block text-[var(--foreground)]">{summary.upcomingCommitments.count}</strong>
        </div>
      </div>

      {(summary.topCategories.length > 0 || summary.insights.length > 0) && (
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {summary.topCategories.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-[var(--text-muted)]">Principais categorias</p>
              <div className="mt-2 space-y-1.5">
                {summary.topCategories.slice(0, 3).map((item) => (
                  <div key={item.categoryId} className="flex items-center justify-between gap-3 text-sm">
                    <span className="truncate text-[var(--foreground)]">{item.categoryName}</span>
                    <strong className="shrink-0">{money(item.amount, showValues, summary.currency)}</strong>
                  </div>
                ))}
              </div>
            </div>
          )}
          {summary.insights.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-[var(--text-muted)]">Destaques</p>
              <div className="mt-2 space-y-1.5">
                {summary.insights.slice(0, 2).map((item) => (
                  <p key={item.id} className="text-sm leading-relaxed text-[var(--foreground)]">
                    {item.message}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {summary.safeToSpend && (
        <p className="mt-4 border-t border-[var(--border)] pt-3 text-xs text-[var(--text-muted)]">
          Disponível para gastar no momento do resumo: <strong className="text-[var(--foreground)]">{money(summary.safeToSpend.safeToSpend, showValues, summary.currency)}</strong>.
          {summary.subscriptions.priceChanges.length > 0 ? ` ${summary.subscriptions.priceChanges.length} assinatura(s) com variação de preço.` : ''}
        </p>
      )}
    </section>
  );
}
