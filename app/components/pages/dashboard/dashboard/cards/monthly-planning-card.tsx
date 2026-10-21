'use client';

import Link from 'next/link';
import { MonthlyDashboard } from '@/app/types/dashboard';
import { PlanningMetric } from '@/app/components/pages/dashboard/dashboard/cards/planning-metric';
import { FaChartPie } from 'react-icons/fa';
import { displayMoney } from '@/app/components/pages/dashboard/dashboard/dashboard-helpers';

export function MonthlyPlanningCard({
  planning,
  showValues,
  currency,
}: {
  planning: MonthlyDashboard['planning'];
  showValues: boolean;
  currency: string;
}) {
  const consumption = planning.realized + planning.committed;
  const percentage =
    planning.budget > 0
      ? Math.round((consumption / planning.budget) * 1000) / 10
      : 0;

  return (
    <article className="rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-[14px]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-base font-bold">
            <FaChartPie className="text-[var(--orbit-primary)]" aria-hidden="true" />
            Planejamento mensal
          </h2>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Mesma regra de Categorias / Limites: realizado + comprometido.
          </p>
        </div>
        <Link href="/categorias" className="inline-flex min-h-11 items-center px-2 -mx-2 text-xs font-semibold text-[var(--orbit-primary)]">
          Ajustar orçamento
        </Link>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <PlanningMetric label="Orçamento" value={displayMoney(planning.budget, showValues, currency)} />
        <PlanningMetric label="Realizado" value={displayMoney(planning.realized, showValues, currency)} />
        <PlanningMetric label="Comprometido" value={displayMoney(planning.committed, showValues, currency)} />
        <PlanningMetric
          label="Disponível"
          value={displayMoney(planning.available, showValues, currency)}
          danger={planning.available < 0}
        />
        <PlanningMetric label="Receita esperada" value={displayMoney(planning.expectedIncome, showValues, currency)} />
      </div>

      <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--surface-subtle)]">
        <div
          className={`h-full rounded-full ${
            planning.available < 0 ? 'bg-[var(--expense)]' : 'bg-[var(--orbit-primary)]'
          }`}
          style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }}
        />
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--text-muted)]">
        <span>{percentage.toLocaleString('pt-BR')}% do orçamento consumido</span>
        {planning.overBudgetCategories > 0 && (
          <strong className="text-[var(--expense)]">
            {planning.overBudgetCategories} categoria{planning.overBudgetCategories === 1 ? '' : 's'} acima do orçamento
          </strong>
        )}
      </div>
    </article>
  );
}
