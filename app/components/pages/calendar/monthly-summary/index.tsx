'use client';

import { FaArrowDown, FaArrowUp, FaWallet } from 'react-icons/fa';

import { MonthlySummarySkeleton } from '@/app/components/pages/calendar';
import { formatCurrency } from '@/app/lib/currency/format-currency';

interface MonthlySummaryProps {
  isLoading: boolean;
  additionalData: {
    income: number;
    expense: number;
    balance: number;
  };
}

export default function MonthlySummary({ isLoading, additionalData }: MonthlySummaryProps) {
  if (isLoading) return <MonthlySummarySkeleton />;

  const items = [
    {
      label: 'Saldo do mês',
      value: additionalData.balance,
      icon: FaWallet,
      valueClass:
        additionalData.balance < 0 ? 'text-[var(--expense)]' : 'text-[var(--foreground)]',
      iconSurface: 'bg-[var(--surface-subtle)]',
    },
    {
      label: 'Receitas',
      value: additionalData.income,
      icon: FaArrowUp,
      valueClass: 'text-[var(--income)]',
      iconSurface: 'bg-[var(--primary-subtle)]',
    },
    {
      label: 'Despesas',
      value: additionalData.expense,
      icon: FaArrowDown,
      valueClass: 'text-[var(--expense)]',
      iconSurface: 'bg-[var(--danger-subtle)]',
    },
  ];

  return (
    <dl className="grid border-b border-[var(--border-strong)] bg-[var(--surface)] sm:grid-cols-3">
      {items.map((item, index) => {
        const Icon = item.icon;
        return (
          <div
            key={item.label}
            className={`flex items-center gap-3 px-4 py-4 sm:px-5 ${index > 0 ? 'border-t border-[var(--border)] sm:border-l sm:border-t-0' : ''}`}
          >
            <span
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] ${item.iconSurface} ${item.valueClass}`}
              aria-hidden="true"
            >
              <Icon className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <dt className="text-sm font-semibold text-[var(--text-muted)]">{item.label}</dt>
              <dd className={`mt-0.5 truncate text-xl font-bold tracking-tight sm:text-2xl ${item.valueClass}`}>
                {formatCurrency(item.value)}
              </dd>
            </div>
          </div>
        );
      })}
    </dl>
  );
}
