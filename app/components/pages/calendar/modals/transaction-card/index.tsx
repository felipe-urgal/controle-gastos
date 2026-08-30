'use client';

import {
  FaArrowDown,
  FaArrowUp,
  FaEdit,
  FaTag,
  FaTrash,
  FaWallet,
} from 'react-icons/fa';

import { Button } from '@/app/components/ui';
import { statusConfig } from '@/app/lib/constants/transaction.constants';
import { formatCurrency } from '@/app/lib/currency/format-currency';
import { Transaction } from '@/app/types/calendar';

interface TransactionCardProps {
  transaction: Transaction;
  onEdit?: (transaction: Transaction) => void;
  onDelete?: (transaction: Transaction) => void;
  isBusy?: boolean;
}

export default function TransactionCard({
  transaction,
  onEdit,
  onDelete,
  isBusy = false,
}: TransactionCardProps) {
  const isIncome = transaction.type === 'INCOME';
  const status =
    statusConfig[transaction.status as keyof typeof statusConfig] || statusConfig.COMPLETED;

  return (
    <article className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-raised)] p-4 sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
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
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate text-base font-semibold text-[var(--foreground)]">
                {transaction.description || 'Sem descrição'}
              </h3>
              <span className={`rounded-full border px-2.5 py-1 text-sm font-semibold ${status.color}`}>
                {status.label}
              </span>
            </div>

            <div className="mt-2 flex min-w-0 flex-wrap gap-x-4 gap-y-2 text-sm text-[var(--text-muted)]">
              {transaction.category?.name && (
                <span className="inline-flex min-w-0 items-center gap-1.5">
                  <FaTag className="shrink-0 text-[var(--text-subtle)]" aria-hidden="true" />
                  <span className="truncate">{transaction.category.name}</span>
                </span>
              )}
              {transaction.account?.name && (
                <span className="inline-flex min-w-0 items-center gap-1.5">
                  <FaWallet className="shrink-0 text-[var(--text-subtle)]" aria-hidden="true" />
                  <span className="truncate">{transaction.account.name}</span>
                </span>
              )}
            </div>
          </div>
        </div>

        <p
          className={`whitespace-nowrap text-xl font-bold tracking-tight sm:text-right ${
            isIncome ? 'text-[var(--income)]' : 'text-[var(--expense)]'
          }`}
        >
          {isIncome ? '+' : '−'}
          {formatCurrency(Number(transaction.amount) || 0)}
        </p>
      </div>

      {(onEdit || onDelete) && (
        <div className="mt-4 flex flex-wrap justify-end gap-2 border-t border-[var(--border)] pt-3">
          {onEdit && (
            <Button
              variant="outline"
              size="sm"
              icon={<FaEdit />}
              onClick={() => onEdit(transaction)}
              disabled={isBusy}
            >
              Editar
            </Button>
          )}
          {onDelete && (
            <Button
              variant="ghost"
              size="sm"
              icon={<FaTrash />}
              onClick={() => onDelete(transaction)}
              disabled={isBusy}
              className="text-[var(--expense)] hover:bg-[var(--danger-subtle)] hover:text-[var(--expense)]"
            >
              Remover
            </Button>
          )}
        </div>
      )}
    </article>
  );
}
