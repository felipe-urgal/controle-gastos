'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';

import { PageHeader } from '@/app/components/base-pages';
import { Alert } from '@/app/components/feedback';
import { ProtectedRoute } from '@/app/components/layout';
import { Button } from '@/app/components/ui';
import { useAuth } from '@/app/context';
import { formatCurrency } from '@/app/lib/currency/format-currency';
import {
  emptyImportRuleForm,
  importRuleFormToInput,
  importRuleModelToInput,
  importRuleToFormState,
  type ImportRuleFormState,
} from '@/app/lib/import-rules/import-rule-form';
import {
  findImportRuleRelationships,
  type ImportRuleRelationship,
} from '@/app/lib/import-rules/import-rule-guards';
import { accountService } from '@/app/services/account-service';
import { categoryService } from '@/app/services/category-service';
import { ApiClientError } from '@/app/services/api-client';
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
  const createdAtOrder = left.createdAt.localeCompare(right.createdAt);
  if (createdAtOrder !== 0) return createdAtOrder;
  return left.name.localeCompare(right.name);
}

function typeLabel(type: ImportRuleTransactionType) {
  return type === 'INCOME' ? 'Receita' : 'Despesa';
}

function operatorLabel(operator: ImportRuleDescriptionOperator) {
  if (operator === 'EQUALS') return 'é igual a';
  if (operator === 'STARTS_WITH') return 'começa com';
  return 'contém';
}

function impactLabel(relationship: ImportRuleRelationship) {
  if (relationship.kind === 'NONE') return '';
  if (relationship.kind === 'EQUIVALENT') {
    return 'equivalente — já existe a mesma regra administrativa';
  }

  if (relationship.resolution === 'CANDIDATE_WINS') {
    return 'também pode casar; esta regra venceria e a existente ficaria sombreada';
  }
  if (relationship.resolution === 'EXISTING_WINS') {
    return 'também pode casar; a regra existente venceria e esta ficaria sombreada';
  }
  if (relationship.resolution === 'SAME_OUTCOME') {
    return 'também pode casar, mas ambas produzem o mesmo resultado';
  }
  return 'também pode casar sem vencedor seguro; ajuste prioridade ou especificidade';
}

function ruleDependencyWarning(accountUnavailable: boolean, categoryUnavailable: boolean) {
  const unavailable = [
    accountUnavailable ? 'contas' : '',
    categoryUnavailable ? 'categorias' : '',
  ].filter(Boolean);

  return unavailable.length > 0
    ? `Não foi possível carregar ${unavailable.join(' e ')}. A lista de regras continua disponível, mas criação e edição podem ficar limitadas.`
    : '';
}

function amountRangeLabel(
  rule: ImportRuleModel,
  showValues: boolean,
  currency?: string,
) {
  const min = rule.minAmountCents;
  const max = rule.maxAmountCents;
  if (min === null && max === null) return 'qualquer valor';
  if (!showValues) return 'faixa de valor oculta';

  const formatAmount = (amount: number) =>
    currency
      ? formatCurrency(amount, currency)
      : `${amount} centavos (moeda indisponível)`;

  if (min !== null && max !== null) {
    return `${formatAmount(min)}–${formatAmount(max)}`;
  }
  if (min !== null) return `a partir de ${formatAmount(min)}`;
  return `até ${formatAmount(max!)}`;
}

const RULES_PAGE_SIZE = 20;

function effectiveStateLabel(rule: ImportRuleModel) {
  if (rule.effectiveState === 'OPERATIONAL') return 'Operacional';
  if (rule.effectiveState === 'PAUSED') return 'Pausada';
  if (rule.effectiveState === 'BROKEN_CATEGORY') return 'Categoria indisponível';
  return 'Conta indisponível';
}

function effectiveStateClass(rule: ImportRuleModel) {
  if (rule.effectiveState === 'OPERATIONAL') {
    return 'border-[var(--primary)]/35 bg-[var(--primary-subtle)] text-[var(--income)]';
  }
  if (rule.effectiveState === 'PAUSED') {
    return 'border-[var(--border)] bg-[var(--surface-subtle)] text-[var(--text-muted)]';
  }
  return 'border-[var(--warning)]/40 bg-[var(--warning-subtle)] text-[var(--warning)]';
}

export default function ImportRuleManagementPage() {
  const { user } = useAuth();
  const showValues = user?.showValues !== false;
  const [accounts, setAccounts] = useState<AccountModel[]>([]);
  const [categories, setCategories] = useState<CategoryModel[]>([]);
  const [rules, setRules] = useState<ImportRuleModel[]>([]);
  const [rulesTotal, setRulesTotal] = useState(0);
  const [rulesTotalPages, setRulesTotalPages] = useState(1);
  const [nextPriority, setNextPriority] = useState(0);
  const [rulesPage, setRulesPage] = useState(1);
  const [rulesSearchInput, setRulesSearchInput] = useState('');
  const [rulesSearch, setRulesSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'true' | 'false'>('all');
  const [accountFilter, setAccountFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState<'' | ImportRuleTransactionType>('');
  const [rulesRevision, setRulesRevision] = useState(0);
  const [form, setForm] = useState<ImportRuleFormState>(() => emptyImportRuleForm());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [loadingRelations, setLoadingRelations] = useState(true);
  const [loadingRules, setLoadingRules] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [dependencyWarning, setDependencyWarning] = useState('');
  const [accountUnavailable, setAccountUnavailable] = useState(false);
  const [categoryUnavailable, setCategoryUnavailable] = useState(false);
  const [rulesUnavailable, setRulesUnavailable] = useState(false);
  const [retryingSource, setRetryingSource] = useState<'accounts' | 'categories' | 'rules' | null>(null);
  const [successMessage, setSuccessMessage] = useState('');

  const ruleQuery = useMemo(
    () => ({
      page: rulesPage,
      pageSize: RULES_PAGE_SIZE,
      ...(rulesSearch ? { search: rulesSearch } : {}),
      ...(activeFilter === 'all' ? {} : { isActive: activeFilter }),
      ...(accountFilter ? { accountId: accountFilter } : {}),
      ...(typeFilter ? { transactionType: typeFilter } : {}),
    }),
    [accountFilter, activeFilter, rulesPage, rulesSearch, typeFilter],
  );

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setRulesPage(1);
      setRulesSearch(rulesSearchInput.trim());
    }, 250);
    return () => window.clearTimeout(timeout);
  }, [rulesSearchInput]);

  useEffect(() => {
    async function loadRelations() {
      setLoadingRelations(true);
      setDependencyWarning('');

      const [accountResult, categoryResult] = await Promise.allSettled([
        accountService.getAll(),
        categoryService.getAll(),
      ]);

      const nextAccountUnavailable = accountResult.status !== 'fulfilled';
      const nextCategoryUnavailable = categoryResult.status !== 'fulfilled';
      setAccountUnavailable(nextAccountUnavailable);
      setCategoryUnavailable(nextCategoryUnavailable);

      setAccounts(
        accountResult.status === 'fulfilled'
          ? (accountResult.value.data?.items ?? []).filter((account) => account.isActive)
          : [],
      );
      setCategories(
        categoryResult.status === 'fulfilled'
          ? (categoryResult.value.data?.items ?? []).filter((category) => category.isActive)
          : [],
      );
      setDependencyWarning(
        ruleDependencyWarning(nextAccountUnavailable, nextCategoryUnavailable),
      );
      setLoadingRelations(false);
    }

    void loadRelations();
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadRules() {
      setLoadingRules(true);
      try {
        const response = await importRuleService.getAll(ruleQuery);
        if (cancelled) return;
        const data = response.data;
        const totalPages = Math.max(1, data.totalPages ?? Math.ceil(data.total / RULES_PAGE_SIZE));
        if (rulesPage > totalPages) {
          setRulesPage(totalPages);
          return;
        }
        setRules([...(data.items ?? [])].sort(ruleOrder));
        setRulesTotal(data.total ?? 0);
        setRulesTotalPages(totalPages);
        setNextPriority(data.summary?.nextPriority ?? 0);
        setRulesUnavailable(false);
        setError('');
      } catch (cause) {
        if (cancelled) return;
        setRules([]);
        setRulesUnavailable(true);
        setError(
          cause instanceof ApiClientError && cause.code === 'PAGINATION_REQUIRED'
            ? 'A lista de regras exige paginação. A tela já solicita páginas server-side; tente recarregar a listagem.'
            : cause instanceof Error
              ? cause.message
              : 'Não foi possível carregar as regras de importação.',
        );
      } finally {
        if (!cancelled) setLoadingRules(false);
      }
    }

    void loadRules();
    return () => {
      cancelled = true;
    };
  }, [ruleQuery, rulesPage, rulesRevision]);

  async function retryAccounts() {
    setRetryingSource('accounts');
    try {
      const response = await accountService.getAll();
      setAccounts((response.data?.items ?? []).filter((account) => account.isActive));
      setAccountUnavailable(false);
      setDependencyWarning(ruleDependencyWarning(false, categoryUnavailable));
    } catch {
      setAccountUnavailable(true);
      setDependencyWarning(ruleDependencyWarning(true, categoryUnavailable));
    } finally {
      setRetryingSource(null);
    }
  }

  async function retryCategories() {
    setRetryingSource('categories');
    try {
      const response = await categoryService.getAll();
      setCategories((response.data?.items ?? []).filter((category) => category.isActive));
      setCategoryUnavailable(false);
      setDependencyWarning(ruleDependencyWarning(accountUnavailable, false));
    } catch {
      setCategoryUnavailable(true);
      setDependencyWarning(ruleDependencyWarning(accountUnavailable, true));
    } finally {
      setRetryingSource(null);
    }
  }

  async function retryRules() {
    setRetryingSource('rules');
    setRulesRevision((current) => current + 1);
    setRetryingSource(null);
  }

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
  const selectedRuleAccount = form.accountId
    ? accountById.get(form.accountId) ?? null
    : null;
  const ruleImpact = useMemo(() => {
    if (!formOpen) return [];

    try {
      return findImportRuleRelationships(importRuleFormToInput(form), rules, {
        excludeRuleId: editingId ?? undefined,
      });
    } catch {
      return [];
    }
  }, [editingId, form, formOpen, rules]);

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
        setSuccessMessage('Regra criada com sucesso.');
        setRulesPage(1);
      }
      setRulesRevision((current) => current + 1);
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
      setRulesRevision((current) => current + 1);
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
      setRulesRevision((current) => current + 1);
      setPendingDeleteId(null);
      if (editingId === rule.id) closeForm();
      setSuccessMessage('Regra removida com sucesso.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível remover a regra.');
    } finally {
      setSubmitting(false);
    }
  }

  async function renumberRules() {
    setSubmitting(true);
    clearMessages();
    try {
      const response = await importRuleService.renumber();
      setNextPriority(response.data.nextPriority);
      setRulesPage(1);
      setRulesRevision((current) => current + 1);
      setSuccessMessage(
        `${response.data.updated} regra(s) renumerada(s) em passos de 10.`,
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Não foi possível renumerar as prioridades.',
      );
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

  const loading = loadingRelations || loadingRules;

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
          message="Menor prioridade executa primeiro. Em empate, a regra mais específica vence; se ainda houver resultados incompatíveis na mesma precedência, o preview pede revisão. As sugestões nunca confirmam transações sozinhas."
        />
        {dependencyWarning && (
          <div className="space-y-2">
            <Alert variant="warning" message={dependencyWarning} />
            <div className="flex flex-wrap gap-2">
              {accountUnavailable && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => void retryAccounts()}
                  isLoading={retryingSource === 'accounts'}
                  loadingText="Recarregando contas…"
                >
                  Tentar novamente contas
                </Button>
              )}
              {categoryUnavailable && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => void retryCategories()}
                  isLoading={retryingSource === 'categories'}
                  loadingText="Recarregando categorias…"
                >
                  Tentar novamente categorias
                </Button>
              )}
            </div>
          </div>
        )}
        {error && (
          <div className="space-y-2">
            <Alert variant="error" message={error} onClose={() => setError('')} />
            {rulesUnavailable && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void retryRules()}
                isLoading={retryingSource === 'rules'}
                loadingText="Recarregando regras…"
              >
                Tentar novamente regras
              </Button>
            )}
          </div>
        )}
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
                  {rulesTotal} regra(s) · página {rulesPage} de {rulesTotalPages}.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => void renumberRules()}
                  disabled={loading || submitting || rulesTotal === 0}
                >
                  Renumerar prioridades
                </Button>
                <Button type="button" size="sm" onClick={openCreate} disabled={loading || submitting}>
                  Nova regra
                </Button>
              </div>
            </header>

            <div className="grid gap-3 border-b border-[var(--border)] p-4 sm:grid-cols-2 lg:grid-cols-4">
              <label className="text-sm font-medium text-[var(--foreground)] sm:col-span-2 lg:col-span-1">
                Buscar
                <input
                  type="search"
                  value={rulesSearchInput}
                  onChange={(event) => setRulesSearchInput(event.target.value)}
                  placeholder="Nome ou padrão"
                  className="mt-1.5 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--background)] px-3 py-2.5"
                />
              </label>
              <label className="text-sm font-medium text-[var(--foreground)]">
                Estado
                <select
                  value={activeFilter}
                  onChange={(event) => {
                    setActiveFilter(event.target.value as 'all' | 'true' | 'false');
                    setRulesPage(1);
                  }}
                  className="mt-1.5 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--background)] px-3 py-2.5"
                >
                  <option value="all">Todas</option>
                  <option value="true">Configuradas como ativas</option>
                  <option value="false">Pausadas</option>
                </select>
              </label>
              <label className="text-sm font-medium text-[var(--foreground)]">
                Conta
                <select
                  value={accountFilter}
                  onChange={(event) => {
                    setAccountFilter(event.target.value);
                    setRulesPage(1);
                  }}
                  disabled={accountUnavailable}
                  className="mt-1.5 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--background)] px-3 py-2.5 disabled:opacity-50"
                >
                  <option value="">Todas as contas</option>
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>{account.name}</option>
                  ))}
                </select>
              </label>
              <label className="text-sm font-medium text-[var(--foreground)]">
                Tipo
                <select
                  value={typeFilter}
                  onChange={(event) => {
                    setTypeFilter(event.target.value as '' | ImportRuleTransactionType);
                    setRulesPage(1);
                  }}
                  className="mt-1.5 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--background)] px-3 py-2.5"
                >
                  <option value="">Receitas e despesas</option>
                  <option value="EXPENSE">Despesas</option>
                  <option value="INCOME">Receitas</option>
                </select>
              </label>
            </div>

            {loadingRules ? (
              <p className="p-6 text-sm text-[var(--text-muted)]" role="status">
                Carregando regras…
              </p>
            ) : rules.length === 0 ? (
              <div className="p-6">
                <p className="font-medium text-[var(--foreground)]">
                  {rulesTotal === 0 ? 'Nenhuma regra cadastrada.' : 'Nenhuma regra corresponde aos filtros.'}
                </p>
                <p className="mt-1 text-sm text-[var(--text-muted)]">
                  {rulesTotal === 0
                    ? 'Crie uma regra para sugerir categoria durante o preview.'
                    : 'Ajuste a busca ou os filtros para continuar.'}
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
                              className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${effectiveStateClass(rule)}`}
                            >
                              {effectiveStateLabel(rule)}
                            </span>
                            <span className="rounded-full border border-[var(--border)] px-2 py-0.5 text-xs text-[var(--text-muted)]">
                              prioridade {rule.priority}
                            </span>
                          </div>

                          <p className="mt-2 break-words text-sm text-[var(--foreground)]">
                            {typeLabel(rule.transactionType)} · descrição {operatorLabel(rule.descriptionOperator)} “{rule.descriptionPattern}”
                          </p>
                          <p className="mt-1 text-sm text-[var(--text-muted)]">
                            {account?.name ?? (rule.accountId ? 'Conta indisponível' : 'Qualquer conta')} · {amountRangeLabel(rule, showValues, account?.currency)}
                          </p>
                          <p className="mt-1 text-sm text-[var(--text-muted)]">
                            Categoria: {category?.name ?? 'Categoria indisponível'}
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
                            {rule.effectiveState === 'BROKEN_ACCOUNT' || rule.effectiveState === 'BROKEN_CATEGORY'
                              ? 'Corrigir dependência'
                              : 'Editar'}
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

            {!loadingRules && rulesTotal > 0 && (
              <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] p-4">
                <p className="text-sm text-[var(--text-muted)]">
                  Mostrando {rules.length} de {rulesTotal} regra(s).
                </p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={rulesPage <= 1 || submitting}
                    onClick={() => setRulesPage((current) => Math.max(1, current - 1))}
                  >
                    Anterior
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={rulesPage >= rulesTotalPages || submitting}
                    onClick={() => setRulesPage((current) => Math.min(rulesTotalPages, current + 1))}
                  >
                    Próxima
                  </Button>
                </div>
              </footer>
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
                  <div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="block text-sm font-medium text-[var(--foreground)]">
                        Valor mínimo (centavos{selectedRuleAccount ? ` de ${selectedRuleAccount.currency}` : ''})
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
                        Valor máximo (centavos{selectedRuleAccount ? ` de ${selectedRuleAccount.currency}` : ''})
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
                    <p className="mt-2 text-xs leading-relaxed text-[var(--text-subtle)]">
                      {selectedRuleAccount
                        ? `Os limites são comparados diretamente em ${selectedRuleAccount.currency}; nenhuma conversão de moeda é feita.`
                        : 'Selecione uma conta específica para usar faixa de valor. Nenhuma conversão de moeda é feita.'}
                    </p>
                  </div>
                ) : (
                  <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-subtle)] p-3 text-sm text-[var(--text-muted)]">
                    <p className="font-medium text-[var(--foreground)]">Faixa de valor oculta pelas suas preferências.</p>
                    <p className="mt-1">
                      Limites já existentes são preservados ao salvar outros campos. Para criar ou alterar uma faixa, habilite a exibição de valores.
                    </p>
                  </div>
                )}

                {ruleImpact.length > 0 && (
                  <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-subtle)] p-3">
                    <p className="text-sm font-semibold text-[var(--foreground)]">
                      Impacto potencial
                    </p>
                    <ul className="mt-2 space-y-1 text-xs leading-relaxed text-[var(--text-muted)]">
                      {ruleImpact.map((relationship) => (
                        <li key={relationship.kind === 'NONE' ? 'none' : relationship.ruleId}>
                          {relationship.kind === 'NONE' ? null : (
                            <>
                              <strong className="text-[var(--foreground)]">{relationship.ruleName}</strong>
                              {' — '}
                              {impactLabel(relationship)}
                            </>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

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
                  <li>• a primeira regra elegível por prioridade e especificidade produz a sugestão;</li>
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
