'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';

import { ModalShell } from '@/app/components/overlays/modal-shell';
import {
  formatAmountInput,
  parseAmountInput,
} from '@/app/components/pages/recurrences/recurrences-center/recurrences-model';
import { Button, Input, MoneyInput } from '@/app/components/ui';
import type { RecurrenceSummaryItem, UpdateRecurrenceSeriesInput } from '@/app/types/recurrence';

export default function EditSeriesModal({
  item,
  onClose,
  onSave,
}: {
  item: RecurrenceSummaryItem;
  onClose: () => void;
  onSave: (input: UpdateRecurrenceSeriesInput) => Promise<void>;
}) {
  const [description, setDescription] = useState(item.description);
  const [amount, setAmount] = useState(() => formatAmountInput(item.amount));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const descriptionRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    descriptionRef.current?.focus();
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const amountCents = parseAmountInput(amount);
    if (!amountCents) {
      setError('Informe um valor válido com até duas casas decimais.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      await onSave({ description: description.trim(), amount: amountCents });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Não foi possível atualizar a recorrência.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalShell
      title="Editar série"
      eyebrow="Série recorrente"
      description="A alteração afeta somente as ocorrências pendentes. Histórico concluído, frequência e datas são preservados."
      onClose={onClose}
      closeDisabled={saving}
      maxWidthClass="max-w-md"
    >
      <form onSubmit={submit} className="space-y-4">
        <Input
          ref={descriptionRef}
          label="Descrição"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          minLength={2}
          maxLength={100}
          enterKeyHint="next"
          disabled={saving}
        />

        <div>
          <MoneyInput
            label={`Valor (${item.currency})`}
            aria-label={`Valor (${item.currency})`}
            currency={item.currency}
            value={amount}
            onValueChange={setAmount}
            enterKeyHint="done"
            disabled={saving}
            aria-describedby="edit-series-amount-help"
          />
          <span id="edit-series-amount-help" className="mt-1 block text-xs text-[var(--text-muted)]">
            Use vírgula para centavos.
          </span>
        </div>

        {error && (
          <p role="alert" className="text-sm font-semibold text-[var(--expense)]">
            {error}
          </p>
        )}

        <div className="flex flex-wrap justify-end gap-2 pt-1">
          <Button variant="outline" size="sm" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button size="sm" type="submit" disabled={saving || description.trim().length < 2}>
            {saving ? 'Salvando…' : 'Salvar série'}
          </Button>
        </div>
      </form>
    </ModalShell>
  );
}
