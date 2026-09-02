'use client';

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react';

import { PageHeader } from '@/app/components/base-pages';
import { ProtectedRoute } from '@/app/components/layout';
import { Button } from '@/app/components/ui';
import { accountService } from '@/app/services/account-service';
import { categoryService } from '@/app/services/category-service';
import type { AccountModel } from '@/app/types/account';
import type { CategoryModel } from '@/app/types/category';

type ImportType = 'INCOME' | 'EXPENSE';
type ImportSource = 'CSV' | 'OFX';

type PreviewItem = {
  index: number;
  source: ImportSource;
  date: string;
  amountCents: number;
  type: ImportType;
  description: string;
  externalId?: string;
  currency?: string;
  errors: string[];
  fingerprint: string;
  duplicate: boolean;
};

type EditablePreviewItem = PreviewItem & {
  selected: boolean;
  categoryId: string | null;
};

type PreviewData = {
  accountId: string;
  fileName: string;
  previewToken: string;
  limits: { maxFileBytes: number; maxItems: number };
  summary: { total: number; valid: number; invalid: number; duplicates: number };
  items: PreviewItem[];
};

type ConfirmData = {
  selected: number;
  created: number;
  duplicates: number;
};

type ApiEnvelope<T> = {
  success: boolean;
  data: T;
  message?: string;
};

function formatAmount(cents: number, currency = 'BRL') {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency,
  }).format(cents / 100);
}

function stepClass(active: boolean) {
  return active
    ? 'border-[var(--primary)] bg-[var(--primary)] text-white'
    : 'border-[var(--border)] bg-[var(--background)] text-[var(--text-muted)]';
}

export default function TransactionImportPage() {
  const [accounts, setAccounts] = useState<AccountModel[]>([]);
  const [categories, setCategories] = useState<CategoryModel[]>([]);
  const [accountId, setAccountId] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [items, setItems] = useState<EditablePreviewItem[]>([]);
  const [result, setResult] = useState<ConfirmData | null>(null);
  const [loadingRelations, setLoadingRelations] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadRelations() {
      try {
        const [accountResponse, categoryResponse] = await Promise.all([
          accountService.getAll(),
          categoryService.getAll(),
        ]);
        const activeAccounts = (accountResponse.data?.items ?? []).filter((account) => account.isActive);
        setAccounts(activeAccounts);
        setCategories((categoryResponse.data?.items ?? []).filter((category) => category.isActive));
        if (activeAccounts.length === 1) setAccountId(activeAccounts[0].id);
      } catch {
        setError('Não foi possível carregar contas e categorias.');
      } finally {
        setLoadingRelations(false);
      }
    }

    void loadRelations();
  }, []);

  const account = useMemo(
    () => accounts.find((candidate) => candidate.id === accountId),
    [accountId, accounts],
  );

  const selectedCount = items.filter((item) => item.selected).length;
  const missingCategoryCount = items.filter((item) => item.selected && !item.categoryId).length;
  const step = result ? 3 : preview ? 2 : 1;

  function resetImport() {
    setFile(null);
    setPreview(null);
    setItems([]);
    setResult(null);
    setError('');
  }

  function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    setFile(event.target.files?.[0] ?? null);
    setError('');
  }

  async function handlePreview(event: FormEvent) {
    event.preventDefault();
    if (!accountId || !file) {
      setError('Selecione uma conta e um arquivo CSV ou OFX.');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('accountId', accountId);
      formData.append('file', file);
      const response = await fetch('/api/transactions/import/preview', {
        method: 'POST',
        body: formData,
      });
      const payload = (await response.json()) as ApiEnvelope<PreviewData>;
      if (!response.ok || !payload.success) throw new Error(payload.message || 'Falha ao gerar preview.');

      setPreview(payload.data);
      setItems(
        payload.data.items.map((item) => ({
          ...item,
          selected: item.errors.length === 0 && !item.duplicate,
          categoryId: null,
        })),
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha ao gerar preview.');
    } finally {
      setSubmitting(false);
    }
  }

  function updateItem(index: number, patch: Partial<Pick<EditablePreviewItem, 'selected' | 'categoryId'>>) {
    setItems((current) => current.map((item) => (item.index === index ? { ...item, ...patch } : item)));
  }

  async function handleConfirm() {
    if (!preview || selectedCount === 0 || missingCategoryCount > 0) return;
    setSubmitting(true);
    setError('');
    try {
      const response = await fetch('/api/transactions/import/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: preview.accountId,
          previewToken: preview.previewToken,
          items,
        }),
      });
      const payload = (await response.json()) as ApiEnvelope<ConfirmData>;
      if (!response.ok || !payload.success) throw new Error(payload.message || 'Falha ao confirmar importação.');
      setResult(payload.data);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha ao confirmar importação.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ProtectedRoute>
      <PageHeader
        title="Importar transações"
        description="Revise CSV ou OFX antes de criar qualquer lançamento."
        backUrl="/transacoes"
        loading={loadingRelations || submitting}
      />

      <nav aria-label="Etapas da importação" className="grid min-w-0 grid-cols-3 gap-2">
        {['Arquivo', 'Preview', 'Concluído'].map((label, index) => {
          const number = index + 1;
          return (
            <div
              key={label}
              className="flex min-w-0 flex-col items-center gap-1 text-center text-sm font-medium min-[360px]:flex-row min-[360px]:gap-2 min-[360px]:text-left"
            >
              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${stepClass(step >= number)}`}>
                {number}
              </span>
              <span className={`min-w-0 break-words ${step >= number ? 'text-[var(--foreground)]' : 'text-[var(--text-muted)]'}`}>{label}</span>
            </div>
          );
        })}
      </nav>

      {error && (
        <div role="alert" aria-live="polite" className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-500">
          {error}
        </div>
      )}

      {step === 1 && (
        <form onSubmit={handlePreview} className="space-y-5 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 sm:p-6">
          <div>
            <h2 className="text-lg font-semibold text-[var(--foreground)]">1. Selecione arquivo e conta</h2>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              CSV e OFX, até 2 MB e 1.000 transações. O preview não grava lançamentos.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2 text-sm font-medium text-[var(--foreground)]">
              Conta
              <select
                value={accountId}
                onChange={(event) => setAccountId(event.target.value)}
                disabled={loadingRelations || submitting}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-[var(--foreground)]"
                required
              >
                <option value="">Selecione</option>
                {accounts.map((item) => (
                  <option key={item.id} value={item.id}>{item.name} · {item.currency}</option>
                ))}
              </select>
            </label>

            <label className="space-y-2 text-sm font-medium text-[var(--foreground)]">
              Arquivo
              <input
                type="file"
                accept=".csv,.ofx,text/csv,application/x-ofx"
                onChange={onFileChange}
                disabled={submitting}
                className="block w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] file:mr-3 file:rounded-lg file:border-0 file:px-3 file:py-1.5"
                required
              />
            </label>
          </div>

          <div className="flex flex-wrap justify-end gap-2">
            <Button as="a" href="/transacoes" variant="outline" size="sm" disabled={submitting}>
              Cancelar
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={!accountId || !file}
              isLoading={submitting}
              loadingText="Analisando…"
            >
              Gerar preview
            </Button>
          </div>
        </form>
      )}

      {step === 2 && preview && (
        <section className="space-y-4" aria-labelledby="preview-title">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <h2 id="preview-title" className="text-lg font-semibold text-[var(--foreground)]">2. Revise antes de confirmar</h2>
                <p className="mt-1 break-words text-sm text-[var(--text-muted)]">{preview.fileName} · {account?.name ?? 'Conta selecionada'}</p>
              </div>
              <div className="flex flex-wrap gap-2 text-sm font-medium">
                <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-emerald-500">{preview.summary.valid} válidas</span>
                <span className="rounded-full bg-amber-500/10 px-3 py-1 text-amber-500">{preview.summary.duplicates} duplicadas</span>
                <span className="rounded-full bg-red-500/10 px-3 py-1 text-red-500">{preview.summary.invalid} inválidas</span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {items.map((item) => {
              const invalid = item.errors.length > 0;
              const disabled = invalid || item.duplicate;
              const availableCategories = categories.filter((category) => category.type === item.type);
              const status = invalid ? 'Inválida' : item.duplicate ? 'Possível duplicata' : 'Válida';
              return (
                <article key={`${item.index}-${item.fingerprint}`} className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 sm:p-5">
                  <div className="grid gap-4 lg:grid-cols-[auto_1fr_auto_240px] lg:items-center">
                    <label className="flex items-center gap-2 text-sm text-[var(--foreground)]">
                      <input
                        type="checkbox"
                        checked={item.selected}
                        disabled={disabled || submitting}
                        onChange={(event) => updateItem(item.index, { selected: event.target.checked })}
                        aria-label={`Selecionar ${item.description || `linha ${item.index + 1}`}`}
                      />
                      <span className="sr-only">Selecionar</span>
                    </label>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <strong className="min-w-0 break-words text-sm text-[var(--foreground)]">{item.description || `Linha ${item.index + 1}`}</strong>
                        <span className={`rounded-full px-2 py-0.5 text-sm font-medium ${invalid ? 'bg-red-500/10 text-red-500' : item.duplicate ? 'bg-amber-500/10 text-amber-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                          {status}
                        </span>
                      </div>
                      <p className="mt-1 break-words text-sm text-[var(--text-muted)]">{item.date || 'Data inválida'} · {item.source}{item.externalId ? ` · ID ${item.externalId}` : ''}</p>
                      {(invalid || item.duplicate) && (
                        <p className="mt-2 break-words text-sm text-[var(--text-muted)]">
                          {invalid ? item.errors.join(' ') : 'Já existe uma importação com a mesma identidade.'}
                        </p>
                      )}
                    </div>

                    <div className={`min-w-0 text-sm font-semibold [overflow-wrap:anywhere] ${item.type === 'INCOME' ? 'text-emerald-500' : 'text-red-500'}`}>
                      {item.type === 'INCOME' ? '+' : '-'}{formatAmount(item.amountCents, item.currency ?? account?.currency)}
                    </div>

                    <label className="space-y-1 text-sm font-medium text-[var(--text-muted)]">
                      Categoria
                      <select
                        value={item.categoryId ?? ''}
                        onChange={(event) => updateItem(item.index, { categoryId: event.target.value || null })}
                        disabled={disabled || !item.selected || submitting}
                        className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] disabled:opacity-50"
                        aria-label={`Categoria de ${item.description || `linha ${item.index + 1}`}`}
                      >
                        <option value="">Selecione</option>
                        {availableCategories.map((category) => (
                          <option key={category.id} value={category.id}>{category.name}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                </article>
              );
            })}
          </div>

          <div className="sticky bottom-[calc(var(--app-mobile-bottom-nav-height)+env(safe-area-inset-bottom)+0.75rem)] flex flex-col gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card)]/95 p-4 shadow-lg backdrop-blur lg:bottom-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-[var(--text-muted)]">
              {selectedCount} selecionada(s){missingCategoryCount > 0 ? ` · ${missingCategoryCount} sem categoria` : ''}
            </p>
            <div className="flex flex-wrap justify-end gap-2">
              <Button type="button" size="sm" variant="outline" onClick={resetImport} disabled={submitting}>
                Cancelar
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleConfirm}
                disabled={selectedCount === 0 || missingCategoryCount > 0}
                isLoading={submitting}
                loadingText="Importando…"
              >
                Confirmar {selectedCount}
              </Button>
            </div>
          </div>
        </section>
      )}

      {step === 3 && result && (
        <section className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 text-center sm:p-8" aria-live="polite">
          <div className="mx-auto max-w-lg">
            <p className="text-sm font-semibold uppercase tracking-wide text-emerald-500">Importação concluída</p>
            <h2 className="mt-2 text-2xl font-bold text-[var(--foreground)]">{result.created} transação(ões) criada(s)</h2>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              {result.selected} selecionada(s) · {result.duplicates} ignorada(s) por duplicidade.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              <Button type="button" size="sm" variant="outline" onClick={resetImport}>
                Importar outro arquivo
              </Button>
              <Button as="a" href="/transacoes" size="sm">
                Ver transações
              </Button>
            </div>
          </div>
        </section>
      )}
    </ProtectedRoute>
  );
}