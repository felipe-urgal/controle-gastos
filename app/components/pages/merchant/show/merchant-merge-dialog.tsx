'use client';

import { useEffect, useMemo, useState } from 'react';

import { Alert } from '@/app/components/feedback';
import { ModalShell } from '@/app/components/overlays/modal-shell';
import { Button, Select } from '@/app/components/ui';
import { errorMessage } from '@/app/lib/error-message';
import { merchantService } from '@/app/services/merchant-service';
import type { MerchantDTO } from '@/app/types/merchant';

/**
 * Junta dois estabelecimentos duplicados: os lançamentos e os aliases deste passam para o escolhido e este é apagado.
 * Não dá para desfazer, então o resumo do que acontece aparece antes do botão.
 */
export default function MerchantMergeDialog({
  merchant,
  onClose,
  onMerged,
}: {
  merchant: Pick<MerchantDTO, 'id' | 'name'>;
  onClose: () => void;
  /** Recebe o estabelecimento de destino, para a tela ir até ele. */
  onMerged: (targetId: string) => void;
}) {
  const [candidates, setCandidates] = useState<MerchantDTO[] | null>(null);
  const [targetId, setTargetId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    merchantService
      .getAllOptions()
      .then((items) => {
        if (active) setCandidates(items.filter((item) => item.id !== merchant.id && item.isActive));
      })
      .catch((cause) => {
        if (!active) return;
        setCandidates([]);
        setError(errorMessage(cause, 'Não foi possível carregar os estabelecimentos.'));
      });
    return () => {
      active = false;
    };
  }, [merchant.id]);

  const options = useMemo(
    () => (candidates ?? []).map((item) => ({ value: item.id, label: item.name })),
    [candidates],
  );
  const target = candidates?.find((item) => item.id === targetId);

  async function submit() {
    if (!targetId) return;
    setBusy(true);
    setError('');
    try {
      await merchantService.merge(merchant.id, targetId);
      onMerged(targetId);
    } catch (cause) {
      setError(errorMessage(cause, 'Não foi possível mesclar os estabelecimentos.'));
      setBusy(false);
    }
  }

  return (
    <ModalShell
      title="Mesclar estabelecimento"
      description={`Mova tudo de ${merchant.name} para outro estabelecimento.`}
      onClose={onClose}
      closeDisabled={busy}
      maxWidthClass="max-w-lg"
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose} disabled={busy}>Cancelar</Button>
          <Button type="button" variant="danger" onClick={() => void submit()} isLoading={busy} disabled={busy || !targetId}>
            Mesclar
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Select
          label="Mesclar em"
          value={targetId}
          onChange={(value) => setTargetId(String(value))}
          options={options}
          placeholder={
            candidates === null
              ? 'Carregando estabelecimentos…'
              : options.length === 0
                ? 'Sem outro estabelecimento ativo'
                : 'Escolha o estabelecimento de destino'
          }
          disabled={busy || options.length === 0}
        />
        {target && (
          <p className="text-sm text-[var(--text-muted)]">
            Lançamentos e aliases de <strong>{merchant.name}</strong> passam para <strong>{target.name}</strong>, e{' '}
            <strong>{merchant.name}</strong> será excluído. Alias que o destino já tem é descartado. Meses travados
            impedem a mesclagem. Não dá para desfazer.
          </p>
        )}
        {error && <Alert variant="error" message={error} />}
      </div>
    </ModalShell>
  );
}
