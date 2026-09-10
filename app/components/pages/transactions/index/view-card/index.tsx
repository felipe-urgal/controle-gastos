'use client';

import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { FaArrowDown, FaArrowUp, FaExchangeAlt } from 'react-icons/fa';

import { IconRenderer } from '@/app/components/ui';
import { statusConfig } from '@/app/lib/constants/transaction.constants';
import { formatCurrency } from '@/app/lib/currency/format-currency';
import { highlightText } from '@/app/lib/string/highlight-text';
import { ViewProps } from '@/app/lib/interface/transaction.interface';
import {
  getTransferCounterpartLabel,
  isTransferTransaction,
} from '@/app/lib/transactions/transaction-presentation';

export default function ViewCard({ transaction, searchTerm = '' }: ViewProps) {
  const transactionDate = new Date(transaction.year, transaction.month - 1, transaction.day);
  const isIncome = transaction.type === 'INCOME';
  const isTransfer = isTransferTransaction(transaction);
  const status = statusConfig[transaction.status as keyof typeof statusConfig];
  const installmentLabel =
    transaction.series?.type === 'INSTALLMENT' && transaction.seriesIndex
      ? `${transaction.seriesIndex}/${transaction.series.occurrenceCount}`
      : null;
  const iconTone = isTransfer
    ? 'bg-[var(--orbit-primary-subtle)] text-[var(--orbit-primary)]'
    : isIncome
      ? 'bg-[var(--primary-subtle)] text-[var(--income)]'
      : 'bg-[var(--danger-subtle)] text-[var(--expense)]';
  const amountTone = isTransfer
    ? 'text-[var(--orbit-primary)]'
    : isIncome
      ? 'text-[var(--income)]'
      : 'text-[var(--expense)]';

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-md)] ${iconTone}`} aria-hidden="true">
            {isTransfer ? <FaExchangeAlt /> : isIncome ? <FaArrowUp /> : <FaArrowDown />}
          </span>

          <div className="min-w-0">
            <h3 className="break-words text-base font-semibold leading-snug text-[var(--foreground)] sm:line-clamp-2">
              {highlightText(transaction.description, searchTerm)}
            </h3>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-[var(--text-muted)]">
              <span className="min-w-0 break-words">{transaction.account.name}</span>
              {installmentLabel && (
                <span className="rounded-full border border-[var(--border-strong)] bg-[var(--surface-raised)] px-2 py-0.5 font-semibold">
                  Parcela {installmentLabel}
                </span>
              )}
            </div>
          </div>
        </div>

        <span className={`shrink-0 rounded-full border px-2.5 py-1 text-sm font-semibold ${status.color}`}>
          {status.label}
        </span>
      </div>

      {isTransfer ? (
        <div className="flex min-w-0 items-center gap-2 text-sm text-[var(--text-muted)]">
          <FaExchangeAlt className="shrink-0 text-[var(--orbit-primary)]" aria-hidden="true" />
          <span className="min-w-0 break-words">{getTransferCounterpartLabel(transaction)}</span>
        </div>
      ) : transaction.category ? (
        <div className="flex min-w-0 items-center gap-2 text-sm text-[var(--text-muted)]">
          <span aria-hidden="true">
            <IconRenderer
              iconName={transaction.category.icon || 'tag'}
              size={14}
              color={transaction.category.color}
            />
          </span>
          <span className="min-w-0 break-words">{transaction.category.name}</span>
        </div>
      ) : null}

      <div className="flex flex-col items-start gap-2 border-t border-[var(--border)] pt-4 min-[360px]:flex-row min-[360px]:items-end min-[360px]:justify-between">
        <span className="text-sm font-medium text-[var(--text-muted)]">
          {format(transactionDate, 'dd MMM yyyy', { locale: ptBR })}
        </span>
        <span className={`max-w-full text-right text-xl font-bold tracking-tight [overflow-wrap:anywhere] ${amountTone}`}>
          {isIncome ? '+' : '-'}
          {formatCurrency(transaction.amount, transaction.account.currency)}
        </span>
      </div>
    </div>
  );
}
