'use client';

import { FaArrowDown, FaArrowUp, FaWallet } from 'react-icons/fa';

import { formatCurrency } from '@/app/lib/currency/format-currency';

interface SummaryCardsProps {
  totalIncome?: number;
  totalExpenses?: number;
  showBalance?: boolean;
}

export default function SummaryCards({
  totalIncome = 0,
  totalExpenses = 0,
  showBalance = true,
}: SummaryCardsProps) {
  const balance = totalIncome - totalExpenses;
  const items = [
    ...(showBalance
      ? [
          {
            label: 'Saldo concluído do dia',
            value: balance,
            icon: FaWallet,
            valueClass: balance < 0 ? 'text-[var(--expense)]' : 'text-[var(--foreground)]',
          },
        ]
      : []),
    {
      label: 'Receitas concluídas',
      value: totalIncome,
      icon: FaArrowUp,
      valueClass: 'text-[var(--income)]',
    },
    {
      label: 'Despesas concluídas',
      value: totalExpenses,
      icon: FaArrowDown,
      valueClass: 'text-[var(--expense)]',
    },
  ];

  return (
    <dl
      className={`grid border-b border-[var(--border)] ${items.length === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}
    >
      {items.map((item, index) => {
        const Icon = item.icon;
        return (
          <div
            key={item.label}
            className={`px-4 py-3.5 sm:px-5 ${index > 0 ? 'border-t border-[var(--border)] sm:border-l sm:border-t-0' : ''}`}
          >
            <dt className="flex items-center gap-2 text-sm font-medium text-[var(--text-muted)]">
              <Icon className="h-4 w-4 text-[var(--text-subtle)]" aria-hidden="true" />
              {item.label}
            </dt>
            <dd className={`mt-1.5 text-xl font-bold tracking-tight ${item.valueClass}`}>
              {formatCurrency(item.value)}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}
