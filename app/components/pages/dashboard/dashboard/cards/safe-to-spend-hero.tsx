'use client';

import Link from 'next/link';
import { FaChartLine, FaChevronRight } from 'react-icons/fa';

import { SectionMessage } from '@/app/components/pages/dashboard/dashboard/cards/section-message';
import { dashboardLogicalDateLabel, displayMoney } from '@/app/components/pages/dashboard/dashboard/dashboard-helpers';
import { Button } from '@/app/components/ui';
import type { DashboardHome } from '@/app/types/dashboard';
import type { ForecastData } from '@/app/types/forecast';

type Margin = { label: string; className: string };

/** Compara o disponível com o saldo realizado; não promete nada além do que o cálculo conservador mostra. */
export function safeToSpendMargin(safeToSpend: ForecastData['safeToSpend']): Margin {
  if (safeToSpend.safeToSpend < 0) {
    return { label: 'Compromissos acima do saldo', className: 'bg-[var(--danger-subtle)] text-[var(--expense)]' };
  }
  if (safeToSpend.realizedBalance <= 0 || safeToSpend.safeToSpend < safeToSpend.realizedBalance * 0.15) {
    return { label: 'Margem apertada', className: 'bg-[var(--warning-subtle)] text-[var(--warning)]' };
  }
  return { label: 'Margem confortável', className: 'bg-[var(--surface-subtle)] text-[var(--income)]' };
}

export function SafeToSpendHero({
  cashTotal,
  cashAccounts,
  asOf,
  safeToSpend,
  horizonEnd,
  loading,
  error,
  showValues,
  currency,
  onOpenForecast,
  forecastEnabled,
  onRetry,
}: {
  cashTotal: number;
  cashAccounts: DashboardHome['current']['cash']['accounts'];
  asOf: DashboardHome['scope']['currentAsOf'];
  safeToSpend: ForecastData['safeToSpend'] | null;
  horizonEnd: ForecastData['horizonEnd'] | null;
  loading: boolean;
  error: string;
  showValues: boolean;
  currency: string;
  onOpenForecast: () => void;
  forecastEnabled: boolean;
  onRetry?: () => void;
}) {
  const through = safeToSpend?.through ?? horizonEnd;
  const horizonLabel = through
    ? `${String(through.day).padStart(2, '0')}/${String(through.month).padStart(2, '0')}`
    : '30 dias';
  const margin = safeToSpend ? safeToSpendMargin(safeToSpend) : null;
  const money = (amount: number) => displayMoney(amount, showValues, currency);

  const breakdown = safeToSpend
    ? [
        { label: 'Saldo realizado', value: money(safeToSpend.realizedBalance), sign: '', color: 'var(--text-subtle)' },
        { label: 'Pendências conhecidas', value: money(safeToSpend.pendingExpenses), sign: safeToSpend.pendingExpenses > 0 ? '− ' : '', color: 'var(--warning)' },
        { label: 'Faturas em aberto', value: money(safeToSpend.cardCommitments), sign: safeToSpend.cardCommitments > 0 ? '− ' : '', color: 'var(--orbit-primary)' },
        ...(safeToSpend.transferNet !== 0
          ? [{ label: 'Transferências', value: money(Math.abs(safeToSpend.transferNet)), sign: safeToSpend.transferNet > 0 ? '+ ' : '− ', color: 'var(--info)' }]
          : []),
      ]
    : [];
  const barBase = safeToSpend ? safeToSpend.realizedBalance : 0;
  const barParts = safeToSpend && barBase > 0
    ? [
        { key: 'free', value: Math.max(safeToSpend.safeToSpend, 0), color: 'var(--income)' },
        { key: 'pending', value: safeToSpend.pendingExpenses, color: 'var(--warning)' },
        { key: 'cards', value: safeToSpend.cardCommitments, color: 'var(--orbit-primary)' },
      ].filter((part) => part.value > 0)
    : [];

  return (
    <section
      className="rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-[14px] sm:p-5"
      aria-labelledby="dashboard-hero-title"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="dashboard-hero-title" className="text-sm font-semibold text-[var(--text-muted)]">
          Disponível para gastar
        </h2>
        <span className="text-xs text-[var(--text-muted)]">até o fim do mês ({horizonLabel}) · cálculo conservador</span>
      </div>

      {error ? (
        <SectionMessage tone="error" className="mt-3" onRetry={onRetry} retryLabel="Tentar novamente: disponível para gastar">{error}</SectionMessage>
      ) : loading ? (
        <div className="mt-3 h-24 animate-pulse rounded-xl bg-[var(--skeleton)]" role="status" aria-label="Carregando disponível para gastar" />
      ) : safeToSpend ? (
        <div className="mt-2 space-y-4">
          <strong
            className={`block font-[family-name:var(--font-numeric)] text-[2.25rem] font-semibold leading-none tracking-[-0.035em] tabular-nums sm:text-5xl ${safeToSpend.safeToSpend < 0 ? 'text-[var(--expense)]' : 'text-[var(--foreground)]'}`}
          >
            {money(safeToSpend.safeToSpend)}
          </strong>
          {margin && (
            <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${margin.className}`}>
              {margin.label}
            </span>
          )}

          {barParts.length > 0 && (
            <div className="flex h-2.5 gap-0.5 overflow-hidden rounded-full" aria-hidden="true">
              {barParts.map((part) => (
                <span key={part.key} className="block min-w-[3px]" style={{ flex: part.value, background: part.color }} />
              ))}
            </div>
          )}

          <dl className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
            {breakdown.map((row) => (
              <div key={row.label} className="flex items-center justify-between gap-3">
                <dt className="flex items-center gap-2 text-[var(--text-muted)]">
                  <span className="h-2 w-2 shrink-0 rounded-sm" style={{ background: row.color }} aria-hidden="true" />
                  {row.label}
                </dt>
                <dd className="font-[family-name:var(--font-numeric)] text-[0.8125rem] font-medium tabular-nums text-[var(--foreground)]">{row.sign}{row.value}</dd>
              </div>
            ))}
          </dl>
          <p className="text-xs leading-relaxed text-[var(--text-muted)]">
            Receitas futuras não entram na conta; metas e dívidas só contam quando já viraram compromisso.
          </p>
        </div>
      ) : (
        <p className="mt-3 text-sm text-[var(--text-muted)]">Sem dados elegíveis nesta moeda.</p>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] pt-3">
        <Link
          href="/contas"
          className="flex min-h-11 min-w-0 flex-1 items-center gap-2 text-sm text-[var(--text-muted)] hover:text-[var(--foreground)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]"
        >
          <span className="min-w-0">
            <span className="block truncate">
              <span>Saldo realizado em contas correntes</span> · {dashboardLogicalDateLabel(asOf)}
            </span>
            <span className="mt-0.5 flex items-center gap-1 truncate">
              <strong className={`font-[family-name:var(--font-numeric)] text-[0.8125rem] tabular-nums ${cashTotal < 0 ? 'text-[var(--expense)]' : 'text-[var(--foreground)]'}`}>{money(cashTotal)}</strong>
              <span>
                em {cashAccounts.length} {cashAccounts.length === 1 ? 'conta' : 'contas'}
              </span>
              <FaChevronRight className="shrink-0 text-xs" aria-hidden="true" />
            </span>
          </span>
        </Link>
        <Button
          type="button"
          size="xs"
          variant="outline"
          onClick={onOpenForecast}
          disabled={!forecastEnabled}
          icon={<FaChartLine aria-hidden="true" />}
          aria-label="Ver projeção"
        >
          Ver projeção
        </Button>
      </div>
    </section>
  );
}
