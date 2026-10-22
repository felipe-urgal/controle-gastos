'use client';

import { useCallback, useEffect, useState } from 'react';

import { Alert } from '@/app/components/feedback';
import { aliasOperatorLabel } from '@/app/components/pages/merchant/show/merchant-show-model';
import { Button, Input, Select } from '@/app/components/ui';
import { merchantAliasService } from '@/app/services/merchant-alias-service';
import type { MerchantAliasDTO, MerchantAliasOperator, MerchantAliasPreviewDTO } from '@/app/types/merchant-alias';

const ALIAS_LIMIT = 50;

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

export default function MerchantAliasesCard({ merchantId, merchantName }: { merchantId: string; merchantName: string }) {
  const [aliases, setAliases] = useState<MerchantAliasDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [operator, setOperator] = useState<MerchantAliasOperator>('CONTAINS');
  const [pattern, setPattern] = useState('');
  const [description, setDescription] = useState('');
  const [preview, setPreview] = useState<MerchantAliasPreviewDTO | null>(null);
  const [overlapReviewed, setOverlapReviewed] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const response = await merchantAliasService.getAll({ merchantId, page: 1, pageSize: ALIAS_LIMIT });
      setAliases(response.data.items);
      setError('');
    } catch (cause) {
      setError(errorMessage(cause, 'Erro ao carregar aliases'));
    } finally {
      setLoading(false);
    }
  }, [merchantId]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timeoutId);
  }, [load]);

  function payload() {
    return { merchantId, operator, pattern: pattern.trim() };
  }

  function changeDraft(update: () => void) {
    update();
    setPreview(null);
    setOverlapReviewed(false);
  }

  async function runPreview() {
    const response = await merchantAliasService.preview({
      ...payload(),
      ...(description.trim() ? { description: description.trim() } : {}),
    });
    setPreview(response.data);
    return response.data;
  }

  async function test() {
    if (!pattern.trim() || !description.trim()) {
      setError('Informe o padrão e uma descrição para testar.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await runPreview();
    } catch (cause) {
      setError(errorMessage(cause, 'Erro ao testar alias'));
    } finally {
      setBusy(false);
    }
  }

  async function add() {
    if (!pattern.trim()) {
      setError('Informe o padrão do alias.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const result = await runPreview();
      if (!result.canSave) {
        setError(
          result.exactEquivalent
            ? `Este alias já existe em ${result.exactEquivalent.merchant.name}. Para movê-lo, use a administração em Reconhecimento automático.`
            : 'Este alias equivalente já existe e não será duplicado.',
        );
        return;
      }
      if (result.overlapCount > 0 && !overlapReviewed) {
        setOverlapReviewed(true);
        setError('Há aliases parecidos em outros estabelecimentos. Revise abaixo e clique em adicionar novamente para confirmar.');
        return;
      }
      await merchantAliasService.create(payload());
      setPattern('');
      setDescription('');
      setPreview(null);
      setOverlapReviewed(false);
      await load();
    } catch (cause) {
      setError(errorMessage(cause, 'Erro ao adicionar alias'));
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    setBusy(true);
    setError('');
    try {
      await merchantAliasService.remove(id);
      await load();
    } catch (cause) {
      setError(errorMessage(cause, 'Erro ao remover alias'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-[16px] border border-[var(--border)] bg-[var(--surface)] pb-4" aria-labelledby="merchant-recognition-heading">
      <div className="px-4 pb-2 pt-4 sm:px-5">
        <h2 id="merchant-recognition-heading" className="text-base font-bold">Como reconhecemos</h2>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Descrições do banco que viram {merchantName} nas importações e ao lançar. O texto original nunca muda.
        </p>
      </div>

      {error ? <div className="px-4 pb-3 sm:px-5"><Alert variant="error" message={error} /></div> : null}

      {loading ? (
        <p className="px-4 text-sm text-[var(--text-muted)] sm:px-5">Carregando aliases…</p>
      ) : aliases.length === 0 ? (
        <p className="px-4 text-sm text-[var(--text-muted)] sm:px-5">Nenhum alias. Adicione um padrão abaixo para reconhecer este lugar automaticamente.</p>
      ) : (
        <ul className="border-t border-[var(--border)]">
          {aliases.map((alias) => (
            <li key={alias.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border)] px-4 py-2 sm:px-5">
              <span className="min-w-0 break-words text-sm">
                <code className="rounded-md bg-[var(--surface-subtle)] px-1.5 py-0.5 font-mono text-[0.8125rem]">{alias.pattern}</code>
                <span className="ml-2 text-xs text-[var(--text-muted)]">{aliasOperatorLabel(alias.operator)} · prioridade {alias.priority}</span>
              </span>
              <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={() => void remove(alias.id)} aria-label={`Remover alias ${alias.pattern}`}>
                Remover
              </Button>
            </li>
          ))}
        </ul>
      )}

      <div className="grid gap-3 px-4 pt-4 sm:px-5">
        <div className="grid gap-3 sm:grid-cols-[160px_minmax(0,1fr)]">
          <Select
            label="Como comparar"
            ariaLabel="Operador do alias"
            value={operator}
            onChange={(value) => changeDraft(() => setOperator(value as MerchantAliasOperator))}
            options={[
              { value: 'CONTAINS', label: 'Contém' },
              { value: 'STARTS_WITH', label: 'Começa com' },
              { value: 'EQUALS', label: 'Igual a' },
            ]}
          />
          <Input label="Padrão" value={pattern} maxLength={120} placeholder="Ex.: IFOOD" onChange={(event) => changeDraft(() => setPattern(event.target.value))} />
        </div>
        <Input
          label="Testar contra descrição"
          value={description}
          maxLength={255}
          placeholder="Ex.: IFOOD *RESTAURANTE 1234"
          onChange={(event) => changeDraft(() => setDescription(event.target.value))}
        />
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => void test()}>Testar</Button>
          <Button type="button" size="sm" isLoading={busy} onClick={() => void add()}>Adicionar alias</Button>
        </div>

        {preview ? (
          <div className="grid gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] p-3 text-sm" aria-live="polite">
            {preview.test ? (
              <p className="text-[var(--text-muted)]">
                {preview.test.matchesCandidate ? 'O alias corresponde à descrição.' : 'O alias não corresponde à descrição.'}
                {preview.test.conflict
                  ? ' Há conflito entre estabelecimentos; nenhum seria aplicado automaticamente.'
                  : preview.test.winner
                    ? ` Seria reconhecido como ${preview.test.winner.merchantName}.`
                    : ' Nenhum estabelecimento seria reconhecido.'}
              </p>
            ) : null}
            {preview.overlapCount > 0 ? (
              <div>
                <p className="font-semibold">{preview.overlapCount} alias(es) parecido(s)</p>
                <ul className="mt-1 text-xs text-[var(--text-muted)]">
                  {preview.overlaps.slice(0, 5).map((overlap) => (
                    <li key={overlap.aliasId}>{overlap.merchant.name} · {aliasOperatorLabel(overlap.operator)} · {overlap.pattern}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}
