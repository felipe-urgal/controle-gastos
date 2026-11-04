'use client';

import { useEffect, useState } from 'react';

import { ModalShell } from '@/app/components/overlays/modal-shell';
import { Button, Input } from '@/app/components/ui';
import { PeriodPicker, formatBrDate, usePeriodRange } from '@/app/components/pages/transactions/index/period-picker';
import { transactionService, type ClearPeriodPreview } from '@/app/services/transaction-service';
import { errorMessage } from '@/app/lib/error-message';

const CONFIRMATION_WORD = 'LIMPAR';

export function ClearPeriodDialog({
  month,
  year,
  accountId,
  accountName,
  onClose,
  onCleared,
}: {
  month: number;
  year: number;
  accountId?: string;
  accountName?: string;
  onClose: () => void;
  onCleared: () => void;
}) {
  const [confirmation, setConfirmation] = useState('');
  const picker = usePeriodRange(month, year, () => setConfirmation(''));
  const { range, valid: rangeValid } = picker;
  const [result, setResult] = useState<{ key: string; data?: ClearPeriodPreview; error?: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const key = `${range.from}|${range.to}|${accountId ?? ''}`;

  // O resultado só vale para o período que o gerou; trocar o período volta a "calculando".
  const current = result?.key === key ? result : null;
  const preview = current?.data ?? null;
  const loading = rangeValid && !current;
  const canDelete =
    !!preview && preview.deletable > 0 && confirmation.trim().toUpperCase() === CONFIRMATION_WORD && !deleting;

  useEffect(() => {
    if (!rangeValid) return;

    let active = true;
    transactionService
      .previewClearPeriod({ ...range, accountId })
      .then((response) => {
        if (active) setResult({ key, data: response.data });
      })
      .catch((cause) => {
        if (active) setResult({ key, error: errorMessage(cause, 'Não foi possível calcular o impacto.') });
      });
    return () => {
      active = false;
    };
  }, [range, rangeValid, accountId, key]);

  async function handleClear() {
    if (!preview || !canDelete) return;
    setDeleting(true);
    setError(null);
    try {
      await transactionService.clearPeriod({ ...range, accountId, expectedCount: preview.deletable });
      onCleared();
    } catch (cause) {
      setError(errorMessage(cause, 'Não foi possível limpar o período.'));
      setDeleting(false);
    }
  }

  return (
    <ModalShell
      title="Limpar período"
      description={`${formatBrDate(range.from)} a ${formatBrDate(range.to)} · ${accountName ?? 'Todas as contas'}`}
      closeLabel="Fechar"
      closeDisabled={deleting}
      maxWidthClass="sm:max-w-[480px]"
      onClose={onClose}
      footer={
        <div className="grid grid-cols-2 gap-2 sm:flex sm:justify-end">
          <Button variant="secondary" onClick={onClose} disabled={deleting}>Cancelar</Button>
          <Button variant="danger" onClick={handleClear} disabled={!canDelete} isLoading={deleting}>
            Excluir {preview?.deletable ?? 0}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <PeriodPicker state={picker} disabled={deleting} />

        {!rangeValid ? null : loading ? (
          <p className="text-sm text-[var(--text-muted)]">Calculando impacto…</p>
        ) : preview ? (
          <>
            <p className="text-sm">
              <strong>{preview.deletable}</strong> transaç{preview.deletable === 1 ? 'ão será excluída' : 'ões serão excluídas'} permanentemente.
              Esta ação não pode ser desfeita.
            </p>
            <ul className="space-y-1 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-subtle)] p-3 text-xs text-[var(--text-muted)]">
              <li>{preview.breakdown.normal} transaç{preview.breakdown.normal === 1 ? 'ão' : 'ões'}
                {preview.breakdown.reconciled > 0 && ` (${preview.breakdown.reconciled} conciliada${preview.breakdown.reconciled === 1 ? '' : 's'}: a conciliação será perdida)`}</li>
              {preview.breakdown.transfers > 0 && <li>{preview.breakdown.transfers} transferência(s), com as duas contas afetadas</li>}
              {preview.breakdown.cardPayments > 0 && <li>{preview.breakdown.cardPayments} pagamento(s) de fatura (a fatura volta a ficar aberta)</li>}
              {preview.kept.openingBalance > 0 && <li className="font-semibold">{preview.kept.openingBalance} saldo(s) inicial(is) serão mantidos</li>}
            </ul>
            {preview.deletable > 0 && (
              <Input
                label={`Digite ${CONFIRMATION_WORD} para confirmar`}
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                placeholder={CONFIRMATION_WORD}
                disabled={deleting}
                autoComplete="off"
              />
            )}
          </>
        ) : null}
        {(error || current?.error) && (
          <p role="alert" className="rounded-[var(--radius-md)] border border-[var(--danger)] bg-[var(--danger-subtle)] p-3 text-sm text-[var(--expense)]">
            {error ?? current?.error}
          </p>
        )}
      </div>
    </ModalShell>
  );
}
