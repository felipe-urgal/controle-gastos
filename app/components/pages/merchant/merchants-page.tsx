'use client';

import { PageContainer, PageTitle } from '@/app/components/base-pages';
import { ModalShell } from '@/app/components/overlays/modal-shell';
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

import { Alert } from '@/app/components/feedback';
import { ProtectedRoute } from '@/app/components/layout';
import Pagination from '@/app/components/navigation/pagination';
import { Button, Input, Select } from '@/app/components/ui';
import Link from 'next/link';
import { useAuth } from '@/app/context';
import { useDebounce } from '@/app/hooks/use-debounce';
import { merchantAliasService } from '@/app/services/merchant-alias-service';
import { merchantService } from '@/app/services/merchant-service';
import type {
  MerchantAliasDTO,
  MerchantAliasOperator,
  MerchantAliasPreviewDTO,
} from '@/app/types/merchant-alias';
import type { MerchantDTO, MerchantMonthSummary } from '@/app/types/merchant';
import { formatCurrency } from '@/app/lib/currency/format-currency';
import { joinNames, pickSpend, shareWidth, spendDelta, spendDeltaLabel, topShare } from '@/app/components/pages/merchant/merchants-model';

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

export default function MerchantsPage({ focusMerchantId }: { focusMerchantId?: string }) {
  const [items, setItems] = useState<MerchantDTO[]>([]);
  const [summary, setSummary] = useState<MerchantMonthSummary | null>(null);
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
  const [aliasPreview, setAliasPreview] =
    useState<MerchantAliasPreviewDTO | null>(null);
  const [aliasSaving, setAliasSaving] = useState(false);

  const [deleteCandidate, setDeleteCandidate] =
    useState<MerchantDTO | null>(null);
  const [deleting, setDeleting] = useState(false);

  const { user } = useAuth();
  const showValues = user?.showValues !== false;
  const formatMoney = (cents: number, currency: string) => (showValues ? formatCurrency(cents, currency) : '••••');
  const heroCurrency = summary?.currencies[0] ?? null;
  const summaryLoaded = summary !== null;
  const heroShare = heroCurrency ? topShare(heroCurrency) : null;
  const maxSpend = Math.max(0, ...items.map((item) => pickSpend(item.monthSpend, heroCurrency?.currency)?.expense ?? 0));

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
      setSummary(data?.summary ?? null);
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
    const timeoutId = window.setTimeout(() => {
      void loadMerchants();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadMerchants]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadAliases();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadAliases]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadAliasMerchantOptions();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadAliasMerchantOptions]);

  useEffect(() => {
    if (!focusMerchantId) return;
    let cancelled = false;
    void merchantService.getById(focusMerchantId).then((response) => {
      if (cancelled) return;
      setEditing(response.data);
      setName(response.data.name);
      setMerchantError(null);
    }).catch(() => {
      // An unknown or foreign ID must behave like the normal listing.
    });
    return () => { cancelled = true; };
  }, [focusMerchantId]);

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
    setAliasPreview(null);
  }

  function startAliasEdit(alias: MerchantAliasDTO) {
    setAliasEditing(alias);
    setAliasMerchantId(alias.merchant.id);
    setAliasSelectedMerchant(alias.merchant);
    setAliasMerchantQuery(alias.merchant.name);
    setAliasOperator(alias.operator);
    setAliasPattern(alias.pattern);
    setAliasPriority(alias.priority);
    setAliasPreview(null);
    setAliasError(null);
  }

  function currentAliasPayload() {
    return {
      merchantId: aliasMerchantId,
      operator: aliasOperator,
      pattern: aliasPattern,
      priority: aliasPriority,
    };
  }

  async function previewAlias(description?: string) {
    const response = await merchantAliasService.preview({
      ...currentAliasPayload(),
      ...(aliasEditing ? { aliasId: aliasEditing.id } : {}),
      ...(description ? { description } : {}),
    });
    setAliasPreview(response.data);
    return response.data;
  }

  async function saveAlias() {
    if (!aliasMerchantId || !aliasPattern.trim()) {
      setAliasError(
        'Selecione um estabelecimento e informe um padrão.',
      );
      return;
    }

    const overlapAlreadyReviewed = Boolean(
      aliasPreview?.canSave && aliasPreview.overlapCount > 0,
    );

    setAliasSaving(true);
    setAliasError(null);
    try {
      const preview = await previewAlias(
        testDescription.trim() || undefined,
      );

      if (!preview.canSave) {
        setAliasError(
          preview.canMove
            ? 'Já existe um alias equivalente em outro estabelecimento. Use a ação de mover abaixo.'
            : 'Este alias equivalente já existe e não será duplicado.',
        );
        return;
      }

      if (preview.overlapCount > 0 && !overlapAlreadyReviewed) {
        setAliasError(
          'Há overlaps potenciais. Revise o impacto abaixo e clique em salvar novamente para confirmar.',
        );
        return;
      }

      const payload = currentAliasPayload();
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
    if (
      !aliasMerchantId ||
      !aliasPattern.trim() ||
      !testDescription.trim()
    ) {
      setAliasError(
        'Selecione o estabelecimento, informe o padrão e uma descrição para testar.',
      );
      return;
    }

    setAliasSaving(true);
    setAliasError(null);
    try {
      await previewAlias(testDescription.trim());
    } catch (error) {
      setAliasError(errorMessage(error, 'Erro ao testar alias'));
    } finally {
      setAliasSaving(false);
    }
  }

  async function moveEquivalentAlias() {
    if (!aliasPreview?.canMove || !aliasMerchantId) return;

    setAliasSaving(true);
    setAliasError(null);
    try {
      await merchantAliasService.reassign(currentAliasPayload());
      resetAliasForm();
      await Promise.all([loadAliases(), loadMerchants()]);
    } catch (error) {
      setAliasError(errorMessage(error, 'Erro ao mover alias'));
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
      <PageContainer>
        <PageTitle
          title="Estabelecimentos"
          description="Padronize onde suas transações aconteceram sem alterar a descrição original."
        />

        {heroCurrency || summaryLoaded ? (
          <section
            aria-label="Gasto do mês em estabelecimentos"
            className="mt-4 grid gap-3 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-surface)] sm:p-5"
          >
            {heroCurrency ? (
              <>
                <p className="text-sm font-semibold text-[var(--text-muted)]">Gasto do mês em estabelecimentos reconhecidos</p>
                <strong className="money block break-words text-[2.125rem] font-semibold leading-none tracking-[-0.035em] sm:text-5xl">
                  {formatMoney(heroCurrency.assigned, heroCurrency.currency)}
                </strong>
                <p className="text-sm text-[var(--text-muted)]">
                  {heroShare !== null && heroCurrency.top.length > 1 ? (
                    <>
                      <strong className="text-[var(--foreground)]">{heroShare}%</strong> foi em {heroCurrency.top.length === 3 ? 'três lugares' : 'dois lugares'}: {joinNames(heroCurrency.top.map((entry) => entry.name))}.{' '}
                    </>
                  ) : heroCurrency.top[0] ? (
                    <>
                      Quase tudo foi em <strong className="text-[var(--foreground)]">{heroCurrency.top[0].name}</strong>.{' '}
                    </>
                  ) : null}
                  {heroCurrency.unassigned > 0 ? (
                    <>
                      <span className="money font-semibold text-[var(--foreground)]">{formatMoney(heroCurrency.unassigned, heroCurrency.currency)}</span> ainda estão em despesas sem estabelecimento.
                    </>
                  ) : null}
                </p>
                {summary && summary.currencies.length > 1 ? (
                  <p className="text-xs text-[var(--text-muted)]">
                    Há gastos em {summary.currencies.slice(1).map((entry) => entry.currency).join(', ')}; os valores acima são em {heroCurrency.currency}.
                  </p>
                ) : null}
              </>
            ) : (
              <p className="text-sm text-[var(--text-muted)]">Nenhuma despesa concluída neste mês. Os gastos por estabelecimento aparecem aqui assim que houver movimentação.</p>
            )}
          </section>
        ) : null}

        <section
          className="ds-panel mt-4 overflow-hidden"
          aria-labelledby="merchant-list-heading"
        >
          <div className="grid gap-3 border-b border-[var(--border)] p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <FaStore className="text-[var(--orbit-primary)]" aria-hidden="true" />
                <h2 id="merchant-list-heading" className="font-semibold text-[var(--foreground)]">
                  {editing ? 'Editar estabelecimento' : 'Onde você gasta'}
                </h2>
              </div>
              <span className="text-sm text-[var(--text-muted)]">{merchantTotal} cadastrado(s)</span>
            </div>

            {merchantError ? <Alert variant="error" message={merchantError} /> : null}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
              <Input
                label={editing ? 'Nome' : 'Novo estabelecimento'}
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
                  <Button type="button" variant="secondary" disabled={saving} onClick={resetForm}>
                    Cancelar
                  </Button>
                ) : null}
                <Button type="button" isLoading={saving} onClick={() => void save()} icon={editing ? <FaEdit /> : <FaPlus />}>
                  {editing ? 'Salvar' : 'Adicionar'}
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_180px]">
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
              <Select
                label="Status"
                ariaLabel="Filtrar estabelecimentos por status"
                value={merchantStatus}
                onChange={(value) => {
                  setMerchantStatus(value as MerchantStatusFilter);
                  setMerchantPage(1);
                  setMerchantLoading(true);
                  setMerchantError(null);
                }}
                options={[
                  { value: 'all', label: 'Todos' },
                  { value: 'active', label: 'Ativos' },
                  { value: 'inactive', label: 'Inativos' },
                ]}
              />
            </div>
          </div>

          {merchantLoading ? (
            <p className="p-5 text-sm text-[var(--text-muted)]">Carregando...</p>
          ) : items.length === 0 ? (
            <p className="p-5 text-sm text-[var(--text-muted)]">Nenhum estabelecimento encontrado.</p>
          ) : (
            <div className="divide-y divide-[var(--border)]">
              {items.map((item) => {
                const spend = pickSpend(item.monthSpend, heroCurrency?.currency);
                const delta = spendDelta(spend);
                return (
                  <article key={item.id} className="grid gap-3 p-4 sm:p-5">
                    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <Link href={`/estabelecimentos/show/${encodeURIComponent(item.id)}`} className="inline-flex min-h-11 min-w-11 items-center break-words font-bold text-[var(--foreground)] hover:underline">
                            {item.name}
                          </Link>
                          <span className="rounded-full bg-[var(--surface-subtle)] px-2 py-0.5 text-xs font-semibold text-[var(--foreground)]">
                            {item.isActive ? 'Ativo' : 'Inativo'}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-[var(--text-muted)]">
                          {spend ? `${spend.count} ${spend.count === 1 ? 'compra' : 'compras'} no mês · ` : 'Sem compras no mês · '}
                          {item.transactionsCount} transação(ões) · {item.aliasesCount} alias(es)
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="money font-semibold text-[var(--foreground)]">
                          {spend && spend.expense > 0 ? formatMoney(spend.expense, spend.currency) : '—'}
                        </p>
                        {delta.kind !== 'NONE' ? (
                          <p className={`text-xs font-semibold ${delta.kind === 'UP' ? 'text-[var(--warning)]' : delta.kind === 'DOWN' ? 'text-[var(--income)]' : 'text-[var(--text-muted)]'}`}>
                            {spendDeltaLabel(delta)}
                          </p>
                        ) : null}
                      </div>
                    </div>

                    {spend && spend.expense > 0 ? (
                      <div className="h-1.5 overflow-hidden rounded-full bg-[var(--surface-subtle)]" role="img" aria-label={`Participação de ${item.name} no gasto da página`}>
                        <div className="h-full rounded-full bg-[var(--orbit-primary)]" style={{ width: `${shareWidth(spend.expense, maxSpend)}%` }} />
                      </div>
                    ) : null}

                    <div className="flex flex-wrap gap-2">
                      <Button type="button" size="sm" variant="secondary" onClick={() => startEdit(item)} icon={<FaEdit />}>
                        Editar
                      </Button>
                      <Button type="button" size="sm" variant="secondary" onClick={() => void toggleActive(item)}>
                        {item.isActive ? 'Desativar' : 'Ativar'}
                      </Button>
                      <Button type="button" size="sm" variant="danger" onClick={() => setDeleteCandidate(item)} icon={<FaTrash />}>
                        Excluir
                      </Button>
                    </div>
                  </article>
                );
              })}
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

        <details className="group mt-4 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)]">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-4 text-sm font-semibold text-[var(--foreground)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--focus)] sm:px-5 [&::-webkit-details-marker]:hidden">
            <span>Reconhecimento automático</span>
            <span className="text-sm font-normal text-[var(--text-muted)]">{aliasTotal} alias(es)</span>
          </summary>
        <section
          className="border-t border-[var(--border)] p-4 sm:p-5"
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

            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
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
                    setAliasPreview(null);
                  }
                }}
              />

              <Select
                label="Estabelecimento"
                ariaLabel="Estabelecimento do alias"
                value={aliasMerchantId}
                onChange={(value) => {
                  const id = String(value);
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
                  setAliasPreview(null);
                }}
                disabled={aliasSaving || aliasOptionsLoading}
                placeholder={aliasOptionsLoading ? 'Buscando...' : 'Selecione'}
                options={merchantOptions.map((item) => ({
                  value: item.id,
                  label: `${item.name}${item.isActive ? '' : ' (inativo)'}`,
                  disabled: !item.isActive,
                }))}
              />

              <Select
                label="Operador"
                ariaLabel="Operador do alias"
                value={aliasOperator}
                onChange={(value) => {
                  setAliasOperator(value as MerchantAliasOperator);
                  setAliasPreview(null);
                }}
                disabled={aliasSaving}
                options={[
                  { value: 'EQUALS', label: 'Igual a' },
                  { value: 'STARTS_WITH', label: 'Começa com' },
                  { value: 'CONTAINS', label: 'Contém' },
                ]}
              />

              <Input
                label="Padrão"
                value={aliasPattern}
                maxLength={120}
                disabled={aliasSaving}
                placeholder="Ex.: MERCADOPAGO*IFOOD"
                onChange={(event) => {
                  setAliasPattern(event.target.value);
                  setAliasPreview(null);
                }}
              />

              <div>
                <Input
                  label="Prioridade"
                  aria-label="Prioridade do alias"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={1000}
                  value={aliasPriority}
                  disabled={aliasSaving}
                  onChange={(event) => {
                    setAliasPriority(
                      Math.max(
                        0,
                        Math.min(1000, Number(event.target.value) || 0),
                      ),
                    );
                    setAliasPreview(null);
                  }}
                />
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  Menor valor tem preferência após operador e especificidade.
                </p>
              </div>

              <Input
                label="Testar contra descrição"
                value={testDescription}
                maxLength={255}
                disabled={aliasSaving}
                placeholder="Ex.: MERCADOPAGO*IFOOD 1234"
                onChange={(event) => {
                  setTestDescription(event.target.value);
                  setAliasPreview(null);
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
            </div>

            {aliasPreview ? (
              <div
                className="mt-3 space-y-3 rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] p-3 text-sm"
                aria-live="polite"
              >
                {aliasPreview.exactEquivalent ? (
                  <div className="rounded-lg border border-[var(--warning)]/40 bg-[var(--warning-subtle)] p-3">
                    <p className="font-semibold text-[var(--foreground)]">
                      Alias equivalente já cadastrado
                    </p>
                    <p className="mt-1 text-[var(--text-muted)]">
                      {aliasPreview.exactEquivalent.pattern} pertence a{' '}
                      <strong>
                        {aliasPreview.exactEquivalent.merchant.name}
                      </strong>.
                    </p>
                    {aliasPreview.canMove && aliasSelectedMerchant ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        disabled={aliasSaving}
                        onClick={() => void moveEquivalentAlias()}
                        className="mt-2"
                      >
                        Mover alias para {aliasSelectedMerchant.name}
                      </Button>
                    ) : null}
                  </div>
                ) : null}

                {aliasPreview.overlapCount > 0 ? (
                  <div>
                    <p className="font-semibold text-[var(--foreground)]">
                      {aliasPreview.overlapCount} overlap(s) potencial(is)
                    </p>
                    <p className="mt-1 text-xs text-[var(--text-muted)]">
                      Overlap não bloqueia o cadastro, mas pode exigir revisão
                      quando uma descrição casar com merchants diferentes.
                    </p>
                    <ul className="mt-2 space-y-1 text-[var(--text-muted)]">
                      {aliasPreview.overlaps.slice(0, 5).map((overlap) => (
                        <li key={overlap.aliasId}>
                          {overlap.merchant.name} · {operatorLabel(overlap.operator)} ·{' '}
                          {overlap.pattern}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {aliasPreview.test ? (
                  <div>
                    <p className="font-semibold text-[var(--foreground)]">
                      Teste da descrição
                    </p>
                    <p className="mt-1 text-[var(--text-muted)]">
                      {aliasPreview.test.matchesCandidate
                        ? 'O novo alias corresponde à descrição.'
                        : 'O novo alias não corresponde à descrição.'}
                      {aliasPreview.test.conflict
                        ? ' Há conflito entre estabelecimentos; nenhum deve ser aplicado automaticamente.'
                        : aliasPreview.test.winner
                          ? ` Vencedor: ${aliasPreview.test.winner.merchantName}.`
                          : ' Nenhum estabelecimento seria reconhecido.'}
                    </p>
                    {aliasPreview.test.candidates.length > 0 ? (
                      <ul className="mt-2 space-y-1 text-xs text-[var(--text-muted)]">
                        {aliasPreview.test.candidates.map((candidate) => (
                          <li key={candidate.aliasId}>
                            {candidate.candidate ? 'Novo alias' : candidate.merchantName}
                            {' · '}
                            {candidate.operator}
                            {' · '}
                            {candidate.pattern}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
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

        </details>
      </PageContainer>

      {deleteCandidate ? (
        <ModalShell
          title={
            (deleteCandidate.transactionsCount > 0 || deleteCandidate.aliasesCount > 0)
              ? 'Este estabelecimento está em uso'
              : 'Excluir estabelecimento?'
          }
          onClose={closeDeleteDialog}
          closeDisabled={deleting}
          maxWidthClass="max-w-md"
          footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
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
          }
        >
      <div
        className="space-y-2 text-sm text-[var(--text-muted)]"
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
        </ModalShell>
      ) : null}
    </ProtectedRoute>
  );
}
