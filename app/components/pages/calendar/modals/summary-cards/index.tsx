'use client';

import { FaArrowDown, FaArrowUp, FaWallet } from 'react-icons/fa';

import { formatCurrency } from '@/app/lib/currency/format-currency';
import type { CurrencyFinancialSummary } from '@/app/types/financial-summary';

interface SummaryCardsProps {
  summaries: CurrencyFinancialSummary[];
  showBalance?: boolean;
}

export default function SummaryCards({
  summaries,
  showBalance = true,
}: SummaryCardsProps) {
  const items = [
    ...(showBalance
      ? [
          {
            key: 'balance' as const,
            label: 'Saldo concluído do dia',
            icon: FaWallet,
          },
        ]
      : []),
    {
      key: 'income' as const,
      label: 'Receitas concluídas',
      icon: FaArrowUp,
    },
    {
      key: 'expense' as const,
      label: 'Despesas concluídas',
      icon: FaArrowDown,
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
            key={item.key}
            className={`px-4 py-3.5 sm:px-5 ${index > 0 ? 'border-t border-[var(--border)] sm:border-l sm:border-t-0' : ''}`}
          >
            <dt className="flex items-center gap-2 text-sm font-medium text-[var(--text-muted)]">
              <Icon className="h-4 w-4 text-[var(--text-subtle)]" aria-hidden="true" />
              {item.label}
            </dt>
            <dd className="mt-1.5">
              {summaries.length === 0 ? (
                <span className="text-xl font-bold tracking-tight text-[var(--foreground)]">—</span>
              ) : (
                <ul className="space-y-0.5">
                  {summaries.map((summary) => {
                    const value = summary[item.key];
                    const valueClass =
                      item.key === 'income'
                        ? 'text-[var(--income)]'
                        : item.key === 'expense' || (item.key === 'balance' && value < 0)
                          ? 'text-[var(--expense)]'
                          : 'text-[var(--foreground)]';

                    return (
                      <li key={summary.currency} className={`text-lg font-bold tracking-tight ${valueClass}`}>
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
