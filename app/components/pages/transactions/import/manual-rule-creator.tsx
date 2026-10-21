'use client';

import { FormEvent, useState } from 'react';

import { Button, Input, Select } from '@/app/components/ui';
import {
  importRuleFormFromManualClassification,
  importRuleFormToInput,
  type ImportRuleFormState,
} from '@/app/lib/import-rules/import-rule-form';
import {
  assertImportRulePatternIsSafe,
  findImportRuleRelationship,
} from '@/app/lib/import-rules/import-rule-guards';
import { importRuleService } from '@/app/services/import-rule-service';
import type {
  ImportRuleDescriptionOperator,
  ImportRuleModel,
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
  existingRules: ImportRuleModel[];
};

function emptyCreatorState(contextKey: string): CreatorState {
  return {
    contextKey,
    form: null,
    loading: false,
    error: '',
    success: '',
    existingRules: [],
  };
}

function getRuleGuardMessage(
  form: ImportRuleFormState,
  rules: ImportRuleModel[],
) {
  try {
    assertImportRulePatternIsSafe(
      form.descriptionOperator,
      form.descriptionPattern,
    );
  } catch (error) {
    return error instanceof Error ? error.message : 'Padrão de regra inválido';
  }

  try {
    const input = importRuleFormToInput(form);
    const relationship = findImportRuleRelationship(input, rules);

    if (relationship.kind === 'EQUIVALENT') {
      return `Já existe uma regra equivalente: ${relationship.ruleName}`;
    }

    if (relationship.kind === 'CONFLICT') {
      return `Já existe uma regra com o mesmo padrão e outro resultado: ${relationship.ruleName}`;
    }
  } catch {
    // Demais validações do formulário continuam sendo exibidas no submit.
  }

  return '';
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
      const response = await importRuleService.getAll({
        page: 1,
        pageSize: 50,
        search: description,
        transactionType,
      });
      const existingRules = response.data?.items ?? [];
      const form = importRuleFormFromManualClassification({
        accountId,
        transactionType,
        description,
        categoryId: manualCategoryId,
        priority: response.data?.summary?.nextPriority ?? 0,
      });
      setStoredState((current) =>
        current.contextKey === requestKey
          ? {
              contextKey: requestKey,
              form,
              loading: false,
              error: '',
              success: '',
              existingRules,
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
    const guardMessage = getRuleGuardMessage(form, state.existingRules);

    if (guardMessage) {
      setStoredState({
        ...state,
        contextKey: requestKey,
        error: guardMessage,
        success: '',
      });
      return;
    }

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
              existingRules: current.existingRules,
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

  const guardMessage = state.form
    ? getRuleGuardMessage(state.form, state.existingRules)
    : '';

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

          <Input
            label="Nome da regra"
            value={state.form.name}
            maxLength={100}
            onChange={(event) => updateForm({ name: event.target.value })}
            disabled={state.loading || disabled}
            required
          />

          <Select
            label="Escopo"
            value={state.form.accountId}
            onChange={(value) => updateForm({ accountId: String(value) })}
            disabled={state.loading || disabled}
            options={[
              { value: accountId, label: 'Somente esta conta' },
              { value: '', label: 'Qualquer conta' },
            ]}
          />

          <div className="grid gap-3 sm:grid-cols-[0.9fr_1.1fr] lg:grid-cols-1 xl:grid-cols-[0.9fr_1.1fr]">
            <Select
              label="Comparação"
              value={state.form.descriptionOperator}
              onChange={(value) =>
                updateForm({ descriptionOperator: value as ImportRuleDescriptionOperator })
              }
              disabled={state.loading || disabled}
              options={operators.map((operator) => ({ value: operator.value, label: operator.label }))}
            />

            <Input
              label="Padrão da descrição"
              value={state.form.descriptionPattern}
              maxLength={255}
              onChange={(event) => updateForm({ descriptionPattern: event.target.value })}
              disabled={state.loading || disabled}
              required
            />
          </div>

          <Input
            label="Prioridade"
            type="number"
            step="1"
            value={state.form.priority}
            onChange={(event) => updateForm({ priority: event.target.value })}
            disabled={state.loading || disabled}
            required
          />

          <p className="text-xs leading-relaxed text-[var(--text-muted)]">
            Categoria: <strong className="text-[var(--foreground)]">{categoryName ?? 'selecionada'}</strong>. Tipo e categoria vêm da sua classificação manual. Faixa de valor e descrição normalizada ficam vazias e podem ser refinadas depois em Regras.
          </p>

          {(guardMessage || state.error) && (
            <p className="text-sm text-[var(--expense)]" role="alert">
              {guardMessage || state.error}
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
              disabled={disabled || Boolean(guardMessage)}
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
