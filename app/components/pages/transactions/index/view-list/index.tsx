'use client';

import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { FaArrowDown, FaArrowUp } from 'react-icons/fa';

import { IconRenderer } from '@/app/components/ui';
import { statusConfig } from '@/app/lib/constants/transaction.constants';
import { formatCurrency } from '@/app/lib/currency/format-currency';
import { highlightText } from '@/app/lib/string/highlight-text';
import { ViewProps } from '@/app/lib/interface/transaction.interface';

export default function ViewList({ transaction, searchTerm = '' }: ViewProps) {
  const transactionDate = new Date(transaction.year, transaction.month - 1, transaction.day);
  const isIncome = transaction.type === 'INCOME';
  const status = statusConfig[transaction.status as keyof typeof statusConfig];
  const installmentLabel =
    transaction.series?.type === 'INSTALLMENT' && transaction.seriesIndex
      ? `${transaction.seriesIndex}/${transaction.series.occurrenceCount}`
      : null;

  return (
    <div className="grid min-w-0 gap-4 md:grid-cols-[minmax(250px,1.7fr)_minmax(150px,1fr)_minmax(120px,.75fr)_auto] md:items-center">
      <div className="flex min-w-0 items-center gap-3">
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
          <div className="flex min-w-0 items-center gap-2">
            <p className="truncate text-base font-semibold text-[var(--foreground)]">
              {highlightText(transaction.description, searchTerm)}
            </p>
            {installmentLabel && (
              <span className="shrink-0 rounded-full border border-[var(--border-strong)] bg-[var(--surface-raised)] px-2 py-0.5 text-sm font-semibold text-[var(--text-muted)]">
                Parcela {installmentLabel}
              </span>
            )}
          </div>

          <div className="mt-1 flex min-w-0 items-center gap-2 text-sm text-[var(--text-muted)]">
            {transaction.category && (
              <>
                <span aria-hidden="true">
                  <IconRenderer
                    iconName={transaction.category.icon || 'tag'}
                    size={14}
                    color={transaction.category.color}
                  />
                </span>
                <span className="truncate">{transaction.category.name}</span>
                <span aria-hidden="true">•</span>
              </>
            )}
            <span className="truncate">{transaction.account.name}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 md:block">
        <span className="text-sm text-[var(--text-subtle)] md:hidden">Data</span>
        <span className="text-sm font-medium text-[var(--text-muted)]">
          {format(transactionDate, 'dd MMM yyyy', { locale: ptBR })}
        </span>
      </div>

      <div className="flex items-center justify-between gap-3 md:block">
        <span className="text-sm text-[var(--text-subtle)] md:hidden">Status</span>
        <span className={`inline-flex rounded-full border px-2.5 py-1 text-sm font-semibold ${status.color}`}>
          {status.label}
        </span>
      </div>

      <div className="flex items-end justify-between gap-3 md:block md:text-right">
        <span className="text-sm text-[var(--text-subtle)] md:hidden">Valor</span>
        <span
          className={`whitespace-nowrap text-lg font-bold tracking-tight ${
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
