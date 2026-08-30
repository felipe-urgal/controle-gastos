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
    },
    {
      label: 'Receitas',
      value: additionalData.income,
      icon: FaArrowUp,
      valueClass: 'text-[var(--income)]',
    },
    {
      label: 'Despesas',
      value: additionalData.expense,
      icon: FaArrowDown,
      valueClass: 'text-[var(--expense)]',
    },
  ];

  return (
    <dl className="grid border-b border-[var(--border)] sm:grid-cols-3">
      {items.map((item, index) => {
        const Icon = item.icon;
        return (
          <div
            key={item.label}
            className={`px-4 py-4 sm:px-5 ${index > 0 ? 'border-t border-[var(--border)] sm:border-l sm:border-t-0' : ''}`}
          >
            <dt className="flex items-center gap-2 text-sm font-medium text-[var(--text-muted)]">
              <Icon className="h-4 w-4 text-[var(--text-subtle)]" aria-hidden="true" />
              {item.label}
            </dt>
            <dd className={`mt-2 text-2xl font-bold tracking-tight ${item.valueClass}`}>
              {formatCurrency(item.value)}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}
