'use client';

import { useState } from 'react';
import { FaCheck } from 'react-icons/fa';

import { ChipMenu } from '@/app/components/ui/chip-menu';
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
 * Status atual da transação como chip; o menu troca para concluída, pendente ou cancelada sem abrir
 * a transação. `compact` mostra só o ícone quando já está concluída.
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
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const current = transaction.status as TransactionStatusValue;
  const name = transaction.description || 'Sem descrição';

  async function change(status: TransactionStatusValue) {
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
    <ChipMenu
      ariaLabel={`Status: ${LABEL[current]}. Alterar status de ${name}`}
      toneClass={TONE[current]}
      disabled={saving}
      error={error}
      content={compact && current === 'COMPLETED' ? <FaCheck aria-hidden="true" /> : saving ? 'Salvando…' : LABEL[current]}
      items={(Object.keys(LABEL) as TransactionStatusValue[])
        .filter((status) => status !== current)
        .map((status) => ({
          key: status,
          label: `Marcar como ${LABEL[status].toLowerCase()}`,
          onSelect: () => void change(status),
        }))}
    />
  );
}
