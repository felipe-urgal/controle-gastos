'use client';

import { FaArrowDown, FaArrowUp, FaWallet } from 'react-icons/fa';

import { formatCurrency } from '@/app/lib/currency/format-currency';
import type { CurrencyFinancialSummary } from '@/app/types/financial-summary';

interface Props {
  summary?: CurrencyFinancialSummary[];
  loading?: boolean;
}

const metrics = [
  {
    key: 'income' as const,
    label: 'Receitas',
    icon: FaArrowUp,
    tone: 'text-[var(--income)]',
    iconSurface: 'bg-[var(--primary-subtle)]',
  },
  {
    key: 'expense' as const,
    label: 'Despesas',
    icon: FaArrowDown,
    tone: 'text-[var(--expense)]',
    iconSurface: 'bg-[var(--danger-subtle)]',
  },
  {
    key: 'balance' as const,
    label: 'Saldo do período',
    icon: FaWallet,
    tone: 'text-[var(--foreground)]',
    iconSurface: 'bg-[var(--surface-subtle)]',
  },
];

export default function TransactionSummary({ summary = [], loading }: Props) {
  if (loading) {
    return (
      <div className="grid gap-3 md:grid-cols-3" role="status" aria-label="Carregando resumo financeiro">
        {[1, 2, 3].map((item) => (
          <div key={item} className="ds-panel h-[116px] animate-pulse bg-[var(--skeleton)]" />
        ))}
      </div>
    );
  }

  return (
    <section aria-label="Resumo financeiro do período por moeda" className="grid gap-3 grid-cols-3">
      {metrics.map((metric) => {
        const Icon = metric.icon;

        return (
          <div key={metric.key} className="ds-panel flex items-start gap-4 p-4 sm:p-5">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-[var(--text-muted)]">{metric.label}</p>
              {summary.length === 0 ? (
                <p className="mt-1 text-2xl font-bold tracking-tight text-[var(--foreground)]">—</p>
              ) : (
                <ul className="mt-1 space-y-1">
                  {summary.map((item) => {
                    const value = item[metric.key];
                    const tone =
                      metric.key === 'balance' && value < 0
                        ? 'text-[var(--expense)]'
                        : metric.tone;

                    return (
                      <li key={item.currency} className={`text-sm sm:truncate sm:text-xl font-bold tracking-tight ${tone}`}>
                        {formatCurrency(value, item.currency)}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        );
      })}
    </section>
  );
}
