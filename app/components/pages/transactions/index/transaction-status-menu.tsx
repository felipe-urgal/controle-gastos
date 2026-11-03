'use client';

import type { MouseEvent } from 'react';
import { useEffect, useRef, useState } from 'react';
import { FaCheck, FaChevronDown } from 'react-icons/fa';

import { transactionService, type TransactionStatusValue } from '@/app/services/transaction-service';
import type { TransactionDTO } from '@/app/types/transaction';

const LABEL: Record<TransactionStatusValue, string> = {
  COMPLETED: 'Concluída',
  PENDING: 'Pendente',
  CANCELLED: 'Cancelada',
};

const TONE: Record<TransactionStatusValue, string> = {
  COMPLETED: 'border-[var(--border-strong)] bg-[var(--surface-subtle)] text-[var(--text-muted)]',
  PENDING: 'border-[var(--warning)]/35 bg-[var(--warning-subtle)] text-[var(--pending)]',
  CANCELLED: 'border-[var(--border-strong)] bg-[var(--surface-subtle)] text-[var(--text-muted)]',
};

/** Só lançamento normal e não reconciliado muda de status direto da lista (mesma regra da API). */
export function canChangeStatusFromList(
  transaction: Pick<TransactionDTO, 'kind' | 'reconciliationStatus'>,
) {
  return transaction.kind === 'NORMAL' && transaction.reconciliationStatus !== 'RECONCILED';
}

/**
 * Chip com o status atual que abre um menu para trocá-lo (concluída, pendente, cancelada) sem abrir
 * a transação. Fica dentro do link da linha, então os cliques não podem navegar.
 * `compact` mostra só o ícone quando a transação já está concluída.
 */
export function TransactionStatusMenu({
  transaction,
  onChanged,
  compact = false,
}: {
  transaction: Pick<TransactionDTO, 'id' | 'description' | 'status'>;
  onChanged: () => void;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const rootRef = useRef<HTMLSpanElement>(null);
  const current = transaction.status as TransactionStatusValue;
  const options = (Object.keys(LABEL) as TransactionStatusValue[]).filter((status) => status !== current);
  const name = transaction.description || 'Sem descrição';

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  function swallow(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
  }

  async function choose(event: MouseEvent, status: TransactionStatusValue) {
    swallow(event);
    setOpen(false);
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      await transactionService.updateStatus(transaction.id, status);
      onChanged();
    } catch (cause) {
      setError(cause instanceof Error && cause.message ? cause.message : 'Não foi possível alterar o status.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <span ref={rootRef} className="relative inline-flex flex-col items-end" onClick={swallow}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Status: ${LABEL[current]}. Alterar status de ${name}`}
        disabled={saving}
        onClick={(event) => {
          swallow(event);
          setOpen((value) => !value);
        }}
        className={`inline-flex min-h-8 items-center gap-1.5 rounded-full border px-2.5 text-xs font-bold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)] disabled:cursor-wait disabled:opacity-60 ${
          error ? 'border-[var(--expense)]/40 bg-[var(--danger-subtle)] text-[var(--expense)]' : TONE[current]
        }`}
      >
        {compact && current === 'COMPLETED' ? <FaCheck aria-hidden="true" /> : saving ? 'Salvando…' : LABEL[current]}
        <FaChevronDown aria-hidden="true" className="text-[10px]" />
      </button>
      {open && (
        <span
          role="menu"
          className="absolute right-0 top-[calc(100%+4px)] z-30 grid min-w-[10.5rem] rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] p-1 text-left shadow-[var(--shadow-surface)]"
        >
          {options.map((status) => (
            <button
              key={status}
              type="button"
              role="menuitem"
              onClick={(event) => void choose(event, status)}
              className="min-h-10 rounded-[var(--radius-sm)] px-3 text-left text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--surface-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--focus)]"
            >
              Marcar como {LABEL[status].toLowerCase()}
            </button>
          ))}
        </span>
      )}
      {error && <span role="alert" className="mt-1 max-w-[12rem] text-right text-xs text-[var(--expense)]">{error}</span>}
    </span>
  );
}
