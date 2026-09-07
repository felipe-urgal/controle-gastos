'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';

import { PageHeader } from '@/app/components/base-pages';
import { Alert } from '@/app/components/feedback';
import { ProtectedRoute } from '@/app/components/layout';
import { Button } from '@/app/components/ui';
import { useAuth } from '@/app/context';
import {
  emptyImportRuleForm,
  importRuleFormToInput,
  importRuleModelToInput,
  importRuleToFormState,
  type ImportRuleFormState,
} from '@/app/lib/import-rules/import-rule-form';
import { accountService } from '@/app/services/account-service';
import { categoryService } from '@/app/services/category-service';
import { importRuleService } from '@/app/services/import-rule-service';
import type { AccountModel } from '@/app/types/account';
import type { CategoryModel } from '@/app/types/category';
import type {
  ImportRuleDescriptionOperator,
  ImportRuleModel,
  ImportRuleTransactionType,
} from '@/app/types/import-rule';

function ruleOrder(left: ImportRuleModel, right: ImportRuleModel) {
  if (left.priority !== right.priority) return left.priority - right.priority;
  return left.id.localeCompare(right.id);
}

function typeLabel(type: ImportRuleTransactionType) {
  return type === 'INCOME' ? 'Receita' : 'Despesa';
}

function operatorLabel(operator: ImportRuleDescriptionOperator) {
  if (operator === 'EQUALS') return 'é igual a';
  if (operator === 'STARTS_WITH') return 'começa com';
  return 'contém';
}

function amountRangeLabel(rule: ImportRuleModel, showValues: boolean) {
  const min = rule.minAmountCents;
  const max = rule.maxAmountCents;
  if (min === null && max === null) return 'qualquer valor';
  if (!showValues) return 'faixa de valor oculta';
  if (min !== null && max !== null) return `${min}–${max} centavos`;
  if (min !== null) return `a partir de ${min} centavos`;
  return `até ${max} centavos`;
}

export default function ImportRuleManagementPage() {
  const { user } = useAuth();
  const showValues = user?.showValues !== false;
  const [accounts, setAccounts] = useState<AccountModel[]>([]);
  const [categories, setCategories] = useState<CategoryModel[]>([]);
  const [rules, setRules] = useState<ImportRuleModel[]>([]);
  const [form, setForm] = useState<ImportRuleFormState>(() => emptyImportRuleForm());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError('');
      try {
        const [accountResponse, categoryResponse, ruleResponse] = await Promise.all([
          accountService.getAll(),
          categoryService.getAll(),
          importRuleService.getAll(),
        ]);

        setAccounts((accountResponse.data?.items ?? []).filter((account) => account.isActive));
        setCategories((categoryResponse.data?.items ?? []).filter((category) => category.isActive));
        setRules([...(ruleResponse.data?.items ?? [])].sort(ruleOrder));
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'Não foi possível carregar as regras de importação.');
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, []);

  const accountById = useMemo(
    () => new Map(accounts.map((account) => [account.id, account])),
    [accounts],
  );
  const categoryById = useMemo(
    () => new Map(categories.map((category) => [category.id, category])),
    [categories],
  );
  const availableCategories = useMemo(
    () => categories.filter((category) => category.type === form.transactionType),
    [categories, form.transactionType],
  );
  const nextPriority = useMemo(() => {
    if (rules.length === 0) return 0;
    return Math.max(...rules.map((rule) => rule.priority)) + 10;
  }, [rules]);

  function clearMessages() {
    setError('');
    setSuccessMessage('');
  }

  function closeForm() {
    setFormOpen(false);
    setEditingId(null);
    setForm(emptyImportRuleForm(nextPriority));
  }

  function openCreate() {
    clearMessages();
    setEditingId(null);
    setForm(emptyImportRuleForm(nextPriority));
    setFormOpen(true);
  }

  function openEdit(rule: ImportRuleModel) {
    clearMessages();
    setPendingDeleteId(null);
    setEditingId(rule.id);
    setForm(importRuleToFormState(rule));
    setFormOpen(true);
  }

  function replaceRule(updated: ImportRuleModel) {
    setRules((current) =>
      current.map((rule) => (rule.id === updated.id ? updated : rule)).sort(ruleOrder),
    );
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    clearMessages();

    try {
      const input = importRuleFormToInput(form);
      const response = editingId
        ? await importRuleService.update(editingId, input)
        : await importRuleService.create(input);

      if (editingId) {
        replaceRule(response.data);
        setSuccessMessage('Regra atualizada com sucesso.');
      } else {
        setRules((current) => [...current, response.data].sort(ruleOrder));
        setSuccessMessage('Regra criada com sucesso.');
      }
      closeForm();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível salvar a regra.');
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleRule(rule: ImportRuleModel) {
    setSubmitting(true);
    clearMessages();
    try {
      const response = await importRuleService.update(
        rule.id,
        importRuleModelToInput(rule, { isActive: !rule.isActive }),
      );
      replaceRule(response.data);
      setSuccessMessage(
        response.data.isActive ? 'Regra ativada com sucesso.' : 'Regra pausada com sucesso.',
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível alterar o estado da regra.');
    } finally {
      setSubmitting(false);
    }
  }

  async function deleteRule(rule: ImportRuleModel) {
    if (pendingDeleteId !== rule.id) {
      setPendingDeleteId(rule.id);
      setSuccessMessage('');
      return;
    }

    setSubmitting(true);
    clearMessages();
    try {
      await importRuleService.delete(rule.id);
      setRules((current) => current.filter((candidate) => candidate.id !== rule.id));
      setPendingDeleteId(null);
      if (editingId === rule.id) closeForm();
      setSuccessMessage('Regra removida com sucesso.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível remover a regra.');
    } finally {
      setSubmitting(false);
    }
  }

  function changeTransactionType(type: ImportRuleTransactionType) {
    setForm((current) => {
      const currentCategory = categories.find((category) => category.id === current.categoryId);
      return {
        ...current,
        transactionType: type,
        categoryId: currentCategory?.type === type ? current.categoryId : '',
      };
    });
  }

  return (
    <ProtectedRoute>
      <PageHeader
        title="Regras de importação"
        description="Defina sugestões locais e determinísticas para classificar seu extrato antes da confirmação."
        backUrl="/transacoes/importar"
        loading={loading || submitting}
      />

      <div className="space-y-4">
        <Alert
          variant="info"
          message="Menor prioridade executa primeiro. Em empate, a ordem é estável pelo identificador da regra. As sugestões nunca confirmam transações sozinhas."
        />
        {error && <Alert variant="error" message={error} onClose={() => setError('')} />}
        {successMessage && (
          <Alert
            variant="success"
            message={successMessage}
            onClose={() => setSuccessMessage('')}
          />
        )}

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(340px,0.85fr)] lg:items-start">
          <section className="ds-panel overflow-hidden" aria-labelledby="rules-list-title">
            <header className="flex flex-col gap-3 border-b border-[var(--border)] p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 id="rules-list-title" className="text-lg font-semibold text-[var(--foreground)]">
                  Suas regras
                </h2>
                <p className="mt-1 text-sm text-[var(--text-muted)]">
                  {rules.length} regra(s), já na ordem em que serão avaliadas.
                </p>
              </div>
              <Button type="button" size="sm" onClick={openCreate} disabled={loading || submitting}>
                Nova regra
              </Button>
            </header>

            {loading ? (
              <p className="p-6 text-sm text-[var(--text-muted)]" role="status">
                Carregando regras…
              </p>
            ) : rules.length === 0 ? (
              <div className="p-6">
                <p className="font-medium text-[var(--foreground)]">Nenhuma regra cadastrada.</p>
                <p className="mt-1 text-sm text-[var(--text-muted)]">
                  Crie uma regra para sugerir categoria e descrição durante o preview.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-[var(--border)]">
                {rules.map((rule) => {
                  const account = rule.accountId ? accountById.get(rule.accountId) : null;
                  const category = categoryById.get(rule.categoryId);
                  const deleting = pendingDeleteId === rule.id;

                  return (
                    <li key={rule.id} className="p-4 sm:p-5">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <strong className="break-words text-[var(--foreground)]">{rule.name}</strong>
                            <span
                              className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${
                                rule.isActive
                                  ? 'border-[var(--primary)]/35 bg-[var(--primary-subtle)] text-[var(--income)]'
                                  : 'border-[var(--border)] bg-[var(--surface-subtle)] text-[var(--text-muted)]'
                              }`}
                            >
                              {rule.isActive ? 'Ativa' : 'Pausada'}
                            </span>
                            <span className="rounded-full border border-[var(--border)] px-2 py-0.5 text-xs text-[var(--text-muted)]">
                              prioridade {rule.priority}
                            </span>
                          </div>

                          <p className="mt-2 break-words text-sm text-[var(--foreground)]">
                            {typeLabel(rule.transactionType)} · descrição {operatorLabel(rule.descriptionOperator)} “{rule.descriptionPattern}”
                          </p>
                          <p className="mt-1 text-sm text-[var(--text-muted)]">
                            {account?.name ?? (rule.accountId ? 'Conta indisponível' : 'Qualquer conta')} · {amountRangeLabel(rule, showValues)}
                          </p>
                          <p className="mt-1 text-sm text-[var(--text-muted)]">
                            Categoria: {category?.name ?? 'Categoria indisponível'}
                            {rule.normalizedDescription ? ` · descrição sugerida: ${rule.normalizedDescription}` : ''}
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-2 sm:justify-end">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={submitting}
                            onClick={() => openEdit(rule)}
                          >
                            Editar
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={submitting}
                            onClick={() => void toggleRule(rule)}
                          >
                            {rule.isActive ? 'Pausar' : 'Ativar'}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={submitting}
                            onClick={() => void deleteRule(rule)}
                          >
                            {deleting ? 'Confirmar exclusão' : 'Remover'}
                          </Button>
                          {deleting && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={submitting}
                              onClick={() => setPendingDeleteId(null)}
                            >
                              Cancelar
                            </Button>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className="ds-panel p-5 sm:p-6 lg:sticky lg:top-4" aria-labelledby="rule-form-title">
            {formOpen ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--orbit-primary)]">
                    {editingId ? 'Editar regra' : 'Nova regra'}
                  </p>
                  <h2 id="rule-form-title" className="mt-1 text-lg font-semibold text-[var(--foreground)]">
                    Condição e sugestão
                  </h2>
                </div>

                <label className="block text-sm font-medium text-[var(--foreground)]">
                  Nome
                  <input
                    value={form.name}
                    onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                    maxLength={100}
                    required
                    disabled={submitting}
                    className="mt-2 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--background)] px-3 py-2.5"
                  />
                </label>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block text-sm font-medium text-[var(--foreground)]">
                    Tipo
                    <select
                      value={form.transactionType}
                      onChange={(event) => changeTransactionType(event.target.value as ImportRuleTransactionType)}
                      disabled={submitting}
                      className="mt-2 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--background)] px-3 py-2.5"
                    >
                      <option value="EXPENSE">Despesa</option>
                      <option value="INCOME">Receita</option>
                    </select>
                  </label>

                  <label className="block text-sm font-medium text-[var(--foreground)]">
                    Prioridade
                    <input
                      type="number"
                      step="1"
                      value={form.priority}
                      onChange={(event) => setForm((current) => ({ ...current, priority: event.target.value }))}
                      required
                      disabled={submitting}
                      className="mt-2 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--background)] px-3 py-2.5"
                    />
                    <span className="mt-1 block text-xs font-normal text-[var(--text-subtle)]">Menor número vem primeiro.</span>
                  </label>
                </div>

                <label className="block text-sm font-medium text-[var(--foreground)]">
                  Conta
                  <select
                    value={form.accountId}
                    onChange={(event) => setForm((current) => ({ ...current, accountId: event.target.value }))}
                    disabled={submitting}
                    className="mt-2 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--background)] px-3 py-2.5"
                  >
                    <option value="">Qualquer conta</option>
                    {accounts.map((account) => (
                      <option key={account.id} value={account.id}>{account.name} · {account.currency}</option>
                    ))}
                  </select>
                </label>

                <label className="block text-sm font-medium text-[var(--foreground)]">
                  Categoria sugerida
                  <select
                    value={form.categoryId}
                    onChange={(event) => setForm((current) => ({ ...current, categoryId: event.target.value }))}
                    required
                    disabled={submitting}
                    className="mt-2 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--background)] px-3 py-2.5"
                  >
                    <option value="">Selecione</option>
                    {availableCategories.map((category) => (
                      <option key={category.id} value={category.id}>{category.name}</option>
                    ))}
                  </select>
                </label>

                <div className="grid gap-4 sm:grid-cols-[0.75fr_1.25fr]">
                  <label className="block text-sm font-medium text-[var(--foreground)]">
                    Operador
                    <select
                      value={form.descriptionOperator}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          descriptionOperator: event.target.value as ImportRuleDescriptionOperator,
                        }))
                      }
                      disabled={submitting}
                      className="mt-2 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--background)] px-3 py-2.5"
                    >
                      <option value="EQUALS">É igual a</option>
                      <option value="STARTS_WITH">Começa com</option>
                      <option value="CONTAINS">Contém</option>
                    </select>
                  </label>

                  <label className="block text-sm font-medium text-[var(--foreground)]">
                    Padrão da descrição
                    <input
                      value={form.descriptionPattern}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, descriptionPattern: event.target.value }))
                      }
                      maxLength={255}
                      required
                      disabled={submitting}
                      className="mt-2 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--background)] px-3 py-2.5"
                    />
                  </label>
                </div>

                {showValues ? (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block text-sm font-medium text-[var(--foreground)]">
                      Valor mínimo (centavos)
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={form.minAmountCents}
                        onChange={(event) => setForm((current) => ({ ...current, minAmountCents: event.target.value }))}
                        disabled={submitting}
                        className="mt-2 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--background)] px-3 py-2.5"
                      />
                    </label>
                    <label className="block text-sm font-medium text-[var(--foreground)]">
                      Valor máximo (centavos)
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={form.maxAmountCents}
                        onChange={(event) => setForm((current) => ({ ...current, maxAmountCents: event.target.value }))}
                        disabled={submitting}
                        className="mt-2 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--background)] px-3 py-2.5"
                      />
                    </label>
                  </div>
                ) : (
                  <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-subtle)] p-3 text-sm text-[var(--text-muted)]">
                    <p className="font-medium text-[var(--foreground)]">Faixa de valor oculta pelas suas preferências.</p>
                    <p className="mt-1">
                      Limites já existentes são preservados ao salvar outros campos. Para criar ou alterar uma faixa, habilite a exibição de valores.
                    </p>
                  </div>
                )}

                <label className="block text-sm font-medium text-[var(--foreground)]">
                  Descrição sugerida (opcional)
                  <input
                    value={form.normalizedDescription}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, normalizedDescription: event.target.value }))
                    }
                    maxLength={255}
                    disabled={submitting}
                    className="mt-2 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--background)] px-3 py-2.5"
                  />
                  <span className="mt-1 block text-xs font-normal text-[var(--text-subtle)]">
                    Continua sendo apenas sugestão no preview; não altera o conteúdo assinado.
                  </span>
                </label>

                <label className="flex min-h-11 items-center gap-3 text-sm text-[var(--foreground)]">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(event) => setForm((current) => ({ ...current, isActive: event.target.checked }))}
                    disabled={submitting}
                  />
                  Regra ativa
                </label>

                <div className="flex flex-wrap justify-end gap-2 border-t border-[var(--border)] pt-4">
                  <Button type="button" variant="outline" size="sm" onClick={closeForm} disabled={submitting}>
                    Cancelar
                  </Button>
                  <Button type="submit" size="sm" isLoading={submitting} loadingText="Salvando…">
                    {editingId ? 'Salvar alterações' : 'Criar regra'}
                  </Button>
                </div>
              </form>
            ) : (
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--orbit-primary)]">Como funciona</p>
                <h2 id="rule-form-title" className="mt-1 text-lg font-semibold text-[var(--foreground)]">Automação sob controle</h2>
                <ul className="mt-4 space-y-3 text-sm leading-relaxed text-[var(--text-muted)]">
                  <li>• a primeira regra ativa que casar produz uma sugestão;</li>
                  <li>• conta e faixa de valor são opcionais;</li>
                  <li>• a categoria precisa continuar ativa e compatível com o tipo;</li>
                  <li>• você ainda pode sobrescrever a categoria no preview;</li>
                  <li>• nenhuma regra cria transação sem confirmação explícita.</li>
                </ul>
                <Button type="button" size="sm" className="mt-5" onClick={openCreate} disabled={loading || submitting}>
                  Criar primeira regra
                </Button>
              </div>
            )}
          </section>
        </div>
      </div>
    </ProtectedRoute>
  );
}
