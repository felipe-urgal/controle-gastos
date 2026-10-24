'use client';

import { displayMoney } from '@/app/components/pages/dashboard/dashboard/dashboard-helpers';
import type { DashboardCategoryLimit } from '@/app/types/dashboard';

/** Mesma regra do planejamento: orçamento consumido = realizado + comprometido. */
export function categoryBudgetState(limit: DashboardCategoryLimit): { percent: number; tone: 'ok' | 'near' | 'over' } {
  const percent = limit.planningPercentage ?? limit.percentage;
  if (limit.isOverBudget || percent > 100) return { percent, tone: 'over' };
  return { percent, tone: percent >= 90 ? 'near' : 'ok' };
}

const barTone = { ok: 'bg-[var(--primary)]', near: 'bg-[var(--warning)]', over: 'bg-[var(--expense)]' } as const;
const textTone = { ok: 'text-[var(--text-muted)]', near: 'text-[var(--warning)]', over: 'text-[var(--expense)]' } as const;

export function CategoryBudgetBar({
  limit,
  showValues,
  currency,
}: {
  limit: DashboardCategoryLimit;
  showValues: boolean;
  currency: string;
}) {
  const { percent, tone } = categoryBudgetState(limit);

  return (
    <div className="min-w-0">
      <div
        className="h-2 overflow-hidden rounded-full bg-[var(--surface-subtle)]"
        role="img"
        aria-label={`${Math.round(percent)}% do orçamento de ${limit.category.name} consumido`}
      >
        <span className={`block h-full rounded-full ${barTone[tone]}`} style={{ width: `${Math.min(100, percent)}%` }} />
      </div>
      <p className={`mt-1 truncate text-xs ${textTone[tone]}`}>
        <span className="money">{Math.round(percent)}%</span> de <span className="money">{displayMoney(limit.amount, showValues, currency)}</span>
      </p>
    </div>
  );
}
