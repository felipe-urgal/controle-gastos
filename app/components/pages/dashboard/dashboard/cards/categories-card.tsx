'use client';

import { SectionMessage } from '@/app/components/pages/dashboard/dashboard/cards/section-message';
import Link from 'next/link';
import { IconRenderer } from '@/app/components/ui';
import { CategoryBudgetBar } from '@/app/components/pages/dashboard/dashboard/cards/category-budget';
import { MonthlyDashboard } from '@/app/types/dashboard';
import { FaChevronRight } from 'react-icons/fa';
import { displayMoney, monthLabel } from '@/app/components/pages/dashboard/dashboard/dashboard-helpers';

export function CategoriesCard({
  categories,
  limits,
  showValues,
  currency,
  period,
}: {
  categories: MonthlyDashboard['categories'];
  limits: MonthlyDashboard['limits'];
  showValues: boolean;
  currency: string;
  period: MonthlyDashboard['period'];
}) {
  return (
    <article className="rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-[14px]">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold">Para onde foi o dinheiro</h2>
        <span className="text-xs font-semibold text-[var(--text-muted)]">{monthLabel(`${period.year}-${String(period.month).padStart(2, '0')}`)}</span>
      </div>
      <div className="mt-2 divide-y divide-[var(--border)]">
        {categories.length === 0 ? (
          <SectionMessage tone="empty">Nenhuma despesa categorizada neste período.</SectionMessage>
        ) : (
          categories.map((category) => {
            const limit = limits.find((item) => item.category.id === category.id);

            return (
            <Link
              key={category.id}
              href={`/categorias/show/${encodeURIComponent(category.id)}`}
              className="block rounded-[9px] py-2 transition-colors hover:bg-[var(--surface-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]"
            >
              <span className="flex min-h-8 items-center justify-between gap-3">
                <span className="flex min-w-0 items-center gap-2.5">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-white" style={{ backgroundColor: category.color }}><IconRenderer iconName={category.icon || 'tag'} size={14} /></span>
                  <span className="truncate text-sm font-semibold">{category.name}</span>
                </span>
                <strong className="text-right text-sm"><span className="money">{displayMoney(category.realized, showValues, currency)}</span></strong>
              </span>
              <span className="mt-1.5 block pl-[38px]">
                {limit ? (
                  <CategoryBudgetBar limit={limit} showValues={showValues} currency={currency} />
                ) : (
                  <span className="flex items-center gap-3">
                    <span className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--surface-subtle)]">
                      <span className="block h-full rounded-full bg-[var(--orbit-primary)]" style={{ width: `${Math.min(100, category.sharePercentage)}%` }} />
                    </span>
                    <span className="w-12 text-right text-xs font-semibold text-[var(--text-muted)]">{category.sharePercentage.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%</span>
                  </span>
                )}
              </span>
            </Link>
            );
          })
        )}
      </div>
      <Link href="/categorias" className="mt-2 flex min-h-11 items-center justify-between rounded-[10px] border border-[var(--border-strong)] px-3 text-sm font-semibold">
        Ver todas as categorias <FaChevronRight aria-hidden="true" />
      </Link>
    </article>
  );
}
