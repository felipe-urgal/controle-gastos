'use client';

import { SectionMessage } from '@/app/components/pages/dashboard/dashboard/cards/section-message';
import { ForecastData } from '@/app/types/forecast';
import { ProjectionRow } from '@/app/components/pages/dashboard/dashboard/cards/projection-row';
import { FaCalendarAlt, FaQuestionCircle } from 'react-icons/fa';
import { displayMoney } from '@/app/components/pages/dashboard/dashboard/dashboard-helpers';

export function ProjectedBalanceCard({
  safeToSpend,
  showValues,
  currency,
  loading,
  error,
  commitmentCount,
  horizonEnd,
  onOpen,
  enabled,
  onRetry,
}: {
  safeToSpend: ForecastData['safeToSpend'] | null;
  showValues: boolean;
  currency: string;
  loading: boolean;
  error: string;
  commitmentCount: number;
  horizonEnd: ForecastData['horizonEnd'] | null;
  onOpen: () => void;
  enabled: boolean;
  onRetry?: () => void;
}) {
  const projectedDate = horizonEnd
    ? `${String(horizonEnd.day).padStart(2, '0')}/${String(horizonEnd.month).padStart(2, '0')}`
    : '30 dias';

  return (
    <article className="min-h-[244px] rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-[14px]">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-bold">Disponível para gastar</h2>
        <span className="rounded-full border border-[var(--orbit-primary)]/35 bg-[var(--orbit-primary-subtle)] px-2.5 py-1 text-xs font-semibold text-[var(--orbit-primary)]">Cálculo conservador</span>
        <FaQuestionCircle className="ml-auto text-xs text-[var(--text-muted)]" aria-hidden="true" />
      </div>

      {error ? (
        <SectionMessage tone="error" className="mt-4" onRetry={onRetry} retryLabel="Tentar novamente: disponível para gastar">{error}</SectionMessage>
      ) : loading ? (
        <div className="mt-4 h-28 animate-pulse rounded-xl bg-[var(--skeleton)]" role="status" aria-label="Carregando disponível para gastar" />
      ) : (
        <div className="mt-2">
          <ProjectionRow label="Saldo realizado" value={safeToSpend ? displayMoney(safeToSpend.realizedBalance, showValues, currency) : '—'} />
          <ProjectionRow
            label="(-) Pendências conhecidas"
            value={safeToSpend && safeToSpend.pendingExpenses > 0 ? `- ${displayMoney(safeToSpend.pendingExpenses, showValues, currency)}` : displayMoney(0, showValues, currency)}
            tone={safeToSpend && safeToSpend.pendingExpenses > 0 ? 'expense' : 'neutral'}
          />
          <ProjectionRow
            label="(-) Faturas em aberto"
            value={safeToSpend && safeToSpend.cardCommitments > 0 ? `- ${displayMoney(safeToSpend.cardCommitments, showValues, currency)}` : displayMoney(0, showValues, currency)}
            tone={safeToSpend && safeToSpend.cardCommitments > 0 ? 'expense' : 'neutral'}
          />
          <ProjectionRow
            label="(+/-) Transferências"
            value={
              !safeToSpend || safeToSpend.transferNet === 0
                ? displayMoney(0, showValues, currency)
                : `${safeToSpend.transferNet > 0 ? '+' : '-'} ${displayMoney(Math.abs(safeToSpend.transferNet), showValues, currency)}`
            }
            tone={!safeToSpend || safeToSpend.transferNet === 0 ? 'neutral' : safeToSpend.transferNet > 0 ? 'income' : 'expense'}
          />
          <div className="mt-1 flex items-end justify-between gap-3 border-t border-[var(--border)] pt-2">
            <span className="text-sm font-bold">Disponível até {projectedDate}</span>
            <strong className={`text-xl font-extrabold ${safeToSpend && safeToSpend.safeToSpend < 0 ? 'text-[var(--expense)]' : 'text-[var(--income)]'}`}>
              {safeToSpend ? displayMoney(safeToSpend.safeToSpend, showValues, currency) : '—'}
            </strong>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-[var(--text-muted)]">
            Receitas futuras não são antecipadas; metas e dívidas só entram quando já viram compromisso concreto.
          </p>
        </div>
      )}

      <button
        type="button"
        onClick={onOpen}
        disabled={!enabled}
        aria-label="Ver projeção"
        className="mt-2 flex min-h-[54px] w-full items-center gap-3 rounded-[10px] border border-[var(--border-strong)] bg-[var(--surface-raised)] px-3 text-left disabled:opacity-50"
      >
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-[var(--orbit-primary)]">
          <FaCalendarAlt aria-hidden="true" />
        </span>
        <span className="min-w-0">
          <strong className="block text-xs font-semibold text-[var(--orbit-primary)]">
            {commitmentCount === 0
              ? 'Nenhum compromisso vencido ou nos próximos 10 dias.'
              : `${commitmentCount} compromisso${commitmentCount === 1 ? '' : 's'} exigindo atenção: vencidos ou nos próximos 10 dias.`}
          </strong>
          <span className="mt-1 block text-xs text-[var(--text-muted)]">Mantenha seu saldo em dia e evite imprevistos.</span>
        </span>
      </button>
    </article>
  );
}
