'use client';

import Link from 'next/link';
import { FaChevronDown } from 'react-icons/fa';

import { SectionMessage } from '@/app/components/pages/dashboard/dashboard/cards/section-message';
import { displayMoney, logicalDateDistance, signedMoney } from '@/app/components/pages/dashboard/dashboard/dashboard-helpers';
import { ComparisonDetail } from '@/app/components/pages/dashboard/dashboard/insight-cards';
import { Button } from '@/app/components/ui';
import type { DashboardHome, MonthlyDashboard } from '@/app/types/dashboard';
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

/** Quanto dá para gastar por dia até o fim do horizonte; o último dia conta como um dia inteiro. */
export function safeToSpendPerDay(
  safeToSpend: number,
  through: { year: number; month: number; day: number },
  asOf: { year: number; month: number; day: number },
) {
  if (safeToSpend <= 0) return null;

  const days = Math.max(logicalDateDistance(through, asOf), 1);
  return { days, perDay: Math.floor(safeToSpend / days) };
}

export function SafeToSpendHero({
  cashAccounts,
  asOf,
  summary,
  comparison,
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
  cashAccounts: DashboardHome['current']['cash']['accounts'];
  asOf: DashboardHome['scope']['currentAsOf'];
  summary: MonthlyDashboard['summary'];
  comparison: MonthlyDashboard['comparison'];
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

  const perDay = safeToSpend && through ? safeToSpendPerDay(safeToSpend.safeToSpend, through, asOf) : null;
  const previous = comparison.previousPeriod;
  const keptShare = summary.income > 0 && summary.balance > 0
    ? `${Math.round((summary.balance / summary.income) * 100)}% do que entrou`
    : null;

  return (
    <section
      className="flex flex-col rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-[14px] sm:p-5"
      aria-labelledby="dashboard-hero-title"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="dashboard-hero-title" className="text-sm font-medium text-[var(--text-muted)]">
          Disponível para gastar
        </h2>
        <span className="text-xs text-[var(--text-muted)]">até {horizonLabel} · só o que já está lançado</span>
      </div>

      {error ? (
        <SectionMessage tone="error" className="mt-3" onRetry={onRetry} retryLabel="Tentar novamente: disponível para gastar">{error}</SectionMessage>
      ) : loading ? (
        <div className="mt-3 h-24 animate-pulse rounded-xl bg-[var(--skeleton)]" role="status" aria-label="Carregando disponível para gastar" />
      ) : safeToSpend ? (
        <div className="mt-2 space-y-4">
          <div className="flex flex-wrap items-end gap-x-7 gap-y-3">
            <strong
              className={`block money text-[2.25rem] font-semibold leading-none tracking-[-0.035em] tabular-nums sm:text-5xl ${safeToSpend.safeToSpend < 0 ? 'text-[var(--expense)]' : 'text-[var(--foreground)]'}`}
            >
              <span className="money">{money(safeToSpend.safeToSpend)}</span>
            </strong>
            <div className="flex flex-col items-start gap-1.5">
              {margin && (
                <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${margin.className}`}>
                  {margin.label}
                </span>
              )}
              {perDay && (
                <span className="text-sm">
                  ≈ <strong className="money tabular-nums">{money(perDay.perDay)}</strong> por dia
                  <span className="text-[var(--text-muted)]"> · {perDay.days} {perDay.days === 1 ? 'dia' : 'dias'}</span>
                </span>
              )}
            </div>
          </div>

          {barParts.length > 0 && (
            <div className="flex h-2.5 gap-0.5 overflow-hidden rounded-full" aria-hidden="true">
              {barParts.map((part) => (
                <span key={part.key} className="block min-w-[3px]" style={{ flex: part.value, background: part.color }} />
              ))}
            </div>
          )}

          <details className="group">
            <summary className="flex min-h-11 cursor-pointer list-none items-center gap-1.5 text-sm font-semibold text-[var(--orbit-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)] [&::-webkit-details-marker]:hidden">
              Como chegamos nesse valor
              <FaChevronDown className="text-xs transition-transform group-open:rotate-180" aria-hidden="true" />
            </summary>
            <dl className="grid gap-x-6 gap-y-1 pb-2 text-sm sm:grid-cols-2">
              {breakdown.map((row) => (
                <div key={row.label} className="flex items-center justify-between gap-3">
                  <dt className="flex items-center gap-2 text-[var(--text-muted)]">
                    <span className="h-2 w-2 shrink-0 rounded-sm" style={{ background: row.color }} aria-hidden="true" />
                    {row.label}
                  </dt>
                  <dd className="money text-[0.8125rem] font-medium tabular-nums text-[var(--foreground)]">{row.sign}{row.value}</dd>
                </div>
              ))}
            </dl>
            <p className="text-xs leading-relaxed text-[var(--text-muted)]">
              Receitas futuras não entram na conta; metas e dívidas só contam quando já viraram compromisso. Saldo de {cashAccounts.length} {cashAccounts.length === 1 ? 'conta corrente' : 'contas correntes'}.
            </p>
            <div className="flex flex-wrap gap-x-5">
              <Link href="/contas" className="inline-flex min-h-11 items-center text-sm font-semibold text-[var(--orbit-primary)]">Ver contas</Link>
              <Button type="button" size="sm" variant="ghost" onClick={onOpenForecast} disabled={!forecastEnabled}>
                Ver projeção dos próximos 30 dias
              </Button>
            </div>
          </details>
        </div>
      ) : (
        <p className="mt-3 text-sm text-[var(--text-muted)]">Sem dados elegíveis nesta moeda.</p>
      )}

      <dl className="mt-4 grid grid-cols-3 border-t border-[var(--border)] pt-4">
        <div className="min-w-0 pr-2 sm:pr-4">
          <dt className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">Entrou</dt>
          <dd className="money mt-1.5 break-words text-sm font-bold text-[var(--income)] sm:text-xl">{money(summary.income)}</dd>
          <dd className="mt-1 text-xs">
            <ComparisonDetail percentage={comparison.income.percentage} previousMonth={previous.month} previousYear={previous.year} tone="income" />
          </dd>
        </div>
        <div className="min-w-0 border-l border-[var(--border)] px-2 sm:px-4">
          <dt className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">Saiu</dt>
          <dd className="money mt-1.5 break-words text-sm font-bold text-[var(--expense)] sm:text-xl">{money(summary.expense)}</dd>
          <dd className="mt-1 text-xs">
            <ComparisonDetail percentage={comparison.expense.percentage} previousMonth={previous.month} previousYear={previous.year} tone="expense" />
          </dd>
        </div>
        <div className="min-w-0 border-l border-[var(--border)] pl-2 sm:pl-4">
          <dt className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">Sobrou</dt>
          <dd className={`money mt-1.5 break-words text-sm font-bold sm:text-xl ${summary.balance < 0 ? 'text-[var(--expense)]' : 'text-[var(--foreground)]'}`}>{signedMoney(summary.balance, showValues, currency)}</dd>
          <dd className="mt-1 text-xs text-[var(--text-muted)]">
            {summary.balance < 0 ? 'Gastou mais que recebeu' : keptShare}
          </dd>
        </div>
      </dl>
    </section>
  );
}
