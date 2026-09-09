'use client';

import { FormEvent, useState } from 'react';

import { Button } from '@/app/components/ui';
import {
  importRuleFormFromManualClassification,
  importRuleFormToInput,
  type ImportRuleFormState,
} from '@/app/lib/import-rules/import-rule-form';
import { importRuleService } from '@/app/services/import-rule-service';
import type {
  ImportRuleDescriptionOperator,
  ImportRuleTransactionType,
} from '@/app/types/import-rule';

const operators: Array<{
  value: ImportRuleDescriptionOperator;
  label: string;
}> = [
  { value: 'EQUALS', label: 'É exatamente igual a' },
  { value: 'STARTS_WITH', label: 'Começa com' },
  { value: 'CONTAINS', label: 'Contém' },
];

type CreatorState = {
  contextKey: string;
  form: ImportRuleFormState | null;
  loading: boolean;
  error: string;
  success: string;
};

function emptyCreatorState(contextKey: string): CreatorState {
  return {
    contextKey,
    form: null,
    loading: false,
    error: '',
    success: '',
  };
}

function nextPriority(priorities: number[]) {
  return priorities.length === 0 ? 0 : Math.max(...priorities) + 10;
}

export function ManualImportRuleCreator({
  accountId,
  transactionType,
  description,
  categoryId,
  suggestedCategoryId,
  categoryName,
  disabled,
}: {
  accountId: string;
  transactionType: ImportRuleTransactionType;
  description: string;
  categoryId: string | null;
  suggestedCategoryId?: string | null;
  categoryName?: string;
  disabled: boolean;
}) {
  const contextKey = [accountId, transactionType, description, categoryId ?? ''].join('\u0000');
  const [storedState, setStoredState] = useState<CreatorState>(() => emptyCreatorState(contextKey));
  const state = storedState.contextKey === contextKey
    ? storedState
    : emptyCreatorState(contextKey);
  const hasManualClassification = Boolean(
    categoryId && categoryId !== (suggestedCategoryId ?? null),
  );

  if (!hasManualClassification || !categoryId) return null;
  const manualCategoryId = categoryId;

  async function openCreator() {
    const requestKey = contextKey;
    setStoredState({
      ...emptyCreatorState(requestKey),
      loading: true,
    });

    try {
      const response = await importRuleService.getAll();
      const priorities = (response.data?.items ?? []).map((rule) => rule.priority);
      const form = importRuleFormFromManualClassification({
        accountId,
        transactionType,
        description,
        categoryId: manualCategoryId,
        priority: nextPriority(priorities),
      });
      setStoredState((current) =>
        current.contextKey === requestKey
          ? {
              contextKey: requestKey,
              form,
              loading: false,
              error: '',
              success: '',
            }
          : current,
      );
    } catch (cause) {
      setStoredState((current) =>
        current.contextKey === requestKey
          ? {
              ...emptyCreatorState(requestKey),
              error:
                cause instanceof Error
                  ? cause.message
                  : 'Não foi possível preparar a nova regra.',
            }
          : current,
      );
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!state.form) return;

    const requestKey = contextKey;
    const form = state.form;
    setStoredState({
      ...state,
      contextKey: requestKey,
      loading: true,
      error: '',
      success: '',
    });

    try {
      const input = importRuleFormToInput(form);
      await importRuleService.create(input);
      setStoredState((current) =>
        current.contextKey === requestKey
          ? {
              ...emptyCreatorState(requestKey),
              success: 'Regra criada. Ela será avaliada nos próximos previews.',
            }
          : current,
      );
    } catch (cause) {
      setStoredState((current) =>
        current.contextKey === requestKey
          ? {
              contextKey: requestKey,
              form,
              loading: false,
              error:
                cause instanceof Error
                  ? cause.message
                  : 'Não foi possível criar a regra.',
              success: '',
            }
          : current,
      );
    }
  }

  function updateForm(patch: Partial<ImportRuleFormState>) {
    setStoredState((current) => {
      if (current.contextKey !== contextKey || !current.form) return current;
      return { ...current, form: { ...current.form, ...patch } };
    });
  }

  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-subtle)] p-3">
      {state.success ? (
        <p className="text-sm text-[var(--income)]" role="status">
          {state.success}
        </p>
      ) : state.form ? (
        <form onSubmit={handleSubmit} className="space-y-3" aria-label="Criar regra com esta classificação">
          <div>
            <p className="text-sm font-semibold text-[var(--foreground)]">
              Criar regra com esta classificação
            </p>
            <p className="mt-1 text-xs leading-relaxed text-[var(--text-muted)]">
              A regra é salva separadamente e não altera este preview. O padrão começa exato e limitado à conta atual para evitar matches amplos por acidente.
            </p>
          </div>

          <label className="block text-sm font-medium text-[var(--foreground)]">
            Nome da regra
            <input
              value={state.form.name}
              maxLength={100}
              onChange={(event) => updateForm({ name: event.target.value })}
              disabled={state.loading || disabled}
              className="mt-1.5 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] disabled:opacity-50"
              required
            />
          </label>

          <label className="block text-sm font-medium text-[var(--foreground)]">
            Escopo
            <select
              value={state.form.accountId}
              onChange={(event) => updateForm({ accountId: event.target.value })}
              disabled={state.loading || disabled}
              className="mt-1.5 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] disabled:opacity-50"
            >
              <option value={accountId}>Somente esta conta</option>
              <option value="">Qualquer conta</option>
            </select>
          </label>

          <div className="grid gap-3 sm:grid-cols-[0.9fr_1.1fr] lg:grid-cols-1 xl:grid-cols-[0.9fr_1.1fr]">
            <label className="block text-sm font-medium text-[var(--foreground)]">
              Comparação
              <select
                value={state.form.descriptionOperator}
                onChange={(event) =>
                  updateForm({
                    descriptionOperator: event.target.value as ImportRuleDescriptionOperator,
                  })
                }
                disabled={state.loading || disabled}
                className="mt-1.5 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] disabled:opacity-50"
              >
                {operators.map((operator) => (
                  <option key={operator.value} value={operator.value}>
                    {operator.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-sm font-medium text-[var(--foreground)]">
              Padrão da descrição
              <input
                value={state.form.descriptionPattern}
                maxLength={255}
                onChange={(event) =>
                  updateForm({ descriptionPattern: event.target.value })
                }
                disabled={state.loading || disabled}
                className="mt-1.5 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] disabled:opacity-50"
                required
              />
            </label>
          </div>

          <label className="block text-sm font-medium text-[var(--foreground)]">
            Prioridade
            <input
              type="number"
              step="1"
              value={state.form.priority}
              onChange={(event) => updateForm({ priority: event.target.value })}
              disabled={state.loading || disabled}
              className="mt-1.5 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] disabled:opacity-50"
              required
            />
          </label>

          <p className="text-xs leading-relaxed text-[var(--text-muted)]">
            Categoria: <strong className="text-[var(--foreground)]">{categoryName ?? 'selecionada'}</strong>. Tipo e categoria vêm da sua classificação manual. Faixa de valor e descrição normalizada ficam vazias e podem ser refinadas depois em Regras.
          </p>

          {state.error && (
            <p className="text-sm text-[var(--expense)]" role="alert">
              {state.error}
            </p>
          )}

          <div className="flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={state.loading || disabled}
              onClick={() => setStoredState(emptyCreatorState(contextKey))}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={disabled}
              isLoading={state.loading}
              loadingText="Criando…"
            >
              Criar regra
            </Button>
          </div>
        </form>
      ) : (
        <div>
          <p className="text-sm font-medium text-[var(--foreground)]">
            Quer repetir esta classificação automaticamente?
          </p>
          <p className="mt-1 text-xs leading-relaxed text-[var(--text-muted)]">
            Crie uma regra explícita para próximos arquivos. Nada é salvo apenas por escolher a categoria.
          </p>
          {state.error && (
            <p className="mt-2 text-sm text-[var(--expense)]" role="alert">
              {state.error}
            </p>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-3"
            disabled={disabled}
            isLoading={state.loading}
            loadingText="Preparando…"
            onClick={() => void openCreator()}
          >
            Criar regra com esta classificação
          </Button>
        </div>
      )}
    </div>
  );
}
