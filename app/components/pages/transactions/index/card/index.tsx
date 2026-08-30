'use client';

import { useState } from 'react';
import Link from 'next/link';
import { FaCheck, FaCopy, FaExternalLinkAlt } from 'react-icons/fa';

import { ViewCard, ViewList } from '@/app/components/pages/transactions';
import { canCompleteTransaction } from '@/app/lib/transactions/transaction-quick-actions';
import { TransactionCardProps } from '@/app/lib/interface/transaction.interface';
import { transactionService } from '@/app/services/transaction-service';

export default function TransactionCard({
  transaction,
  viewMode = 'list',
  searchTerm = '',
  onChanged,
}: TransactionCardProps) {
  const [isCompleting, setIsCompleting] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  async function handleComplete() {
    if (isCompleting) return;

    setIsCompleting(true);
    setFeedback(null);

    try {
      await transactionService.complete(transaction.id);

      try {
        await onChanged?.();
        setFeedback({ type: 'success', message: 'Transação concluída.' });
      } catch {
        setFeedback({
          type: 'success',
          message: 'Transação concluída. Atualize a lista para rever os totais.',
        });
      }
    } catch (error) {
      setFeedback({
        type: 'error',
        message:
          error instanceof Error
            ? error.message
            : 'Não foi possível concluir a transação.',
      });
    } finally {
      setIsCompleting(false);
    }
  }

  const canComplete = canCompleteTransaction(transaction.status);

  return (
    <article className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] transition-colors hover:border-[var(--border-strong)]">
      <Link
        href={`/transacoes/show/${transaction.id}`}
        className="block p-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--focus)] sm:p-5"
        aria-label={`Abrir detalhes da transação ${transaction.description}`}
      >
        {viewMode === 'list' ? (
          <ViewList transaction={transaction} searchTerm={searchTerm} />
        ) : (
          <ViewCard transaction={transaction} searchTerm={searchTerm} />
        )}
      </Link>

      <div className="flex flex-col gap-3 border-t border-[var(--border)] bg-[var(--surface-raised)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="flex flex-wrap items-center gap-1.5">
          <Link
            href={`/transacoes/show/${transaction.id}`}
            className="inline-flex min-h-11 items-center gap-2 rounded-[var(--radius-md)] px-3 py-2 text-sm font-semibold text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]"
          >
            <FaExternalLinkAlt aria-hidden="true" />
            <span>Detalhes</span>
          </Link>

          <Link
            href={`/transacoes/nova?duplicate=${encodeURIComponent(transaction.id)}`}
            className="inline-flex min-h-11 items-center gap-2 rounded-[var(--radius-md)] px-3 py-2 text-sm font-semibold text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]"
            aria-label={`Duplicar transação ${transaction.description}`}
          >
            <FaCopy aria-hidden="true" />
            <span>Duplicar</span>
          </Link>

          {canComplete && (
            <button
              type="button"
              onClick={handleComplete}
              disabled={isCompleting}
              className="inline-flex min-h-11 items-center gap-2 rounded-[var(--radius-md)] px-3 py-2 text-sm font-semibold text-[var(--income)] transition-colors hover:bg-[var(--primary-subtle)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)] disabled:cursor-wait disabled:opacity-60"
              aria-label={`Concluir transação ${transaction.description}`}
            >
              <FaCheck aria-hidden="true" />
              <span>{isCompleting ? 'Concluindo...' : 'Concluir'}</span>
            </button>
          )}
        </div>

        {feedback && (
          <span
            role={feedback.type === 'error' ? 'alert' : 'status'}
            className={`text-sm font-medium ${
              feedback.type === 'error' ? 'text-[var(--expense)]' : 'text-[var(--income)]'
            }`}
          >
            {feedback.message}
          </span>
        )}
      </div>
    </article>
  );
}
