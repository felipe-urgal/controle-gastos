'use client';

import { useMediaQuery } from '@/app/hooks/use-media-query';
import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from 'react';

import { PageHeader } from '@/app/components/base-pages';
import { Alert } from '@/app/components/feedback';
import { ProtectedRoute } from '@/app/components/layout';

import { Button, Chip, ChipRow, Input, Select } from '@/app/components/ui';
import { useAuth } from '@/app/context';

import { accountService } from '@/app/services/account-service';
import { ApiClientError } from '@/app/services/api-client';
import { categoryService } from '@/app/services/category-service';
import { merchantService } from '@/app/services/merchant-service';
import { transactionImportService } from '@/app/services/transaction-import-service';
import type { AccountModel } from '@/app/types/account';
import type { CategoryModel } from '@/app/types/category';
import type { MerchantDTO } from '@/app/types/merchant';

import { ConfirmData, EditablePreviewItem, InboxFilter, InboxState, PreviewData, QifDateOrder, formatAmount, getInboxState, inboxFilters, stateClass, stateLabel, toConfirmItem } from '@/app/components/pages/transactions/import/import-helpers';
import { ImportDetail, InboxMetric, MobileImportDetail } from '@/app/components/pages/transactions/import/import-detail';

export default function TransactionImportPage() {
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const { user } = useAuth();
  const showValues = user?.showValues !== false;
  const [accounts, setAccounts] = useState<AccountModel[]>([]);
  const [categories, setCategories] = useState<CategoryModel[]>([]);
  const [merchants, setMerchants] = useState<MerchantDTO[]>([]);
  const [merchantOptionsUnavailable, setMerchantOptionsUnavailable] = useState(false);
  const [accountLoadError, setAccountLoadError] = useState('');
  const [categoryLoadError, setCategoryLoadError] = useState('');
  const [retryingSource, setRetryingSource] = useState<'accounts' | 'categories' | 'merchants' | null>(null);
  const [merchantSearch, setMerchantSearch] = useState('');
  const [merchantSearchLoading, setMerchantSearchLoading] = useState(false);
  const merchantSearchRequest = useRef(0);
  const [accountId, setAccountId] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [qifDateOrder, setQifDateOrder] = useState<'' | QifDateOrder>('');
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [previewNow, setPreviewNow] = useState(() => Date.now());
  const [bulkCategoryId, setBulkCategoryId] = useState('');
  const [confirmMerchantConflictBulk, setConfirmMerchantConflictBulk] = useState(false);
  const [items, setItems] = useState<EditablePreviewItem[]>([]);
  const [result, setResult] = useState<ConfirmData | null>(null);
  const [filter, setFilter] = useState<InboxFilter>('all');
  const [search, setSearch] = useState('');
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);
  const [loadingRelations, setLoadingRelations] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadRelations() {
      setLoadingRelations(true);

      const [accountResult, categoryResult] = await Promise.allSettled([
        accountService.getAll(),
        categoryService.getAll(),
      ]);

      if (accountResult.status === 'fulfilled') {
        const activeAccounts = (accountResult.value.data?.items ?? []).filter((account) => account.isActive);
        setAccounts(activeAccounts);
        setAccountLoadError('');
        if (activeAccounts.length === 1) setAccountId(activeAccounts[0].id);
      } else {
        setAccounts([]);
        setAccountId('');
        setAccountLoadError('Não foi possível carregar contas.');
      }

      if (categoryResult.status === 'fulfilled') {
        setCategories((categoryResult.value.data?.items ?? []).filter((category) => category.isActive));
        setCategoryLoadError('');
      } else {
        setCategories([]);
        setCategoryLoadError('Não foi possível carregar categorias.');
      }

      try {
        const merchantResponse = await merchantService.searchOptions();
        setMerchants(merchantResponse.filter((merchant) => merchant.isActive));
        setMerchantOptionsUnavailable(false);
      } catch {
        setMerchants([]);
        setMerchantOptionsUnavailable(true);
      } finally {
        setLoadingRelations(false);
      }
    }

    void loadRelations();
  }, []);

  useEffect(() => {
    if (!preview || result) return;
    const interval = window.setInterval(() => setPreviewNow(Date.now()), 15_000);
    return () => window.clearInterval(interval);
  }, [preview, result]);

  async function retryAccounts() {
    setRetryingSource('accounts');
    try {
      const response = await accountService.getAll();
      const activeAccounts = (response.data?.items ?? []).filter((account) => account.isActive);
      setAccounts(activeAccounts);
      setAccountId((current) =>
        activeAccounts.some((account) => account.id === current)
          ? current
          : activeAccounts.length === 1
            ? activeAccounts[0].id
            : '',
      );
      setAccountLoadError('');
    } catch {
      setAccountLoadError('Não foi possível carregar contas.');
    } finally {
      setRetryingSource(null);
    }
  }

  async function retryCategories() {
    setRetryingSource('categories');
    try {
      const response = await categoryService.getAll();
      setCategories((response.data?.items ?? []).filter((category) => category.isActive));
      setCategoryLoadError('');
    } catch {
      setCategoryLoadError('Não foi possível carregar categorias.');
    } finally {
      setRetryingSource(null);
    }
  }

  async function retryMerchants() {
    setRetryingSource('merchants');
    try {
      const response = await merchantService.searchOptions(merchantSearch);
      setMerchants(response.filter((merchant) => merchant.isActive));
      setMerchantOptionsUnavailable(false);
    } catch {
      setMerchants([]);
      setMerchantOptionsUnavailable(true);
    } finally {
      setRetryingSource(null);
    }
  }

  async function searchMerchants(query: string) {
    setMerchantSearch(query);
    const requestId = merchantSearchRequest.current + 1;
    merchantSearchRequest.current = requestId;
    setMerchantSearchLoading(true);

    try {
      const response = await merchantService.searchOptions(query);
      if (merchantSearchRequest.current !== requestId) return;

      setMerchants(response.filter((merchant) => merchant.isActive));
      setMerchantOptionsUnavailable(false);
    } catch {
      if (merchantSearchRequest.current !== requestId) return;

      setMerchants([]);
      setMerchantOptionsUnavailable(true);
    } finally {
      if (merchantSearchRequest.current === requestId) {
        setMerchantSearchLoading(false);
      }
    }
  }

  const account = useMemo(
    () => accounts.find((candidate) => candidate.id === accountId),
    [accountId, accounts],
  );
  const categoryById = useMemo(
    () => new Map(categories.map((category) => [category.id, category])),
    [categories],
  );

  const stateCounts = useMemo(() => {
    const counts: Record<InboxState, number> = {
      review: 0,
      ready: 0,
      duplicate: 0,
      ignored: 0,
    };

    for (const item of items) counts[getInboxState(item)] += 1;
    return counts;
  }, [items]);

  const selectedCount = items.filter((item) => getInboxState(item) === 'ready').length;
  const reviewCount = stateCounts.review;
  const ignoredOnConfirm = stateCounts.duplicate + stateCounts.ignored;
  const step = result ? 3 : preview ? 2 : 1;
  const previewExpiresAtMs = preview ? Date.parse(preview.previewExpiresAt) : 0;
  const previewRemainingMs = preview ? previewExpiresAtMs - previewNow : 0;
  const previewExpired = Boolean(preview) && previewRemainingMs <= 0;
  const previewExpiring =
    Boolean(preview) && !previewExpired && previewRemainingMs <= 2 * 60 * 1000;

  const visibleItems = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase('pt-BR');

    return items.filter((item) => {
      if (filter !== 'all' && getInboxState(item) !== filter) return false;
      if (!normalizedSearch) return true;

      return [item.description, item.date, item.source, item.matchedRuleName ?? '', item.suggestedMerchantName ?? '']
        .join(' ')
        .toLocaleLowerCase('pt-BR')
        .includes(normalizedSearch);
    });
  }, [filter, items, search]);

  const activeItem =
    items.find((item) => item.index === activeIndex) ?? visibleItems[0] ?? null;

  function resetImport() {
    setFile(null);
    setPreview(null);
    setItems([]);
    setQifDateOrder('');
    setBulkCategoryId('');
    setResult(null);
    setFilter('all');
    setSearch('');
    setActiveIndex(null);
    setMobileDetailOpen(false);
    setError('');
  }

  function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    const nextFile = event.target.files?.[0] ?? null;
    setFile(nextFile);
    if (!nextFile?.name.toLowerCase().endsWith('.qif')) {
      setQifDateOrder('');
    }
    setError('');
  }

  async function generatePreview(preserveChoices: boolean) {
    if (!accountId || !file) {
      setError('Selecione uma conta e um arquivo CSV, OFX, QFX, QIF ou XLSX.');
      return;
    }

    const previousByFingerprint = preserveChoices
      ? new Map(items.map((item) => [item.fingerprint, item]))
      : new Map<string, EditablePreviewItem>();

    setSubmitting(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('accountId', accountId);
      formData.append('file', file);
      if (qifDateOrder) formData.append('qifDateOrder', qifDateOrder);

      const payload = await transactionImportService.preview(formData);
      if (!payload.success || !payload.data) {
        throw new Error(payload.error?.message || payload.message || 'Falha ao gerar preview.');
      }

      const editableItems = payload.data.items.map((item): EditablePreviewItem => {
        const eligibleSuggestion = item.suggestedCategoryId
          ? categories.find(
              (category) => category.id === item.suggestedCategoryId && category.type === item.type,
            )
          : null;
        const previous = previousByFingerprint.get(item.fingerprint);
        const canPreserve = Boolean(previous) && item.errors.length === 0 && !item.duplicate;

        return {
          ...item,
          selected: canPreserve
            ? previous!.selected
            : item.errors.length === 0 && !item.duplicate,
          categoryId: canPreserve
            ? previous!.categoryId
            : eligibleSuggestion?.id ?? null,
          merchantId: canPreserve
            ? previous!.merchantId
            : item.merchantAliasConflict ? null : (item.suggestedMerchantId ?? null),
          merchantReviewed: canPreserve
            ? previous!.merchantReviewed
            : Boolean(item.suggestedMerchantId) && !item.merchantAliasConflict,
          learnMerchantAlias: canPreserve ? previous!.learnMerchantAlias : false,
          merchantAliasOperator: canPreserve ? previous!.merchantAliasOperator : 'EQUALS',
          ignored: canPreserve ? previous!.ignored : item.duplicate,
        };
      });

      setPreview(payload.data);
      setPreviewNow(Date.now());
      setItems(editableItems);
      setFilter('all');
      setSearch('');
      setActiveIndex(editableItems[0]?.index ?? null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha ao gerar preview.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handlePreview(event: FormEvent) {
    event.preventDefault();
    await generatePreview(false);
  }

  function updateItem(
    index: number,
    patch: Partial<Pick<EditablePreviewItem, 'selected' | 'categoryId' | 'merchantId' | 'merchantReviewed' | 'learnMerchantAlias' | 'merchantAliasOperator' | 'ignored'>>,
  ) {
    setItems((current) => current.map((item) => (item.index === index ? { ...item, ...patch } : item)));
  }

  function openItem(index: number) {
    setActiveIndex(index);
    setMobileDetailOpen(true);
  }

  function selectResolvedVisibleItems() {
    const visibleIds = new Set(visibleItems.map((item) => item.index));
    setItems((current) =>
      current.map((item) => {
        if (!visibleIds.has(item.index) || item.duplicate || item.errors.length > 0) return item;
        const resolved =
          Boolean(item.categoryId) &&
          (item.merchantReviewed || Boolean(item.suggestedMerchantId));
        return resolved ? { ...item, selected: true, ignored: false } : item;
      }),
    );
  }

  function ignoreVisibleReadyItems() {
    const visibleIds = new Set(visibleItems.map((item) => item.index));
    setItems((current) =>
      current.map((item) =>
        visibleIds.has(item.index) && getInboxState(item) === 'ready'
          ? { ...item, selected: false, ignored: true }
          : item,
      ),
    );
  }

  function continueWithoutMerchantVisible() {
    const candidates = visibleItems.filter(
      (item) =>
        item.selected &&
        !item.ignored &&
        !item.duplicate &&
        item.errors.length === 0 &&
        (!item.merchantReviewed || item.merchantAliasConflict),
    );
    const hasConflict = candidates.some((item) => item.merchantAliasConflict);

    if (hasConflict && !confirmMerchantConflictBulk) {
      setConfirmMerchantConflictBulk(true);
      setError(
        'Há conflito de estabelecimento entre os itens visíveis. Clique novamente para confirmar que eles devem continuar sem estabelecimento.',
      );
      return;
    }

    const visibleIds = new Set(candidates.map((item) => item.index));
    setItems((current) =>
      current.map((item) =>
        visibleIds.has(item.index)
          ? {
              ...item,
              merchantId: null,
              merchantReviewed: true,
              merchantAliasConflict: false,
              learnMerchantAlias: false,
            }
          : item,
      ),
    );
    setConfirmMerchantConflictBulk(false);
    setError('');
  }

  function applyCategoryToVisibleSelected() {
    const category = categories.find((candidate) => candidate.id === bulkCategoryId);
    if (!category) return;

    const visibleIds = new Set(visibleItems.map((item) => item.index));
    setItems((current) =>
      current.map((item) =>
        visibleIds.has(item.index) &&
        item.selected &&
        !item.ignored &&
        !item.duplicate &&
        item.errors.length === 0 &&
        item.type === category.type &&
        !item.importRuleConflict
          ? { ...item, categoryId: category.id }
          : item,
      ),
    );
  }

  async function handleConfirm() {
    if (!preview || selectedCount === 0 || reviewCount > 0) return;
    if (previewExpired) {
      setError('O preview expirou. Gere novamente o mesmo arquivo para revalidar e preservar suas escolhas.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const payload = await transactionImportService.confirm({
        accountId: preview.accountId,
        previewToken: preview.previewToken,
        items: items.map(toConfirmItem),
      });
      if (!payload.success || !payload.data) {
        throw new Error(payload.error?.message || payload.message || 'Falha ao confirmar importação.');
      }
      setResult(payload.data);
      setMobileDetailOpen(false);
    } catch (cause) {
      if (cause instanceof ApiClientError && cause.code === 'IMPORT_PREVIEW_EXPIRED') {
        setPreviewNow(Date.parse(preview.previewExpiresAt));
      }
      setError(cause instanceof Error ? cause.message : 'Falha ao confirmar importação.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ProtectedRoute>
      <PageHeader
        title="Importar transações"
        description="Envie o arquivo, resolva o que precisa de atenção e confirme somente o que estiver pronto."
        backUrl="/transacoes"
        loading={loadingRelations || submitting}
      />

      <div className="mb-5 flex flex-wrap items-center gap-2 text-sm text-[var(--text-muted)]" aria-label="Etapa atual da importação">
        <span className={step >= 1 ? 'font-semibold text-[var(--foreground)]' : ''}>Arquivo</span>
        <span aria-hidden="true">→</span>
        <span className={step >= 2 ? 'font-semibold text-[var(--foreground)]' : ''}>Revisão</span>
        <span aria-hidden="true">→</span>
        <span className={step >= 3 ? 'font-semibold text-[var(--foreground)]' : ''}>Concluído</span>
      </div>

      {accountLoadError && (
        <div className="mb-3 space-y-2">
          <Alert variant="error" message={accountLoadError} />
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
        </div>
      )}
      {categoryLoadError && (
        <div className="mb-3 space-y-2">
          <Alert variant="error" message={categoryLoadError} />
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
        </div>
      )}
      {error && <Alert variant="error" message={error} />}

      {step === 1 && (
        <form onSubmit={handlePreview} className="ds-panel overflow-hidden">
          <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.55fr)]">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--orbit-primary)]">Import Inbox</p>
              <h2 className="mt-1 text-xl font-semibold text-[var(--foreground)]">Escolha de onde vamos revisar</h2>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--text-muted)]">
                CSV, OFX/QFX, QIF e XLSX, até 2 MB e 1.000 transações. Gerar preview é somente leitura: nenhum lançamento é criado nesta etapa.
              </p>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <Select
                  label="Conta"
                  value={accountId}
                  onChange={(value) => setAccountId(String(value))}
                  disabled={loadingRelations || submitting}
                  required
                  placeholder="Selecione"
                  options={accounts.map((item) => ({ value: item.id, label: `${item.name} · ${item.currency}` }))}
                />

                <label className="space-y-2 text-sm font-medium text-[var(--foreground)]">
                  Arquivo
                  <input
                    type="file"
                    accept=".csv,.ofx,.qfx,.qif,.xlsx,text/csv,application/x-ofx,application/vnd.intu.qfx,application/qif,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                    onChange={onFileChange}
                    disabled={submitting}
                    className="block w-full rounded-xl border border-[var(--border-strong)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] file:mr-3 file:rounded-lg file:border-0 file:px-3 file:py-1.5"
                    required
                  />
                </label>
              </div>

              {file?.name.toLowerCase().endsWith('.qif') && (
                <div className="mt-4 max-w-sm">
                  <Select
                    label="Formato de data QIF"
                    value={qifDateOrder}
                    onChange={(value) => setQifDateOrder(value as '' | QifDateOrder)}
                    disabled={submitting}
                    placeholder="Detectar pelo arquivo"
                    options={[
                      { value: 'MDY', label: 'MM/DD — mês/dia' },
                      { value: 'DMY', label: 'DD/MM — dia/mês' },
                    ]}
                  />
                  <p className="mt-1 text-xs font-normal text-[var(--text-muted)]">
                    Se todas as datas forem ambíguas, escolha a convenção explicitamente.
                  </p>
                </div>
              )}
            </div>

            <aside className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-subtle)] p-4">
              <p className="text-sm font-semibold text-[var(--foreground)]">Antes de continuar</p>
              <ul className="mt-3 space-y-2 text-sm leading-relaxed text-[var(--text-muted)]">
                <li>• “Já importada” significa a mesma identidade de importação; não é deduplicação financeira por data/valor/descrição;</li>
                <li>• itens inválidos precisam ser ignorados explicitamente;</li>
                <li>• regras podem sugerir categoria, mas você continua no controle;</li>
                <li>• a confirmação final mostra exatamente o que será criado e ignorado.</li>
              </ul>
            </aside>
          </div>

          <div className="flex flex-wrap justify-end gap-2 border-t border-[var(--border)] px-5 py-4 sm:px-6">
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
              Revisar arquivo
            </Button>
          </div>
        </form>
      )}

      {step === 2 && preview && (
        <section className="space-y-4" aria-labelledby="preview-title">
          <header className="ds-panel p-5 sm:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--orbit-primary)]">Inbox de revisão</p>
                <h2 id="preview-title" className="mt-1 text-xl font-semibold text-[var(--foreground)]">{preview.fileName}</h2>
                <p className="mt-1 break-words text-sm text-[var(--text-muted)]">
                  {account?.name ?? 'Conta selecionada'} · {account?.currency ?? 'moeda da conta'} · {preview.summary.total} linha(s)
                </p>
                <p className={`mt-1 text-xs ${previewExpiring || previewExpired ? 'text-[var(--warning)]' : 'text-[var(--text-subtle)]'}`}>
                  {previewExpired
                    ? 'Preview expirado — regenere antes de confirmar.'
                    : `Preview válido até ${new Date(preview.previewExpiresAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}.`}
                </p>
                {preview.qifDateOrder && (
                  <p className="mt-1 text-xs text-[var(--text-subtle)]">
                    QIF interpretado como {preview.qifDateOrder === 'MDY' ? 'MM/DD' : 'DD/MM'}.
                  </p>
                )}
                {preview.xlsxWorksheet && (
                  <p className="mt-1 text-xs text-[var(--text-subtle)]">
                    XLSX: aba processada <strong>{preview.xlsxWorksheet.name}</strong>
                    {preview.xlsxWorksheet.ignoredWorksheetNames.length > 0
                      ? ` · abas ignoradas: ${preview.xlsxWorksheet.ignoredWorksheetNames.join(', ')}`
                      : ''}
                  </p>
                )}
                {(previewExpiring || previewExpired) && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={() => void generatePreview(true)}
                    isLoading={submitting}
                    loadingText="Atualizando…"
                  >
                    Atualizar preview preservando escolhas
                  </Button>
                )}
                {preview.detectedSource === 'NUBANK_CREDIT_CARD' && (
                  <p className="mt-1 text-sm text-[var(--foreground)]">
                    Arquivo detectado: <strong>Fatura Nubank</strong>
                    {preview.nubankSummary
                      ? ` · ${preview.nubankSummary.purchases} compra(s) · ${preview.nubankSummary.payments} pagamento(s) · ${preview.nubankSummary.credits} crédito(s)`
                      : ''}
                  </p>
                )}
                {account?.type === 'CREDIT_CARD' && preview.detectedSource !== 'NUBANK_CREDIT_CARD' && (
                  <div
                    className="mt-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-subtle)] p-3 text-sm leading-relaxed text-[var(--text-muted)]"
                    role="note"
                  >
                    <strong className="text-[var(--foreground)]">Arquivo genérico no cartão:</strong>{' '}
                    valores negativos são tratados como despesas; valores positivos, como créditos/estornos (receitas que reduzem a despesa do cartão).
                    Pagamento de fatura não é inferido por descrição ou texto: use o fluxo próprio de pagamento da fatura.
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="status" aria-live="polite" aria-atomic="true">
                <InboxMetric label="Revisar" value={stateCounts.review} state="review" />
                <InboxMetric label="Prontas" value={stateCounts.ready} state="ready" />
                <InboxMetric label="Já importadas" value={stateCounts.duplicate} state="duplicate" />
                <InboxMetric label="Ignoradas" value={stateCounts.ignored} state="ignored" />
              </div>
            </div>
          </header>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)] lg:items-start">
            <div className="ds-panel overflow-hidden">
              <div className="space-y-3 border-b border-[var(--border)] p-4 sm:p-5">
                <ChipRow label="Filtrar itens da importação">
                  {inboxFilters.map((option) => {
                    const count = option.value === 'all' ? items.length : stateCounts[option.value];
                    return (
                      <Chip
                        key={option.value}
                        selected={filter === option.value}
                        onClick={() => {
                          setFilter(option.value);
                          setActiveIndex(null);
                          setMobileDetailOpen(false);
                          setConfirmMerchantConflictBulk(false);
                        }}
                      >
                        {option.label} · {count}
                      </Chip>
                    );
                  })}
                </ChipRow>

                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={selectResolvedVisibleItems} disabled={submitting}>
                    Importar resolvidas visíveis
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={ignoreVisibleReadyItems} disabled={submitting}>
                    Ignorar prontas visíveis
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={continueWithoutMerchantVisible}
                    disabled={submitting}
                  >
                    {confirmMerchantConflictBulk
                      ? 'Confirmar sem estabelecimento nos conflitos'
                      : 'Continuar sem estabelecimento'}
                  </Button>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                  <div className="min-w-0 flex-1">
                    <Select
                      label="Categoria em lote para selecionadas visíveis"
                      value={bulkCategoryId}
                      onChange={(value) => setBulkCategoryId(String(value))}
                      disabled={submitting || categoryLoadError.length > 0}
                      placeholder="Selecione uma categoria"
                      options={categories.map((category) => ({
                        value: category.id,
                        label: `${category.name} · ${category.type === 'INCOME' ? 'Receita' : 'Despesa'}`,
                      }))}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={applyCategoryToVisibleSelected}
                    disabled={!bulkCategoryId || submitting}
                  >
                    Aplicar categoria
                  </Button>
                </div>
                <p className="text-xs text-[var(--text-subtle)]">
                  A categoria em lote só é aplicada a itens selecionados, válidos e do mesmo tipo. Conflitos entre regras permanecem para revisão individual.
                </p>

                <Input
                  label="Buscar na revisão"
                  type="search"
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setActiveIndex(null);
                    setMobileDetailOpen(false);
                    setConfirmMerchantConflictBulk(false);
                  }}
                  placeholder="Descrição, data, origem ou regra"
                />
              </div>

              {visibleItems.length === 0 ? (
                <p className="p-6 text-sm text-[var(--text-muted)]">Nenhum item corresponde a este filtro.</p>
              ) : (
                <ul className="divide-y divide-[var(--border)]">
                  {visibleItems.map((item) => {
                    const state = getInboxState(item);
                    const category = item.categoryId ? categoryById.get(item.categoryId) : null;
                    return (
                      <li key={`${item.index}-${item.fingerprint}`}>
                        <button
                          type="button"
                          onClick={() => openItem(item.index)}
                          className={`grid min-h-20 w-full gap-2 px-4 py-3 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--focus)] sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-5 ${
                            activeItem?.index === item.index ? 'bg-[var(--surface-subtle)]' : 'hover:bg-[var(--surface-subtle)]/60'
                          }`}
                        >
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <strong className="break-words text-sm text-[var(--foreground)]">{item.description || `Linha ${item.index + 1}`}</strong>
                              <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${stateClass(state)}`}>
                                {stateLabel(state)}
                              </span>
                            </div>
                            <p className="mt-1 break-words text-sm text-[var(--text-muted)]">
                              {item.date || 'Data inválida'} · {item.source}
                              {category ? ` · ${category.name}` : ''}
                              {item.matchedRuleName ? ` · regra ${item.matchedRuleName}` : ''}
                              {item.suggestedMerchantName ? ` · ${item.suggestedMerchantName}` : ''}
                              {item.merchantAliasConflict ? ' · conflito de estabelecimento' : ''}
                            </p>
                          </div>
                          <span className={`text-sm font-semibold ${item.type === 'INCOME' ? 'text-[var(--income)]' : 'text-[var(--expense)]'}`}>
                            {item.type === 'INCOME' ? '+' : '-'}{formatAmount(item.amountCents, item.currency ?? account?.currency, showValues)}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {isDesktop && (
            <div>
              {activeItem ? (
                <div className="sticky top-4">
                  <ImportDetail
                    item={activeItem}
                    accountId={preview.accountId}
                    categories={categories}
                    merchants={merchants}
                    merchantOptionsUnavailable={merchantOptionsUnavailable}
                    merchantRetrying={retryingSource === 'merchants'}
                    onRetryMerchants={() => void retryMerchants()}
                    merchantSearch={merchantSearch}
                    merchantSearchLoading={merchantSearchLoading}
                    onSearchMerchants={(query) => void searchMerchants(query)}
                    accountCurrency={account?.currency}
                    showValues={showValues}
                    submitting={submitting}
                    onUpdate={updateItem}
                  />
                </div>
              ) : (
                <div className="ds-panel p-5 text-sm text-[var(--text-muted)]">Selecione um item para revisar os detalhes.</div>
              )}
            </div>
            )}
          </div>

          <div className="sticky bottom-[calc(var(--app-mobile-bottom-nav-height)_+_env(safe-area-inset-bottom)_+_0.75rem)] z-20 rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--card)]/95 p-4 shadow-lg backdrop-blur lg:bottom-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div role="status" aria-live="polite" aria-atomic="true">
                <p className="text-sm font-semibold text-[var(--foreground)]">O que acontece se eu confirmar agora?</p>
                <p className="mt-0.5 text-sm text-[var(--text-muted)]">
                  {selectedCount} selecionada(s) para criar · {ignoredOnConfirm} serão ignoradas · {reviewCount} precisam de decisão.
                </p>
              </div>
              <div className="flex flex-wrap justify-end gap-2">
                {previewExpired && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => void generatePreview(true)}
                    disabled={submitting}
                  >
                    Gerar preview novamente
                  </Button>
                )}
                <Button type="button" size="sm" variant="outline" onClick={resetImport} disabled={submitting}>
                  Cancelar
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleConfirm}
                  disabled={selectedCount === 0 || reviewCount > 0 || previewExpired}
                  isLoading={submitting}
                  loadingText="Importando…"
                >
                  Confirmar {selectedCount}
                </Button>
              </div>
            </div>
            {reviewCount > 0 && (
              <p className="mt-2 text-sm text-[var(--warning)]">Resolva ou ignore todos os itens em “Precisa revisar” antes de confirmar.</p>
            )}
            {previewExpired && (
              <p className="mt-2 text-sm text-[var(--warning)]">O token deste preview expirou. Regenere o mesmo arquivo; escolhas compatíveis são remapeadas pela identidade de importação.</p>
            )}
          </div>

          {!isDesktop && mobileDetailOpen && activeItem && (
            <MobileImportDetail
              item={activeItem}
              accountId={preview.accountId}
              categories={categories}
              merchants={merchants}
              merchantOptionsUnavailable={merchantOptionsUnavailable}
              merchantRetrying={retryingSource === 'merchants'}
              onRetryMerchants={() => void retryMerchants()}
              merchantSearch={merchantSearch}
              merchantSearchLoading={merchantSearchLoading}
              onSearchMerchants={(query) => void searchMerchants(query)}
              accountCurrency={account?.currency}
              showValues={showValues}
              submitting={submitting}
              onUpdate={updateItem}
              onClose={() => setMobileDetailOpen(false)}
            />
          )}
        </section>
      )}

      {step === 3 && result && (
        <section className="ds-panel p-6 text-center sm:p-8">
          <div className="mx-auto max-w-lg">
            <div role="status" aria-live="polite" aria-atomic="true">
              <p className="text-sm font-semibold uppercase tracking-wide text-[var(--income)]">Importação concluída</p>
              <h2 className="mt-2 text-2xl font-bold text-[var(--foreground)]">{result.created} transação(ões) criada(s)</h2>
              <p className="mt-2 text-sm text-[var(--text-muted)]">
                {result.selected} selecionada(s) · {result.duplicates} ignorada(s) porque a mesma identidade de importação já existia na confirmação.
              </p>
            </div>
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