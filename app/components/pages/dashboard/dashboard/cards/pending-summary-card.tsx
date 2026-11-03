'use client';

import Link from 'next/link';

import { SectionMessage } from '@/app/components/pages/dashboard/dashboard/cards/section-message';
import { displayMoney } from '@/app/components/pages/dashboard/dashboard/dashboard-helpers';
import type { FinancialCommitmentsData } from '@/app/types/financial-commitment';

function countLabel(count: number) {
  return `${count} ${count === 1 ? 'item' : 'itens'}`;
}

/**
 * Totais do que ainda não foi realizado (a receber e a pagar), vindos dos mesmos compromissos
 * do calendário. Não entram no saldo realizado; a moeda é a do Dashboard, sem conversão.
 */
export function PendingSummaryCard({
  totals,
  days,
  showValues,
  currency,
  loading,
  error,
  onRetry,
}: {
  totals: FinancialCommitmentsData['totals'] | null;
  days: number | null;
  showValues: boolean;
  currency: string;
  loading: boolean;
  error: string;
  onRetry?: () => void;
}) {
  return (
    <article className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-[14px]" aria-labelledby="pending-summary-title">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <div>
          <h2 id="pending-summary-title" className="text-lg font-bold">Pendentes</h2>
          <p className="text-xs text-[var(--text-muted)]">
            Vencidos e próximos {days ?? 30} dias · não entram no saldo realizado
          </p>
        </div>
        <Link href="/compromissos" className="inline-flex min-h-11 items-center px-2 -mx-2 text-sm font-semibold text-[var(--primary)]">Ver compromissos</Link>
      </div>

      {loading ? (
        <div className="mt-2 grid grid-cols-2 gap-3" role="status" aria-label="Carregando pendentes">
          {[1, 2].map((item) => <div key={item} className="h-[62px] animate-pulse rounded-lg bg-[var(--skeleton)]" />)}
        </div>
      ) : error || !totals ? (
        <SectionMessage tone="error" onRetry={onRetry} retryLabel="Tentar novamente: pendentes">{error || 'Pendentes indisponíveis.'}</SectionMessage>
      ) : (
        <>
          <dl className="mt-2 grid grid-cols-2 gap-3">
            <div className="rounded-[var(--radius-md)] bg-[var(--surface-raised)] p-3">
              <dt className="text-xs font-semibold text-[var(--text-muted)]">A receber</dt>
              <dd className="money mt-1 text-lg font-bold text-[var(--income)]">{displayMoney(totals.receivable.amount, showValues, currency)}</dd>
              <dd className="text-xs text-[var(--text-muted)]">{countLabel(totals.receivable.count)}</dd>
            </div>
            <div className="rounded-[var(--radius-md)] bg-[var(--surface-raised)] p-3">
              <dt className="text-xs font-semibold text-[var(--text-muted)]">A pagar</dt>
              <dd className="money mt-1 text-lg font-bold text-[var(--expense)]">{displayMoney(totals.payable.amount, showValues, currency)}</dd>
              <dd className="text-xs text-[var(--text-muted)]">{countLabel(totals.payable.count)}</dd>
            </div>
          </dl>
          {totals.overdueCount > 0 && (
            <p className="mt-2 text-xs font-semibold text-[var(--expense)]">
              {totals.overdueCount} {totals.overdueCount === 1 ? 'vencido' : 'vencidos'} entre os itens acima.
            </p>
          )}
        </>
      )}
    </article>
  );
}
