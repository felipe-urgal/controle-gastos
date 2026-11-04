'use client';

import { useEffect, useRef, useState } from 'react';

import { Button } from '@/app/components/ui';
import { errorMessage } from '@/app/lib/error-message';
import { TRANSACTIONS_CHANGED_EVENT } from '@/app/lib/transactions/transaction-events';
import { takeDeletedTransaction, type DeletedTransactionNotice } from '@/app/lib/transactions/undo-delete';
import { transactionService } from '@/app/services/transaction-service';

type State =
  | { kind: 'hidden' }
  | { kind: 'offer'; notice: DeletedTransactionNotice }
  | { kind: 'restoring'; notice: DeletedTransactionNotice }
  | { kind: 'restored'; description: string }
  | { kind: 'failed'; message: string };

/**
 * Depois de excluir um lançamento na tela de detalhe, a lista abre com este aviso por 10 segundos:
 * "Desfazer" recria o lançamento com os mesmos dados (ele ganha um novo identificador).
 */
export function DeletedTransactionUndo() {
  const [state, setState] = useState<State>({ kind: 'hidden' });
  // Uma chave por oferta: um duplo clique (ou nova tentativa) não recria o lançamento duas vezes.
  const idempotencyKey = useRef<string>('');

  useEffect(() => {
    let hideTimer: number | undefined;
    // Lido depois da hidratação (o armazenamento da aba só existe no navegador).
    const readTimer = window.setTimeout(() => {
      const taken = takeDeletedTransaction();
      if (!taken) return;

      idempotencyKey.current = crypto.randomUUID();
      setState({ kind: 'offer', notice: taken.notice });
      hideTimer = window.setTimeout(
        () => setState((current) => (current.kind === 'offer' ? { kind: 'hidden' } : current)),
        taken.remainingMs,
      );
    }, 0);

    return () => {
      window.clearTimeout(readTimer);
      window.clearTimeout(hideTimer);
    };
  }, []);

  async function undo(notice: DeletedTransactionNotice) {
    setState({ kind: 'restoring', notice });
    try {
      await transactionService.createIdempotent(notice.payload, idempotencyKey.current);
      window.dispatchEvent(new Event(TRANSACTIONS_CHANGED_EVENT));
      setState({ kind: 'restored', description: notice.description });
    } catch (error) {
      setState({ kind: 'failed', message: errorMessage(error, 'Não foi possível desfazer a exclusão.') });
    }
  }

  if (state.kind === 'hidden') return null;

  const box =
    'mb-4 flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-md)] border px-4 py-3 text-sm';

  if (state.kind === 'failed') {
    return (
      <div role="alert" className={`${box} border-[var(--danger)]/35 bg-[var(--danger-subtle)] text-[var(--expense)]`}>
        <span>{state.message}</span>
      </div>
    );
  }

  if (state.kind === 'restored') {
    return (
      <div role="status" className={`${box} border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)]`}>
        <span>“{state.description}” foi restaurada.</span>
      </div>
    );
  }

  return (
    <div role="status" className={`${box} border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)]`}>
      <span className="min-w-0 break-words">“{state.notice.description}” foi excluída.</span>
      <Button
        type="button"
        size="sm"
        variant="secondary"
        isLoading={state.kind === 'restoring'}
        onClick={() => void undo(state.notice)}
      >
        Desfazer
      </Button>
    </div>
  );
}
