'use client';

import { FormEvent, useCallback, useState } from 'react';
import { FaCheck } from 'react-icons/fa';

import { ModalShell } from '@/app/components/overlays/modal-shell';
import { Button, Input } from '@/app/components/ui';
import type { CategoryMonthlyLimitItem } from '@/app/types/category-monthly-limit';
import type { SupportedCurrency } from '@/app/types/financial-summary';

export function LimitEditorModal({
  item,
  currency,
  value,
  fieldError,
  saving,
  removing,
  onValueChange,
  onClose,
  onSubmit,
  onRemove,
}: {
  item: CategoryMonthlyLimitItem;
  currency: SupportedCurrency;
  value: string;
  fieldError: string;
  saving: boolean;
  removing: boolean;
  onValueChange: (value: string) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent) => void;
  onRemove: () => void;
}) {
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  const busy = saving || removing;
  const close = useCallback(() => {
    if (!busy) onClose();
  }, [busy, onClose]);

  return (
    <ModalShell
      title={`${item.limit ? 'Editar limite' : 'Definir limite'} — ${item.category.name}`}
      description={`Moeda do recorte: ${currency}`}
      onClose={close}
      closeDisabled={busy}
      maxWidthClass="max-w-[520px]"
    >
      <form className="mt-4" onSubmit={onSubmit}>
        <Input
          label={`Valor do limite em ${currency}`}
          inputMode="decimal"
          placeholder="Ex.: 800,00"
          value={value}
          onChange={(event) => onValueChange(event.currentTarget.value)}
          error={fieldError}
          autoFocus
        />

        {item.limit && (
          <div className="mt-4 rounded-[12px] border border-[var(--border)] bg-[var(--surface-raised)] p-3">
            {confirmingRemove ? (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-[var(--text-muted)]">Remover o limite deste mês? O gasto continua registrado.</p>
                <div className="flex gap-2">
                  <Button type="button" variant="secondary" size="sm" onClick={() => setConfirmingRemove(false)} disabled={busy}>Voltar</Button>
                  <Button type="button" variant="danger" size="sm" onClick={onRemove} isLoading={removing} loadingText="Removendo">Confirmar remoção</Button>
                </div>
              </div>
            ) : (
              <Button type="button" variant="ghost" size="sm" onClick={() => setConfirmingRemove(true)} disabled={busy}>Remover limite</Button>
            )}
          </div>
        )}

        <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={close} disabled={busy}>Cancelar</Button>
          <Button type="submit" icon={<FaCheck />} isLoading={saving} loadingText="Salvando" disabled={removing}>Salvar limite</Button>
        </div>
      </form>
    </ModalShell>
  );
}
