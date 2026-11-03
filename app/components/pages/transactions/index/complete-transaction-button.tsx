'use client';

import type { MouseEvent } from 'react';
import { useState } from 'react';
import { FaCheck } from 'react-icons/fa';

import { transactionService } from '@/app/services/transaction-service';
import type { TransactionDTO } from '@/app/types/transaction';

/** Só lançamentos normais e pendentes podem ser concluídos direto da lista (mesma regra da API). */
export function canCompleteFromList(transaction: Pick<TransactionDTO, 'kind' | 'status'>) {
  return transaction.kind === 'NORMAL' && transaction.status === 'PENDING';
}

/**
 * Conclui um lançamento pendente sem abrir a transação. Fica dentro do link da linha,
 * então o clique não pode navegar.
 */
export function CompleteTransactionButton({
  transaction,
  onCompleted,
}: {
  transaction: Pick<TransactionDTO, 'id' | 'description'>;
  onCompleted: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function complete(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      await transactionService.complete(transaction.id);
      onCompleted();
    } catch (cause) {
      setError(cause instanceof Error && cause.message ? cause.message : 'Não foi possível concluir.');
      setSaving(false);
    }
  }

  return (
    <button
      type="button"
      onClick={complete}
      disabled={saving}
      title={error ?? undefined}
      aria-label={`Marcar como concluída: ${transaction.description || 'Sem descrição'}`}
      className={`inline-flex min-h-8 items-center gap-1.5 rounded-full border px-2.5 text-xs font-bold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)] disabled:cursor-wait disabled:opacity-60 ${
        error
          ? 'border-[var(--expense)]/40 bg-[var(--danger-subtle)] text-[var(--expense)]'
          : 'border-[var(--warning)]/35 bg-[var(--warning-subtle)] text-[var(--pending)] hover:border-[var(--income)]/40 hover:text-[var(--income)]'
      }`}
    >
      <FaCheck aria-hidden="true" />
      {saving ? 'Concluindo…' : error ? 'Tentar de novo' : 'Concluir'}
      {error && <span role="alert" className="sr-only">{error}</span>}
    </button>
  );
}
