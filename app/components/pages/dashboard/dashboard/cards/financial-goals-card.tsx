'use client';

import Link from 'next/link';
import { MonthlyDashboard } from '@/app/types/dashboard';
import { FaBullseye } from 'react-icons/fa';
import { displayMoney } from '@/app/components/pages/dashboard/dashboard/dashboard-helpers';

export function FinancialGoalsCard({
  goals,
  showValues,
  currency,
}: {
  goals: MonthlyDashboard['goals'];
  showValues: boolean;
  currency: string;
}) {
  return (
    <article className="rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-[14px]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-base font-bold">
            <FaBullseye className="text-[var(--orbit-primary)]" aria-hidden="true" />
            Metas
          </h2>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Progresso atual das metas. Nenhum valor altera o saldo das contas.
          </p>
        </div>
        <Link href="/metas" className="inline-flex min-h-11 items-center px-2 -mx-2 text-xs font-semibold text-[var(--orbit-primary)]">
          Ver todas
        </Link>
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
        {goals.slice(0, 3).map((goal) => {
          const percentage = Math.max(0, Math.min(100, goal.percentage));

          return (
            <Link
              key={goal.id}
              href={`/metas#goal-${encodeURIComponent(goal.id)}`}
              className="rounded-[12px] border border-[var(--border)] bg-[var(--surface-raised)] p-3 transition-colors hover:bg-[var(--surface-hover)]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-[var(--foreground)]">
                    {goal.name}
                  </p>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">
                    {goal.targetDate
                      ? `Prazo ${goal.targetDate.split('-').reverse().join('/')}`
                      : 'Sem prazo definido'}
                  </p>
                </div>
                <span className="shrink-0 text-xs font-bold text-[var(--orbit-primary)]">
                  {goal.percentage.toLocaleString('pt-BR')}%
                </span>
              </div>

              <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--surface-subtle)]">
                <div
                  className="h-full rounded-full bg-[var(--orbit-primary)]"
                  style={{ width: `${percentage}%` }}
                />
              </div>

              <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <p className="text-[var(--text-muted)]">Atual</p>
                  <strong className="mt-1 block text-[var(--foreground)]">
                    {displayMoney(goal.currentAmount, showValues, currency)}
                  </strong>
                </div>
                <div>
                  <p className="text-[var(--text-muted)]">Falta</p>
                  <strong className="mt-1 block text-[var(--foreground)]">
                    {displayMoney(goal.remainingAmount, showValues, currency)}
                  </strong>
                </div>
              </div>

              {goal.monthlyContributionSuggestion !== null && (
                <p className="mt-2 text-xs text-[var(--text-muted)]">
                  Aproximadamente {displayMoney(goal.monthlyContributionSuggestion, showValues, currency)}/mês até o prazo.
                </p>
              )}
            </Link>
          );
        })}
      </div>
    </article>
  );
}
