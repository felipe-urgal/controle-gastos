'use client';

import { SectionMessage } from '@/app/components/pages/dashboard/dashboard/cards/section-message';
import Link from 'next/link';
import { DashboardHome } from '@/app/types/dashboard';
import { FinancialCommitment } from '@/app/types/financial-commitment';
import { commitmentBadge, compactMonthLabel, displayMoney, groupCommitments } from '@/app/components/pages/dashboard/dashboard/dashboard-helpers';

export function UpcomingCard({
  items,
  asOf,
  showValues,
  currency,
  loading,
  error,
  onRetry,
}: {
  items: FinancialCommitment[];
  asOf: DashboardHome['scope']['currentAsOf'];
  showValues: boolean;
  currency: string;
  loading: boolean;
  error: string;
  onRetry?: () => void;
}) {
  return (
    <article className="rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-[14px]">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold">Próximos compromissos</h2>
        <Link href="/compromissos" className="inline-flex min-h-11 items-center px-2 -mx-2 text-sm font-semibold text-[var(--orbit-primary)]">Ver todos</Link>
      </div>

      <div className="mt-2 divide-y divide-[var(--border)]">
        {loading ? (
          <div className="space-y-2 py-2" role="status" aria-label="Carregando compromissos">
            {[1, 2, 3, 4].map((item) => <div key={item} className="h-[46px] animate-pulse rounded-lg bg-[var(--skeleton)]" />)}
          </div>
        ) : error ? (
          <SectionMessage tone="error" onRetry={onRetry} retryLabel="Tentar novamente: compromissos">{error}</SectionMessage>
        ) : items.length === 0 ? (
          <SectionMessage tone="empty">Nenhum compromisso vencido ou próximo nos próximos 30 dias.</SectionMessage>
        ) : (
          <div className="space-y-3 py-1">
            {groupCommitments(items, 2).map((group) => (
              <section key={group.direction} aria-label={group.label}>
                <div className="mb-1 flex items-center justify-between gap-2">
                  <h3 className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                    {group.label}
                  </h3>
                  <span className="text-xs text-[var(--text-muted)]">
                    {group.items.length}
                  </span>
                </div>
                <div className="divide-y divide-[var(--border)]">
                  {group.items.map((item) => (
                    <Link key={item.id} href={item.href} className="grid min-h-[52px] grid-cols-[46px_minmax(0,1fr)_auto] items-center gap-3 py-1">
                      <span className="grid h-[43px] w-[43px] place-content-center rounded-[9px] border border-[var(--border-strong)] text-center">
                        <strong className="text-sm leading-none">{String(item.date.day).padStart(2, '0')}</strong>
                        <span className="mt-1 text-xs font-medium uppercase leading-none text-[var(--text-muted)]">{compactMonthLabel(item.date.month, item.date.year)}</span>
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold">{item.title}</p>
                        <p className="mt-1 text-sm text-[var(--text-muted)]">
                          {item.amount === null ? 'Marco sem valor financeiro' : <span className="money">{displayMoney(item.amount, showValues, currency)}</span>}
                        </p>
                      </div>
                      <span className={`rounded-[8px] px-2.5 py-1.5 text-xs font-semibold ${item.state === 'OVERDUE' ? 'bg-[var(--danger-subtle)] text-[var(--expense)]' : 'bg-[var(--orbit-primary-subtle)] text-[var(--orbit-primary)]'}`}>
                        {item.state === 'OVERDUE' ? 'Vencido' : commitmentBadge(item.date, asOf)}
                      </span>
                    </Link>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}
