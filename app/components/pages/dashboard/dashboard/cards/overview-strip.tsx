'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { FaChevronRight } from 'react-icons/fa';

import { dashboardLogicalDateLabel, displayMoney } from '@/app/components/pages/dashboard/dashboard/dashboard-helpers';
import type { DashboardNetWorthSummary, MonthlyDashboard } from '@/app/types/dashboard';

/** Faturas abertas dos cartões: soma (mesma moeda do dashboard) e a data de vencimento mais próxima. */
export function summarizeCardStatements(cards: MonthlyDashboard['cards']) {
  const open = cards.flatMap((card) => (card.nextStatement && card.nextStatement.amount > 0 ? [card.nextStatement] : []));
  if (open.length === 0) return null;

  const nextDue = open
    .map((statement) => statement.dueDate)
    .reduce((earliest, due) =>
      due.year * 10000 + due.month * 100 + due.day < earliest.year * 10000 + earliest.month * 100 + earliest.day ? due : earliest,
    );

  return {
    total: open.reduce((sum, statement) => sum + statement.amount, 0),
    count: open.length,
    nextDue,
  };
}

function Tile({ href, label, children }: { href: string; label: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="flex min-h-11 items-center justify-between gap-3 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] px-4 py-3 transition-colors hover:bg-[var(--surface-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]"
    >
      <span className="min-w-0">
        <span className="block text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">{label}</span>
        <span className="mt-1 block text-sm">{children}</span>
      </span>
      <FaChevronRight className="shrink-0 text-xs text-[var(--text-muted)]" aria-hidden="true" />
    </Link>
  );
}

/** Cartões, metas e patrimônio em uma faixa compacta; cartões e metas só aparecem quando existem. */
export function OverviewStrip({
  cards,
  goals,
  netWorth,
  period,
  currency,
  showValues,
}: {
  cards: MonthlyDashboard['cards'];
  goals: MonthlyDashboard['goals'];
  netWorth: { data: DashboardNetWorthSummary | null; loading: boolean; error: string };
  period: MonthlyDashboard['period'];
  currency: string;
  showValues: boolean;
}) {
  const statements = summarizeCardStatements(cards);
  const goal = goals[0];
  const money = (amount: number) => displayMoney(amount, showValues, currency);
  const monthEnd = `${String(period.month).padStart(2, '0')}/${period.year}`;

  return (
    <section className="grid gap-[14px] [grid-template-columns:repeat(auto-fit,minmax(240px,1fr))]" aria-label="Cartões, metas e patrimônio">
      {cards.length > 0 && (
        <Tile href="/contas" label="Cartões">
          {statements ? (
            <>
              <strong className="money">{money(statements.total)}</strong>
              <span className="text-[var(--text-muted)]">
                {' '}em {statements.count === 1 ? 'fatura' : 'faturas'} · vence {dashboardLogicalDateLabel(statements.nextDue)}
              </span>
            </>
          ) : (
            <strong>Nenhuma fatura em aberto</strong>
          )}
        </Tile>
      )}
      {goal && (
        <Tile href="/metas" label="Metas">
          <strong className="truncate">{goal.name}</strong>
          <span className="text-[var(--text-muted)]">
            {' '}· {goal.percentage.toLocaleString('pt-BR')}%{goals.length > 1 ? ` · +${goals.length - 1}` : ''}
            {goal.monthlyContributionSuggestion !== null && (
              <> · <span className="money">{money(goal.monthlyContributionSuggestion)}</span>/mês</>
            )}
          </span>
        </Tile>
      )}
      <Tile href="/patrimonio" label={`Patrimônio · ${monthEnd}`}>
        {netWorth.loading ? (
          <span className="text-[var(--text-muted)]">Carregando…</span>
        ) : netWorth.error ? (
          <span className="text-[var(--expense)]">Indisponível</span>
        ) : netWorth.data?.total === null || netWorth.data?.total === undefined ? (
          <span className="text-[var(--text-muted)]">Sem saldo realizado</span>
        ) : (
          <strong className="money">{money(netWorth.data.total)}</strong>
        )}
      </Tile>
    </section>
  );
}
