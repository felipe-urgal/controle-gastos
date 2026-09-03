'use client';

import { FaArrowDown, FaArrowUp, FaWallet } from 'react-icons/fa';

import { MonthlySummarySkeleton } from '@/app/components/pages/calendar';
import { formatCurrency } from '@/app/lib/currency/format-currency';
import type { CurrencyFinancialSummary } from '@/app/types/financial-summary';

interface MonthlySummaryProps {
  isLoading: boolean;
  additionalData: CurrencyFinancialSummary[];
}

const items = [
  {
    key: 'balance' as const,
    label: 'Saldo do mês',
    icon: FaWallet,
    iconSurface: 'bg-[var(--surface-subtle)]',
  },
  {
    key: 'income' as const,
    label: 'Receitas',
    icon: FaArrowUp,
    iconSurface: 'bg-[var(--primary-subtle)]',
  },
  {
    key: 'expense' as const,
    label: 'Despesas',
    icon: FaArrowDown,
    iconSurface: 'bg-[var(--danger-subtle)]',
  },
];

export default function MonthlySummary({ isLoading, additionalData }: MonthlySummaryProps) {
  if (isLoading) return <MonthlySummarySkeleton />;

  return (
    <dl className="grid border-b border-[var(--border-strong)] bg-[var(--surface)] grid-cols-3">
      {items.map((item, index) => {
        const Icon = item.icon;
        return (
          <div
            key={item.key}
            className={`grid sm:grid-cols-[40px_minmax(0,1fr)] items-start gap-x-3 px-4 py-4 sm:px-5 ${index > 0 ? 'border-t border-[var(--border)] sm:border-l sm:border-t-0' : ''}`}
          >
            <span
              className={`hidden sm:block row-span-2 flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-sm)] ${item.iconSurface}`}
              aria-hidden="true"
            >
              <Icon className="h-4 w-4" />
            </span>
            <dt className="min-w-0 text-sm font-semibold text-[var(--text-muted)]">
              {item.label}
            </dt>
            <dd className="mt-0.5 min-w-0">
              {additionalData.length === 0 ? (
                <span className="text-sm font-bold text-[var(--foreground)]">—</span>
              ) : (
                <ul className="space-y-0.5">
                  {additionalData.map((summary) => {
                    const value = summary[item.key];
                    const valueClass =
                      item.key === 'income'
                        ? 'text-[var(--income)]'
                        : item.key === 'expense' || (item.key === 'balance' && value < 0)
                          ? 'text-[var(--expense)]'
                          : 'text-[var(--foreground)]';

                    return (
                      <li key={summary.currency} className={`truncate text-sm font-bold tracking-tight sm:text-xl ${valueClass}`}>
                        {formatCurrency(value, summary.currency)}
                      </li>
                    );
                  })}
                </ul>
              )}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}
