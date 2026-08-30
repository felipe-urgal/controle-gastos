'use client';

import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { FaArrowDown, FaArrowUp } from 'react-icons/fa';

import { IconRenderer } from '@/app/components/ui';
import { statusConfig } from '@/app/lib/constants/transaction.constants';
import { formatCurrency } from '@/app/lib/currency/format-currency';
import { highlightText } from '@/app/lib/string/highlight-text';
import { ViewProps } from '@/app/lib/interface/transaction.interface';

export default function ViewCard({ transaction, searchTerm = '' }: ViewProps) {
  const transactionDate = new Date(transaction.year, transaction.month - 1, transaction.day);
  const isIncome = transaction.type === 'INCOME';
  const status = statusConfig[transaction.status as keyof typeof statusConfig];

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <span
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-md)] ${
              isIncome
                ? 'bg-[var(--primary-subtle)] text-[var(--income)]'
                : 'bg-[var(--danger-subtle)] text-[var(--expense)]'
            }`}
            aria-hidden="true"
          >
            {isIncome ? <FaArrowUp /> : <FaArrowDown />}
          </span>

          <div className="min-w-0">
            <h3 className="line-clamp-2 text-base font-semibold leading-snug text-[var(--foreground)]">
              {highlightText(transaction.description, searchTerm)}
            </h3>
            <p className="mt-1 truncate text-sm text-[var(--text-muted)]">{transaction.account.name}</p>
          </div>
        </div>

        <span className={`shrink-0 rounded-full border px-2.5 py-1 text-sm font-semibold ${status.color}`}>
          {status.label}
        </span>
      </div>

      {transaction.category && (
        <div className="flex min-w-0 items-center gap-2 text-sm text-[var(--text-muted)]">
          <span aria-hidden="true">
            <IconRenderer
              iconName={transaction.category.icon || 'tag'}
              size={14}
              color={transaction.category.color}
            />
          </span>
          <span className="truncate">{transaction.category.name}</span>
        </div>
      )}

      <div className="flex items-end justify-between gap-4 border-t border-[var(--border)] pt-4">
        <span className="text-sm font-medium text-[var(--text-muted)]">
          {format(transactionDate, 'dd MMM yyyy', { locale: ptBR })}
        </span>
        <span
          className={`text-xl font-bold tracking-tight ${
            isIncome ? 'text-[var(--income)]' : 'text-[var(--expense)]'
          }`}
        >
          {isIncome ? '+' : '-'}
          {formatCurrency(transaction.amount, transaction.account.currency)}
        </span>
      </div>
    </div>
  );
}
