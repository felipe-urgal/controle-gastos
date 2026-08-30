'use client';

import { FaArrowDown, FaArrowUp, FaWallet } from 'react-icons/fa';

import { formatCurrency } from '@/app/lib/currency/format-currency';

interface Summary {
  income: number;
  expense: number;
  balance: number;
}

interface Props {
  summary?: Summary;
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

export default function TransactionSummary({ summary, loading }: Props) {
  if (loading) {
    return (
      <div className="grid gap-3 md:grid-cols-3" role="status" aria-label="Carregando resumo financeiro">
        {[1, 2, 3].map((item) => (
          <div key={item} className="ds-panel h-[116px] animate-pulse bg-[var(--skeleton)]" />
        ))}
      </div>
    );
  }

  if (!summary) return null;

  return (
    <section aria-label="Resumo financeiro do período" className="grid gap-3 md:grid-cols-3">
      {metrics.map((metric) => {
        const Icon = metric.icon;
        const value = summary[metric.key];
        const balanceTone =
          metric.key === 'balance' && value < 0 ? 'text-[var(--expense)]' : metric.tone;

        return (
          <div key={metric.key} className="ds-panel flex min-h-[116px] items-center gap-4 p-4 sm:p-5">
            <span
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-md)] ${metric.iconSurface} ${balanceTone}`}
              aria-hidden="true"
            >
              <Icon className="h-4 w-4" />
            </span>

            <div className="min-w-0">
              <p className="text-sm font-medium text-[var(--text-muted)]">{metric.label}</p>
              <p className={`mt-1 truncate text-2xl font-bold tracking-tight ${balanceTone}`}>
                {formatCurrency(value)}
              </p>
            </div>
          </div>
        );
      })}
    </section>
  );
}
