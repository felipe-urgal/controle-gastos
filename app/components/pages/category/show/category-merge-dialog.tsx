'use client';

import { useEffect, useMemo, useState } from 'react';

import { Alert } from '@/app/components/feedback';
import { ModalShell } from '@/app/components/overlays/modal-shell';
import { Button, Select } from '@/app/components/ui';
import { errorMessage } from '@/app/lib/error-message';
import { categoryService } from '@/app/services/category-service';
import type { CategoryModel } from '@/app/types/category';

/**
 * Move tudo desta categoria (lançamentos, divisões, modelos, regras de importação e limites) para outra do mesmo
 * tipo e apaga esta. Não dá para desfazer; por isso o resumo do que acontece aparece antes do botão.
 */
export default function CategoryMergeDialog({
  category,
  onClose,
  onMerged,
}: {
  category: Pick<CategoryModel, 'id' | 'name' | 'type'>;
  onClose: () => void;
  /** Recebe a categoria de destino, para a tela ir até ela. */
  onMerged: (targetId: string) => void;
}) {
  const [candidates, setCandidates] = useState<CategoryModel[] | null>(null);
  const [targetId, setTargetId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    categoryService
      .getAll()
      .then((response) => {
        if (!active) return;
        setCandidates(
          (response.data.items ?? []).filter(
            (item) => item.id !== category.id && item.type === category.type && item.isActive,
          ),
        );
      })
      .catch((cause) => {
        if (!active) return;
        setCandidates([]);
        setError(errorMessage(cause, 'Não foi possível carregar as categorias.'));
      });
    return () => {
      active = false;
    };
  }, [category.id, category.type]);

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
      await categoryService.merge(category.id, targetId);
      onMerged(targetId);
    } catch (cause) {
      setError(errorMessage(cause, 'Não foi possível mesclar as categorias.'));
      setBusy(false);
    }
  }

  return (
    <ModalShell
      title="Mesclar categoria"
      description={`Mova tudo de ${category.name} para outra categoria do mesmo tipo.`}
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
              ? 'Carregando categorias…'
              : options.length === 0
                ? 'Sem outra categoria ativa deste tipo'
                : 'Escolha a categoria de destino'
          }
          disabled={busy || options.length === 0}
        />
        {target && (
          <p className="text-sm text-[var(--text-muted)]">
            Lançamentos, divisões, modelos e regras de importação de <strong>{category.name}</strong> passam para{' '}
            <strong>{target.name}</strong>, e <strong>{category.name}</strong> será excluída. Se os dois tiverem limite no
            mesmo mês, vale o de {target.name}. Meses travados impedem a mesclagem. Não dá para desfazer.
          </p>
        )}
        {error && <Alert variant="error" message={error} />}
      </div>
    </ModalShell>
  );
}
