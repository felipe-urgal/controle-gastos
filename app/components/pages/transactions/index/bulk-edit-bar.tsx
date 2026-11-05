'use client';

import { useState } from 'react';

import { Alert } from '@/app/components/feedback';
import { Button, Select } from '@/app/components/ui';
import { errorMessage } from '@/app/lib/error-message';
import { TRANSACTIONS_CHANGED_EVENT } from '@/app/lib/transactions/transaction-events';
import { transactionService } from '@/app/services/transaction-service';

type Option = { value: string; label: string };
type GroupedOptions = Array<{ label: string; options: Option[] }>;

/** Bolinha de seleção da linha: cheia quando marcada, apagada quando a linha não pode entrar no lote. */
export function SelectionMark({ selected, selectable }: { selected: boolean; selectable: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`grid h-5 w-5 place-items-center rounded-full border-2 text-xs font-bold ${
        selected
          ? 'border-[var(--primary)] bg-[var(--primary)] text-white'
          : selectable
            ? 'border-[var(--border-strong)]'
            : 'border-[var(--border)] opacity-40'
      }`}
    >
      {selected ? '✓' : ''}
    </span>
  );
}

const KEEP = '__keep__';
const CLEAR = '__clear__';

/**
 * Barra da edição em lote: troca a categoria e/ou o estabelecimento das transações selecionadas de uma vez.
 * É tudo ou nada no servidor; se alguma não puder mudar (mês travado, reconciliada, tipo diferente…), nada muda e a
 * mensagem aparece aqui.
 */
export default function BulkEditBar({
  selectedIds,
  categoryOptions,
  merchantOptions,
  onDone,
  onCancel,
}: {
  selectedIds: string[];
  categoryOptions: GroupedOptions;
  merchantOptions: Option[];
  onDone: () => void;
  onCancel: () => void;
}) {
  const [categoryId, setCategoryId] = useState<string>(KEEP);
  const [merchantId, setMerchantId] = useState<string>(KEEP);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const hasChange = categoryId !== KEEP || merchantId !== KEEP;

  async function apply() {
    setBusy(true);
    setError('');
    try {
      await transactionService.bulkUpdate(selectedIds, {
        ...(categoryId !== KEEP ? { categoryId } : {}),
        ...(merchantId !== KEEP ? { merchantId: merchantId === CLEAR ? null : merchantId } : {}),
      });
      window.dispatchEvent(new Event(TRANSACTIONS_CHANGED_EVENT));
      onDone();
    } catch (cause) {
      setError(errorMessage(cause, 'Não foi possível alterar as transações.'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      aria-label="Edição em lote"
      className="fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+4.5rem)] z-[var(--z-sheet)] mx-auto grid max-w-3xl gap-3 rounded-[var(--radius-lg)] border border-[var(--border-strong)] bg-[var(--surface)] p-4 shadow-[var(--shadow-elevated)] lg:bottom-6"
    >
      <p className="text-sm font-semibold">
        {selectedIds.length} {selectedIds.length === 1 ? 'transação selecionada' : 'transações selecionadas'}
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Select
          label="Categoria"
          value={categoryId}
          onChange={(value) => setCategoryId(String(value))}
          options={[{ label: 'Manter', options: [{ value: KEEP, label: 'Manter a atual' }] }, ...categoryOptions]}
          grouped
          disabled={busy}
        />
        <Select
          label="Estabelecimento"
          value={merchantId}
          onChange={(value) => setMerchantId(String(value))}
          options={[
            { value: KEEP, label: 'Manter o atual' },
            { value: CLEAR, label: 'Remover o estabelecimento' },
            ...merchantOptions,
          ]}
          disabled={busy}
        />
      </div>
      {error && <Alert variant="error" message={error} />}
      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={() => void apply()} isLoading={busy} disabled={busy || !hasChange || selectedIds.length === 0}>
          Aplicar
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel} disabled={busy}>Cancelar</Button>
      </div>
    </section>
  );
}
