'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  FaEdit,
  FaPlus,
  FaStore,
  FaTrash,
} from 'react-icons/fa';

import { ProtectedRoute } from '@/app/components/layout';
import Pagination from '@/app/components/navigation/pagination';
import { Button, Input } from '@/app/components/ui';
import { useDebounce } from '@/app/hooks/use-debounce';
import { useModalFocus } from '@/app/hooks/use-modal-focus';
import { merchantAliasService } from '@/app/services/merchant-alias-service';
import { merchantService } from '@/app/services/merchant-service';
import type {
  MerchantAliasDTO,
  MerchantAliasOperator,
} from '@/app/types/merchant-alias';
import type { MerchantDTO } from '@/app/types/merchant';

const MERCHANT_PAGE_SIZE = 10;
const ALIAS_PAGE_SIZE = 10;
const MERCHANT_OPTION_PAGE_SIZE = 20;

type MerchantStatusFilter = 'all' | 'active' | 'inactive';

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

function operatorLabel(operator: MerchantAliasOperator) {
  if (operator === 'EQUALS') return 'Igual a';
  if (operator === 'STARTS_WITH') return 'Começa com';
  return 'Contém';
}

export default function MerchantsPage() {
  const [items, setItems] = useState<MerchantDTO[]>([]);
  const [merchantPage, setMerchantPage] = useState(1);
  const [merchantTotal, setMerchantTotal] = useState(0);
  const [merchantTotalPages, setMerchantTotalPages] = useState(1);
  const [merchantSearch, setMerchantSearch] = useState('');
  const [merchantStatus, setMerchantStatus] =
    useState<MerchantStatusFilter>('all');
  const [merchantLoading, setMerchantLoading] = useState(true);
  const [merchantError, setMerchantError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [editing, setEditing] = useState<MerchantDTO | null>(null);
  const [saving, setSaving] = useState(false);

  const [aliases, setAliases] = useState<MerchantAliasDTO[]>([]);
  const [aliasPage, setAliasPage] = useState(1);
  const [aliasTotal, setAliasTotal] = useState(0);
  const [aliasTotalPages, setAliasTotalPages] = useState(1);
  const [aliasSearch, setAliasSearch] = useState('');
  const [aliasMerchantFilter, setAliasMerchantFilter] = useState('');
  const [aliasesLoading, setAliasesLoading] = useState(true);
  const [aliasError, setAliasError] = useState<string | null>(null);
  const [aliasEditing, setAliasEditing] = useState<MerchantAliasDTO | null>(
    null,
  );
  const [aliasMerchantId, setAliasMerchantId] = useState('');
  const [aliasSelectedMerchant, setAliasSelectedMerchant] = useState<{
    id: string;
    name: string;
    isActive: boolean;
  } | null>(null);
  const [aliasMerchantQuery, setAliasMerchantQuery] = useState('');
  const [aliasMerchantOptions, setAliasMerchantOptions] = useState<
    MerchantDTO[]
  >([]);
  const [aliasOptionsLoading, setAliasOptionsLoading] = useState(true);
  const [aliasOperator, setAliasOperator] =
    useState<MerchantAliasOperator>('CONTAINS');
  const [aliasPattern, setAliasPattern] = useState('');
  const [aliasPriority, setAliasPriority] = useState(100);
  const [testDescription, setTestDescription] = useState('');
  const [testResult, setTestResult] = useState<boolean | null>(null);
  const [aliasSaving, setAliasSaving] = useState(false);

  const [deleteCandidate, setDeleteCandidate] =
    useState<MerchantDTO | null>(null);
  const [deleting, setDeleting] = useState(false);

  const debouncedMerchantSearch = useDebounce(merchantSearch.trim(), 300);
  const debouncedAliasSearch = useDebounce(aliasSearch.trim(), 300);
  const debouncedAliasMerchantFilter = useDebounce(
    aliasMerchantFilter.trim(),
    300,
  );
  const debouncedAliasMerchantQuery = useDebounce(
    aliasMerchantQuery.trim(),
    300,
  );

  const loadMerchants = useCallback(async () => {
    try {
      const response = await merchantService.getAll({
        page: merchantPage,
        pageSize: MERCHANT_PAGE_SIZE,
        ...(debouncedMerchantSearch
          ? { search: debouncedMerchantSearch }
          : {}),
        ...(merchantStatus === 'active'
          ? { isActive: true }
          : merchantStatus === 'inactive'
            ? { isActive: false }
            : {}),
      });
      const data = response.data;
      setItems(data?.items ?? []);
      setMerchantTotal(data?.total ?? 0);
      setMerchantTotalPages(Math.max(1, data?.totalPages ?? 1));
    } catch (error) {
      setItems([]);
      setMerchantTotal(0);
      setMerchantTotalPages(1);
      setMerchantError(
        errorMessage(error, 'Erro ao carregar estabelecimentos'),
      );
    } finally {
      setMerchantLoading(false);
    }
  }, [debouncedMerchantSearch, merchantPage, merchantStatus]);

  const loadAliases = useCallback(async () => {
    try {
      const response = await merchantAliasService.getAll({
        page: aliasPage,
        pageSize: ALIAS_PAGE_SIZE,
        ...(debouncedAliasSearch ? { search: debouncedAliasSearch } : {}),
        ...(debouncedAliasMerchantFilter
          ? { merchantSearch: debouncedAliasMerchantFilter }
          : {}),
      });
      setAliases(response.data.items);
      setAliasTotal(response.data.total);
      setAliasTotalPages(Math.max(1, response.data.totalPages));
    } catch (error) {
      setAliases([]);
      setAliasTotal(0);
      setAliasTotalPages(1);
      setAliasError(errorMessage(error, 'Erro ao carregar aliases'));
    } finally {
      setAliasesLoading(false);
    }
  }, [aliasPage, debouncedAliasMerchantFilter, debouncedAliasSearch]);

  const loadAliasMerchantOptions = useCallback(async () => {
    try {
      const response = await merchantService.getAll({
        page: 1,
        pageSize: MERCHANT_OPTION_PAGE_SIZE,
        isActive: true,
        ...(debouncedAliasMerchantQuery
          ? { search: debouncedAliasMerchantQuery }
          : {}),
      });
      setAliasMerchantOptions(response.data?.items ?? []);
    } catch (error) {
      setAliasMerchantOptions([]);
      setAliasError(
        errorMessage(
          error,
          'Erro ao buscar estabelecimentos para o alias',
        ),
      );
    } finally {
      setAliasOptionsLoading(false);
    }
  }, [debouncedAliasMerchantQuery]);

  useEffect(() => {
    void loadMerchants();
  }, [loadMerchants]);

  useEffect(() => {
    void loadAliases();
  }, [loadAliases]);

  useEffect(() => {
    void loadAliasMerchantOptions();
  }, [loadAliasMerchantOptions]);

  const merchantOptions = useMemo(() => {
    const options = [...aliasMerchantOptions];
    if (
      aliasSelectedMerchant &&
      !options.some((option) => option.id === aliasSelectedMerchant.id)
    ) {
      options.unshift({
        id: aliasSelectedMerchant.id,
        name: aliasSelectedMerchant.name,
        isActive: aliasSelectedMerchant.isActive,
        transactionsCount: 0,
        aliasesCount: 0,
        createdAt: '',
        updatedAt: '',
      });
    }
    return options;
  }, [aliasMerchantOptions, aliasSelectedMerchant]);

  function startEdit(item: MerchantDTO) {
    setEditing(item);
    setName(item.name);
    setMerchantError(null);
  }

  function resetForm() {
    setEditing(null);
    setName('');
  }

  async function save() {
    const normalized = name.trim();
    if (normalized.length < 2) {
      setMerchantError('Nome deve ter pelo menos 2 caracteres');
      return;
    }

    setSaving(true);
    setMerchantError(null);
    try {
      if (editing) {
        await merchantService.update(editing.id, { name: normalized });
      } else {
        await merchantService.create({ name: normalized });
      }
      resetForm();
      await loadMerchants();
      void loadAliasMerchantOptions();
    } catch (error) {
      setMerchantError(
        errorMessage(error, 'Erro ao salvar estabelecimento'),
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(item: MerchantDTO) {
    setMerchantError(null);
    try {
      await merchantService.update(item.id, { isActive: !item.isActive });
      await loadMerchants();
      void loadAliasMerchantOptions();
    } catch (error) {
      setMerchantError(
        errorMessage(error, 'Erro ao atualizar estabelecimento'),
      );
    }
  }

  const closeDeleteDialog = useCallback(() => {
    if (!deleting) setDeleteCandidate(null);
  }, [deleting]);

  const deleteDialogRef = useModalFocus<HTMLDivElement>(
    Boolean(deleteCandidate),
    closeDeleteDialog,
    deleting,
  );

  async function confirmDeleteAction() {
    if (!deleteCandidate) return;

    setDeleting(true);
    setMerchantError(null);
    try {
      const hasDependencies =
        deleteCandidate.transactionsCount > 0 ||
        deleteCandidate.aliasesCount > 0;

      if (hasDependencies) {
        if (deleteCandidate.isActive) {
          await merchantService.update(deleteCandidate.id, {
            isActive: false,
          });
        }
      } else {
        await merchantService.delete(deleteCandidate.id);
        if (editing?.id === deleteCandidate.id) resetForm();
      }

      setDeleteCandidate(null);
      await Promise.all([loadMerchants(), loadAliases()]);
      void loadAliasMerchantOptions();
    } catch (error) {
      setMerchantError(
        errorMessage(error, 'Erro ao atualizar estabelecimento'),
      );
    } finally {
      setDeleting(false);
    }
  }

  function resetAliasForm() {
    setAliasEditing(null);
    setAliasMerchantId('');
    setAliasSelectedMerchant(null);
    setAliasMerchantQuery('');
    setAliasOperator('CONTAINS');
    setAliasPattern('');
    setAliasPriority(100);
    setTestDescription('');
    setTestResult(null);
  }

  function startAliasEdit(alias: MerchantAliasDTO) {
    setAliasEditing(alias);
    setAliasMerchantId(alias.merchant.id);
    setAliasSelectedMerchant(alias.merchant);
    setAliasMerchantQuery(alias.merchant.name);
    setAliasOperator(alias.operator);
    setAliasPattern(alias.pattern);
    setAliasPriority(alias.priority);
    setTestResult(null);
    setAliasError(null);
  }

  async function saveAlias() {
    if (!aliasMerchantId || !aliasPattern.trim()) {
      setAliasError(
        'Selecione um estabelecimento e informe um padrão.',
      );
      return;
    }

    setAliasSaving(true);
    setAliasError(null);
    try {
      const payload = {
        merchantId: aliasMerchantId,
        operator: aliasOperator,
        pattern: aliasPattern,
        priority: aliasPriority,
      };

      if (aliasEditing) {
        await merchantAliasService.update(aliasEditing.id, payload);
      } else {
        await merchantAliasService.create(payload);
      }

      resetAliasForm();
      await Promise.all([loadAliases(), loadMerchants()]);
    } catch (error) {
      setAliasError(errorMessage(error, 'Erro ao salvar alias'));
    } finally {
      setAliasSaving(false);
    }
  }

  async function testAlias() {
    if (!aliasPattern.trim() || !testDescription.trim()) {
      setAliasError('Informe o padrão e uma descrição para testar.');
      return;
    }

    setAliasSaving(true);
    setAliasError(null);
    try {
      const response = await merchantAliasService.test({
        operator: aliasOperator,
        pattern: aliasPattern,
        description: testDescription,
      });
      setTestResult(response.data.matches);
    } catch (error) {
      setAliasError(errorMessage(error, 'Erro ao testar alias'));
    } finally {
      setAliasSaving(false);
    }
  }

  async function removeAlias(id: string) {
    setAliasSaving(true);
    setAliasError(null);
    try {
      await merchantAliasService.remove(id);
      if (aliasEditing?.id === id) resetAliasForm();

      if (aliases.length === 1 && aliasPage > 1) {
        setAliasesLoading(true);
        setAliasPage((current) => current - 1);
      } else {
        await loadAliases();
      }
      await loadMerchants();
    } catch (error) {
      setAliasError(errorMessage(error, 'Erro ao remover alias'));
    } finally {
      setAliasSaving(false);
    }
  }

  return (
    <ProtectedRoute>
      <div className="mx-auto w-full max-w-5xl">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.12em] text-[var(--orbit-primary)]">
              Organização
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-[var(--foreground)]">
              Estabelecimentos
            </h1>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Padronize onde suas transações aconteceram sem alterar a descrição original.
            </p>
          </div>
          <p className="text-sm text-[var(--text-muted)]">
            {merchantTotal} cadastrado(s)
          </p>
        </header>

        <section
          className="ds-panel mt-4 p-4 sm:p-5"
          aria-labelledby="merchant-form-heading"
        >
          <div className="flex items-center gap-2">
            <FaStore
              className="text-[var(--orbit-primary)]"
              aria-hidden="true"
            />
            <h2
              id="merchant-form-heading"
              className="font-semibold text-[var(--foreground)]"
            >
              {editing ? 'Editar estabelecimento' : 'Novo estabelecimento'}
            </h2>
          </div>

          {merchantError ? (
            <div
              role="alert"
              className="mt-4 rounded-[var(--radius-md)] border border-[var(--danger)]/30 bg-[var(--danger-subtle)] p-3 text-sm text-[var(--expense)]"
            >
              {merchantError}
            </div>
          ) : null}

          <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
            <Input
              label="Nome"
              value={name}
              maxLength={120}
              disabled={saving}
              placeholder="Ex.: iFood, Supermercado Central"
              onChange={(event) => setName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  void save();
                }
              }}
            />
            <div className="flex gap-2">
              {editing ? (
                <Button
                  type="button"
                  variant="secondary"
                  disabled={saving}
                  onClick={resetForm}
                >
                  Cancelar
                </Button>
              ) : null}
              <Button
                type="button"
                isLoading={saving}
                onClick={() => void save()}
                icon={editing ? <FaEdit /> : <FaPlus />}
              >
                {editing ? 'Salvar' : 'Adicionar'}
              </Button>
            </div>
          </div>
        </section>

        <section
          className="ds-panel mt-4 p-4 sm:p-5"
          aria-labelledby="merchant-alias-heading"
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2
                id="merchant-alias-heading"
                className="font-semibold text-[var(--foreground)]"
              >
                Aliases de reconhecimento
              </h2>
              <p className="mt-1 text-sm text-[var(--text-muted)]">
                Associe descrições bancárias sem alterar o texto original.
              </p>
            </div>
            <span className="text-sm text-[var(--text-muted)]">
              {aliasTotal} alias(es)
            </span>
          </div>

          {aliasError ? (
            <div
              role="alert"
              className="mt-4 rounded-[var(--radius-md)] border border-[var(--danger)]/30 bg-[var(--danger-subtle)] p-3 text-sm text-[var(--expense)]"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span>{aliasError}</span>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setAliasesLoading(true);
                    setAliasError(null);
                    void loadAliases();
                  }}
                >
                  Tentar novamente
                </Button>
              </div>
            </div>
          ) : null}

          <div className="mt-4 rounded-xl border border-[var(--border)] p-3 sm:p-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-[var(--foreground)]">
                {aliasEditing ? 'Editar alias' : 'Novo alias'}
              </h3>
              {aliasEditing ? (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={aliasSaving}
                  onClick={resetAliasForm}
                >
                  Cancelar edição
                </Button>
              ) : null}
            </div>

            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <Input
                label="Buscar estabelecimento"
                value={aliasMerchantQuery}
                disabled={aliasSaving}
                placeholder="Digite para buscar"
                onChange={(event) => {
                  setAliasMerchantQuery(event.target.value);
                  setAliasOptionsLoading(true);
                  if (
                    aliasSelectedMerchant &&
                    event.target.value !== aliasSelectedMerchant.name
                  ) {
                    setAliasMerchantId('');
                    setAliasSelectedMerchant(null);
                  }
                }}
              />

              <label className="space-y-1 text-sm font-medium text-[var(--foreground)]">
                Estabelecimento
                <select
                  aria-label="Estabelecimento do alias"
                  value={aliasMerchantId}
                  onChange={(event) => {
                    const id = event.target.value;
                    setAliasMerchantId(id);
                    const selected = merchantOptions.find(
                      (option) => option.id === id,
                    );
                    setAliasSelectedMerchant(
                      selected
                        ? {
                            id: selected.id,
                            name: selected.name,
                            isActive: selected.isActive,
                          }
                        : null,
                    );
                  }}
                  disabled={aliasSaving || aliasOptionsLoading}
                  className="min-h-11 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--background)] px-3 py-2.5"
                >
                  <option value="">
                    {aliasOptionsLoading ? 'Buscando...' : 'Selecione'}
                  </option>
                  {merchantOptions.map((item) => (
                    <option
                      key={item.id}
                      value={item.id}
                      disabled={!item.isActive}
                    >
                      {item.name}
                      {item.isActive ? '' : ' (inativo)'}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-1 text-sm font-medium text-[var(--foreground)]">
                Operador
                <select
                  aria-label="Operador do alias"
                  value={aliasOperator}
                  onChange={(event) =>
                    setAliasOperator(
                      event.target.value as MerchantAliasOperator,
                    )
                  }
                  disabled={aliasSaving}
                  className="min-h-11 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--background)] px-3 py-2.5"
                >
                  <option value="EQUALS">Igual a</option>
                  <option value="STARTS_WITH">Começa com</option>
                  <option value="CONTAINS">Contém</option>
                </select>
              </label>

              <Input
                label="Padrão"
                value={aliasPattern}
                maxLength={120}
                disabled={aliasSaving}
                placeholder="Ex.: MERCADOPAGO*IFOOD"
                onChange={(event) => {
                  setAliasPattern(event.target.value);
                  setTestResult(null);
                }}
              />

              <label className="space-y-1 text-sm font-medium text-[var(--foreground)]">
                Prioridade
                <input
                  aria-label="Prioridade do alias"
                  type="number"
                  min={0}
                  max={1000}
                  value={aliasPriority}
                  disabled={aliasSaving}
                  onChange={(event) =>
                    setAliasPriority(
                      Math.max(
                        0,
                        Math.min(1000, Number(event.target.value) || 0),
                      ),
                    )
                  }
                  className="min-h-11 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--background)] px-3 py-2.5"
                />
                <span className="block text-xs font-normal text-[var(--text-muted)]">
                  Menor valor tem preferência após operador e especificidade.
                </span>
              </label>

              <Input
                label="Testar contra descrição"
                value={testDescription}
                maxLength={255}
                disabled={aliasSaving}
                placeholder="Ex.: MERCADOPAGO*IFOOD 1234"
                onChange={(event) => {
                  setTestDescription(event.target.value);
                  setTestResult(null);
                }}
              />
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                disabled={aliasSaving}
                onClick={() => void testAlias()}
              >
                Testar
              </Button>
              <Button
                type="button"
                isLoading={aliasSaving}
                onClick={() => void saveAlias()}
              >
                {aliasEditing ? 'Salvar alias' : 'Adicionar alias'}
              </Button>
              {testResult !== null ? (
                <span className="text-sm font-semibold text-[var(--foreground)]">
                  {testResult
                    ? 'A descrição corresponde ao alias.'
                    : 'A descrição não corresponde ao alias.'}
                </span>
              ) : null}
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Input
              aria-label="Buscar aliases por padrão"
              placeholder="Buscar padrão"
              value={aliasSearch}
              onChange={(event) => {
                setAliasSearch(event.target.value);
                setAliasPage(1);
                setAliasesLoading(true);
                setAliasError(null);
              }}
            />
            <Input
              aria-label="Filtrar aliases por estabelecimento"
              placeholder="Filtrar por estabelecimento"
              value={aliasMerchantFilter}
              onChange={(event) => {
                setAliasMerchantFilter(event.target.value);
                setAliasPage(1);
                setAliasesLoading(true);
                setAliasError(null);
              }}
            />
          </div>

          {aliasesLoading ? (
            <p className="mt-4 text-sm text-[var(--text-muted)]">
              Carregando aliases...
            </p>
          ) : aliases.length === 0 ? (
            <p className="mt-4 text-sm text-[var(--text-muted)]">
              Nenhum alias encontrado.
            </p>
          ) : (
            <div className="mt-4 divide-y divide-[var(--border)] rounded-xl border border-[var(--border)]">
              {aliases.map((alias) => (
                <div
                  key={alias.id}
                  className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="break-words text-sm font-semibold text-[var(--foreground)]">
                      {alias.merchant.name}
                      {!alias.merchant.isActive ? ' · Inativo' : ''}
                    </p>
                    <p className="mt-0.5 break-words text-sm text-[var(--text-muted)]">
                      {operatorLabel(alias.operator)} · {alias.pattern}
                    </p>
                    <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                      Prioridade {alias.priority}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      disabled={aliasSaving}
                      onClick={() => startAliasEdit(alias)}
                      icon={<FaEdit />}
                    >
                      Editar
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="danger"
                      disabled={aliasSaving}
                      onClick={() => void removeAlias(alias.id)}
                    >
                      Remover
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-4">
            <Pagination
              page={aliasPage}
              pageSize={ALIAS_PAGE_SIZE}
              total={aliasTotal}
              totalPages={aliasTotalPages}
              onPageChange={(page) => {
                setAliasesLoading(true);
                setAliasError(null);
                setAliasPage(page);
              }}
              onPageSizeChange={() => {
                setAliasesLoading(true);
                setAliasError(null);
                setAliasPage(1);
              }}
              pageSizeOptions={[ALIAS_PAGE_SIZE]}
              loading={aliasesLoading}
            />
          </div>
        </section>

        <section
          className="ds-panel mt-4 overflow-hidden"
          aria-labelledby="merchant-list-heading"
        >
          <div className="border-b border-[var(--border)] p-4 sm:p-5">
            <h2
              id="merchant-list-heading"
              className="font-semibold text-[var(--foreground)]"
            >
              Seus estabelecimentos
            </h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_180px]">
              <Input
                aria-label="Buscar estabelecimentos"
                placeholder="Buscar por nome"
                value={merchantSearch}
                onChange={(event) => {
                  setMerchantSearch(event.target.value);
                  setMerchantPage(1);
                  setMerchantLoading(true);
                  setMerchantError(null);
                }}
              />
              <label className="space-y-1 text-sm font-medium text-[var(--foreground)]">
                Status
                <select
                  aria-label="Filtrar estabelecimentos por status"
                  value={merchantStatus}
                  onChange={(event) => {
                    setMerchantStatus(
                      event.target.value as MerchantStatusFilter,
                    );
                    setMerchantPage(1);
                    setMerchantLoading(true);
                    setMerchantError(null);
                  }}
                  className="min-h-11 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--background)] px-3 py-2.5"
                >
                  <option value="all">Todos</option>
                  <option value="active">Ativos</option>
                  <option value="inactive">Inativos</option>
                </select>
              </label>
            </div>
          </div>

          {merchantLoading ? (
            <p className="p-5 text-sm text-[var(--text-muted)]">
              Carregando...
            </p>
          ) : items.length === 0 ? (
            <p className="p-5 text-sm text-[var(--text-muted)]">
              Nenhum estabelecimento encontrado.
            </p>
          ) : (
            <div className="divide-y divide-[var(--border)]">
              {items.map((item) => (
                <article
                  key={item.id}
                  className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <strong className="break-words text-[var(--foreground)]">
                        {item.name}
                      </strong>
                      <span className="rounded-full bg-[var(--surface-subtle)] px-2 py-0.5 text-xs font-semibold text-[var(--foreground)]">
                        {item.isActive ? 'Ativo' : 'Inativo'}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-[var(--text-muted)]">
                      {item.transactionsCount} transação(ões) ·{' '}
                      {item.aliasesCount} alias(es)
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => startEdit(item)}
                      icon={<FaEdit />}
                    >
                      Editar
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => void toggleActive(item)}
                    >
                      {item.isActive ? 'Desativar' : 'Ativar'}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="danger"
                      onClick={() => setDeleteCandidate(item)}
                      icon={<FaTrash />}
                    >
                      Excluir
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          )}

          <div className="p-4 sm:p-5">
            <Pagination
              page={merchantPage}
              pageSize={MERCHANT_PAGE_SIZE}
              total={merchantTotal}
              totalPages={merchantTotalPages}
              onPageChange={(page) => {
                setMerchantLoading(true);
                setMerchantError(null);
                setMerchantPage(page);
              }}
              onPageSizeChange={() => {
                setMerchantLoading(true);
                setMerchantError(null);
                setMerchantPage(1);
              }}
              pageSizeOptions={[MERCHANT_PAGE_SIZE]}
              loading={merchantLoading}
            />
          </div>
        </section>
      </div>

      {deleteCandidate ? (
        <div className="fixed inset-0 z-[70]">
          <button
            type="button"
            tabIndex={-1}
            aria-label="Fechar confirmação"
            className="absolute inset-0 h-full w-full bg-[var(--overlay)]"
            onClick={deleting ? undefined : closeDeleteDialog}
          />
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-4">
            <div
              ref={deleteDialogRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="merchant-delete-title"
              aria-describedby="merchant-delete-description"
              tabIndex={-1}
              className="pointer-events-auto w-full max-w-md rounded-2xl border border-[var(--border-strong)] bg-[var(--card)] p-5 shadow-2xl"
            >
              <h2
                id="merchant-delete-title"
                className="text-lg font-semibold text-[var(--foreground)]"
              >
                {deleteCandidate.transactionsCount > 0 ||
                deleteCandidate.aliasesCount > 0
                  ? 'Este estabelecimento está em uso'
                  : 'Excluir estabelecimento?'}
              </h2>

              <div
                id="merchant-delete-description"
                className="mt-2 space-y-2 text-sm text-[var(--text-muted)]"
              >
                <p>
                  <strong className="text-[var(--foreground)]">
                    {deleteCandidate.name}
                  </strong>{' '}
                  possui {deleteCandidate.transactionsCount} transação(ões) e{' '}
                  {deleteCandidate.aliasesCount} alias(es).
                </p>
                {deleteCandidate.transactionsCount > 0 ||
                deleteCandidate.aliasesCount > 0 ? (
                  <p>
                    O histórico não será apagado. Para impedir novos usos,
                    desative o estabelecimento; aliases continuam administráveis
                    separadamente.
                  </p>
                ) : (
                  <p>
                    Como não há transações nem aliases vinculados, a exclusão
                    permanente é segura.
                  </p>
                )}
              </div>

              <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={deleting}
                  onClick={closeDeleteDialog}
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  variant={
                    deleteCandidate.transactionsCount > 0 ||
                    deleteCandidate.aliasesCount > 0
                      ? 'secondary'
                      : 'danger'
                  }
                  isLoading={deleting}
                  disabled={
                    deleting ||
                    ((!deleteCandidate.isActive &&
                      (deleteCandidate.transactionsCount > 0 ||
                        deleteCandidate.aliasesCount > 0)))
                  }
                  onClick={() => void confirmDeleteAction()}
                >
                  {deleteCandidate.transactionsCount > 0 ||
                  deleteCandidate.aliasesCount > 0
                    ? deleteCandidate.isActive
                      ? 'Desativar'
                      : 'Já está inativo'
                    : 'Excluir definitivamente'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </ProtectedRoute>
  );
}
