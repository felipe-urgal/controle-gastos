'use client';

import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from 'react';

import { PageHeader } from '@/app/components/base-pages';
import { Alert } from '@/app/components/feedback';
import { ProtectedRoute } from '@/app/components/layout';
import { ManualImportRuleCreator } from '@/app/components/pages/transactions/import/manual-rule-creator';
import { Button } from '@/app/components/ui';
import { useAuth } from '@/app/context';
import { formatCurrency } from '@/app/lib/currency/format-currency';
import { accountService } from '@/app/services/account-service';
import { categoryService } from '@/app/services/category-service';
import { merchantService } from '@/app/services/merchant-service';
import type { AccountModel } from '@/app/types/account';
import type { CategoryModel } from '@/app/types/category';
import type { MerchantDTO } from '@/app/types/merchant';
import type { MerchantAliasOperator } from '@/app/types/merchant-alias';

type ImportType = 'INCOME' | 'EXPENSE';
type ImportSource = 'CSV' | 'OFX' | 'QIF' | 'XLSX';
type QifDateOrder = 'MDY' | 'DMY';
type InboxState = 'review' | 'ready' | 'duplicate' | 'ignored';
type InboxFilter = 'all' | InboxState;

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
  matchedRuleId?: string | null;
  matchedRuleName?: string | null;
  suggestedCategoryId?: string | null;
  importRuleConflict?: boolean;
  matchingRuleNames?: string[];
  alsoMatchingRuleNames?: string[];
  matchedMerchantAliasId?: string | null;
  suggestedMerchantId?: string | null;
  suggestedMerchantName?: string | null;
  merchantAliasConflict?: boolean;
};

type EditablePreviewItem = PreviewItem & {
  selected: boolean;
  categoryId: string | null;
  merchantId: string | null;
  merchantReviewed: boolean;
  learnMerchantAlias: boolean;
  merchantAliasOperator: MerchantAliasOperator;
  ignored: boolean;
};

type PreviewData = {
  accountId: string;
  fileName: string;
  detectedSource?: 'GENERIC' | 'NUBANK_CREDIT_CARD';
  nubankSummary?: { purchases: number; payments: number; credits: number } | null;
  previewToken: string;
  previewExpiresAt: string;
  qifDateOrder?: QifDateOrder | null;
  xlsxWorksheet?: {
    name: string;
    ignoredWorksheetNames: string[];
  } | null;
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
  data?: T;
  message?: string;
  error?: {
    code?: string;
    message?: string;
  };
};

function apiErrorMessage<T>(response: Response, payload: ApiEnvelope<T>, fallback: string) {
  const message = payload.error?.message || payload.message || fallback;
  const retryAfter = response.headers.get('Retry-After');
  return retryAfter
    ? `${message}. Tente novamente em ${retryAfter}s.`
    : message;
}

const inboxFilters: Array<{ value: InboxFilter; label: string }> = [
  { value: 'all', label: 'Todas' },
  { value: 'review', label: 'Precisa revisar' },
  { value: 'ready', label: 'Prontas' },
  { value: 'duplicate', label: 'Já importadas' },
  { value: 'ignored', label: 'Ignoradas' },
];

function formatAmount(cents: number, currency = 'BRL', showValues = true) {
  if (!showValues) return '••••';

  return formatCurrency(cents, currency);
}

function getReviewReasons(item: EditablePreviewItem) {
  const reasons: string[] = [];
  if (item.errors.length > 0) reasons.push('Dados inválidos');
  if (item.importRuleConflict && !item.categoryId) reasons.push('Conflito entre regras');
  if (!item.categoryId && item.errors.length === 0) reasons.push('Categoria não definida');
  if (item.merchantAliasConflict && !item.merchantReviewed) reasons.push('Conflito entre estabelecimentos');
  if (!item.merchantReviewed && !item.merchantAliasConflict) reasons.push('Estabelecimento não reconhecido');
  return reasons;
}

function getInboxState(item: EditablePreviewItem): InboxState {
  if (item.duplicate) return 'duplicate';
  if (item.ignored || !item.selected) return 'ignored';
  return getReviewReasons(item).length === 0 ? 'ready' : 'review';
}

function stateLabel(state: InboxState) {
  if (state === 'review') return 'Precisa revisar';
  if (state === 'ready') return 'Pronta';
  if (state === 'duplicate') return 'Já importada';
  return 'Ignorada';
}

function stateClass(state: InboxState) {
  if (state === 'ready') {
    return 'border-[var(--income)]/35 bg-[var(--primary-subtle)] text-[var(--income)]';
  }
  if (state === 'review') {
    return 'border-[var(--warning)]/40 bg-[var(--warning-subtle)] text-[var(--warning)]';
  }
  if (state === 'duplicate') {
    return 'border-[var(--border-strong)] bg-[var(--surface-subtle)] text-[var(--text-muted)]';
  }
  return 'border-[var(--border)] bg-[var(--background)] text-[var(--text-subtle)]';
}

function toConfirmItem(item: EditablePreviewItem) {
  return {
    index: item.index,
    source: item.source,
    date: item.date,
    amountCents: item.amountCents,
    type: item.type,
    description: item.description,
    ...(item.externalId ? { externalId: item.externalId } : {}),
    ...(item.currency ? { currency: item.currency } : {}),
    errors: item.errors,
    fingerprint: item.fingerprint,
    duplicate: item.duplicate,
    selected: item.selected && !item.ignored,
    categoryId: item.categoryId,
    merchantId: item.merchantId,
    learnMerchantAlias: item.learnMerchantAlias,
    merchantAliasOperator: item.merchantAliasOperator,
  };
}

export default function TransactionImportPage() {
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

      const response = await fetch('/api/transactions/import/preview', {
        method: 'POST',
        body: formData,
      });
      const payload = (await response.json()) as ApiEnvelope<PreviewData>;
      if (!response.ok || !payload.success || !payload.data) {
        throw new Error(apiErrorMessage(response, payload, 'Falha ao gerar preview.'));
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
      const response = await fetch('/api/transactions/import/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: preview.accountId,
          previewToken: preview.previewToken,
          items: items.map(toConfirmItem),
        }),
      });
      const payload = (await response.json()) as ApiEnvelope<ConfirmData>;
      if (!response.ok || !payload.success || !payload.data) {
        if (payload.error?.code === 'IMPORT_PREVIEW_EXPIRED') {
          setPreviewNow(Date.parse(preview.previewExpiresAt));
        }
        throw new Error(apiErrorMessage(response, payload, 'Falha ao confirmar importação.'));
      }
      setResult(payload.data);
      setMobileDetailOpen(false);
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
                <label className="space-y-2 text-sm font-medium text-[var(--foreground)]">
                  Conta
                  <select
                    value={accountId}
                    onChange={(event) => setAccountId(event.target.value)}
                    disabled={loadingRelations || submitting}
                    className="w-full rounded-xl border border-[var(--border-strong)] bg-[var(--background)] px-3 py-2.5 text-[var(--foreground)]"
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
                    accept=".csv,.ofx,.qfx,.qif,.xlsx,text/csv,application/x-ofx,application/vnd.intu.qfx,application/qif,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                    onChange={onFileChange}
                    disabled={submitting}
                    className="block w-full rounded-xl border border-[var(--border-strong)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] file:mr-3 file:rounded-lg file:border-0 file:px-3 file:py-1.5"
                    required
                  />
                </label>
              </div>

              {file?.name.toLowerCase().endsWith('.qif') && (
                <label className="mt-4 block max-w-sm text-sm font-medium text-[var(--foreground)]">
                  Formato de data QIF
                  <select
                    value={qifDateOrder}
                    onChange={(event) => setQifDateOrder(event.target.value as '' | QifDateOrder)}
                    disabled={submitting}
                    className="mt-2 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--background)] px-3 py-2.5"
                  >
                    <option value="">Detectar pelo arquivo</option>
                    <option value="MDY">MM/DD — mês/dia</option>
                    <option value="DMY">DD/MM — dia/mês</option>
                  </select>
                  <span className="mt-1 block text-xs font-normal text-[var(--text-muted)]">
                    Se todas as datas forem ambíguas, escolha a convenção explicitamente.
                  </span>
                </label>
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
                <div className="flex gap-2 overflow-x-auto pb-1" aria-label="Filtrar itens da importação">
                  {inboxFilters.map((option) => {
                    const count = option.value === 'all' ? items.length : stateCounts[option.value];
                    return (
                      <button
                        key={option.value}
                        type="button"
                        aria-pressed={filter === option.value}
                        onClick={() => {
                          setFilter(option.value);
                          setActiveIndex(null);
                          setMobileDetailOpen(false);
                          setConfirmMerchantConflictBulk(false);
                        }}
                        className={`min-h-11 shrink-0 rounded-full border px-3 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)] ${
                          filter === option.value
                            ? 'border-[var(--orbit-primary)] bg-[var(--surface-subtle)] text-[var(--orbit-primary)]'
                            : 'border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--foreground)]'
                        }`}
                      >
                        {option.label} · {count}
                      </button>
                    );
                  })}
                </div>

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
                  <label className="min-w-0 flex-1 text-sm font-medium text-[var(--foreground)]">
                    Categoria em lote para selecionadas visíveis
                    <select
                      value={bulkCategoryId}
                      onChange={(event) => setBulkCategoryId(event.target.value)}
                      disabled={submitting || categoryLoadError.length > 0}
                      className="mt-1.5 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--background)] px-3 py-2.5"
                    >
                      <option value="">Selecione uma categoria</option>
                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name} · {category.type === 'INCOME' ? 'Receita' : 'Despesa'}
                        </option>
                      ))}
                    </select>
                  </label>
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

                <label className="block text-sm font-medium text-[var(--foreground)]">
                  Buscar na revisão
                  <input
                    type="search"
                    value={search}
                    onChange={(event) => {
                      setSearch(event.target.value);
                      setActiveIndex(null);
                      setMobileDetailOpen(false);
                      setConfirmMerchantConflictBulk(false);
                    }}
                    placeholder="Descrição, data, origem ou regra"
                    className="mt-2 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--background)] px-3 py-2.5 text-sm text-[var(--foreground)]"
                  />
                </label>
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

            <div className="hidden lg:block">
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

          {mobileDetailOpen && activeItem && (
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

function InboxMetric({ label, value, state }: { label: string; value: number; state: InboxState }) {
  return (
    <div className={`min-w-24 rounded-[var(--radius-md)] border px-3 py-2 ${stateClass(state)}`}>
      <span className="block text-xs font-semibold uppercase tracking-wide">{label}</span>
      <strong className="mt-0.5 block text-lg">{value}</strong>
    </div>
  );
}

function ImportDetail({
  item,
  accountId,
  categories,
  merchants,
  merchantOptionsUnavailable,
  merchantRetrying,
  onRetryMerchants,
  merchantSearch,
  merchantSearchLoading,
  onSearchMerchants,
  accountCurrency,
  showValues,
  submitting,
  onUpdate,
  headingIdPrefix = 'import-detail',
}: {
  item: EditablePreviewItem;
  accountId: string;
  categories: CategoryModel[];
  merchants: MerchantDTO[];
  merchantOptionsUnavailable: boolean;
  merchantRetrying: boolean;
  onRetryMerchants: () => void;
  merchantSearch: string;
  merchantSearchLoading: boolean;
  onSearchMerchants: (query: string) => void;
  accountCurrency?: string;
  showValues: boolean;
  submitting: boolean;
  headingIdPrefix?: string;
  onUpdate: (
    index: number,
    patch: Partial<Pick<EditablePreviewItem, 'selected' | 'categoryId' | 'merchantId' | 'merchantReviewed' | 'learnMerchantAlias' | 'merchantAliasOperator' | 'ignored'>>,
  ) => void;
}) {
  const state = getInboxState(item);
  const availableCategories = categories.filter((category) => category.type === item.type);
  const selectedCategory = item.categoryId
    ? availableCategories.find((category) => category.id === item.categoryId)
    : undefined;
  const suggestedMerchantOutsideOptions =
    Boolean(item.merchantId) &&
    item.merchantId === item.suggestedMerchantId &&
    !merchants.some((merchant) => merchant.id === item.merchantId);
  const canCategorize = !item.duplicate && item.errors.length === 0 && !item.ignored;
  const reviewReasons = getReviewReasons(item);

  const headingId = `${headingIdPrefix}-${item.index}`;

  return (
    <aside className="ds-panel p-5" aria-labelledby={headingId}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-[var(--text-muted)]">Linha {item.index + 1}</p>
          <h3 id={headingId} className="mt-1 break-words font-semibold text-[var(--foreground)]">
            {item.description || 'Descrição ausente'}
          </h3>
        </div>
        <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${stateClass(state)}`}>
          {stateLabel(state)}
        </span>
      </div>

      <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
        <div>
          <dt className="text-[var(--text-muted)]">Data</dt>
          <dd className="mt-0.5 text-[var(--foreground)]">{item.date || 'Inválida'}</dd>
        </div>
        <div>
          <dt className="text-[var(--text-muted)]">Valor</dt>
          <dd className={`mt-0.5 font-semibold ${item.type === 'INCOME' ? 'text-[var(--income)]' : 'text-[var(--expense)]'}`}>
            {item.type === 'INCOME' ? '+' : '-'}{formatAmount(item.amountCents, item.currency ?? accountCurrency, showValues)}
          </dd>
        </div>
        <div>
          <dt className="text-[var(--text-muted)]">Origem</dt>
          <dd className="mt-0.5 text-[var(--foreground)]">{item.source}{item.externalId ? ` · ${item.externalId}` : ''}</dd>
        </div>
        <div>
          <dt className="text-[var(--text-muted)]">Regra</dt>
          <dd className="mt-0.5 break-words text-[var(--foreground)]">
            {item.importRuleConflict
              ? `Conflito: ${(item.matchingRuleNames ?? []).join(', ') || 'múltiplas regras'}`
              : item.matchedRuleName ?? 'Nenhuma sugestão'}
            {(item.alsoMatchingRuleNames?.length ?? 0) > 0 && (
              <span className="mt-1 block text-xs text-[var(--text-muted)]">
                Também corresponderam: {item.alsoMatchingRuleNames?.join(', ')}
              </span>
            )}
          </dd>
        </div>
        <div>
          <dt className="text-[var(--text-muted)]">Estabelecimento</dt>
          <dd className="mt-0.5 break-words text-[var(--foreground)]">
            {item.merchantAliasConflict ? (
              <>
                <span>Conflito entre aliases — nenhum será aplicado</span>
                <span className="mt-1 block text-xs text-[var(--text-muted)]">
                  Busque abaixo qualquer estabelecimento ativo para resolver.
                </span>
              </>
            ) : (
              item.suggestedMerchantName ?? 'Nenhum alias reconhecido'
            )}
          </dd>
        </div>
      </dl>

      {reviewReasons.length > 0 && !item.duplicate && !item.ignored && (
        <div className="mt-4 rounded-[var(--radius-md)] border border-[var(--warning)]/35 bg-[var(--warning-subtle)] p-3 text-sm">
          <p className="font-medium text-[var(--foreground)]">Por que precisa de revisão</p>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-[var(--text-muted)]">
            {reviewReasons.map((reason) => <li key={reason}>{reason}</li>)}
          </ul>
        </div>
      )}

      {item.errors.length > 0 && (
        <div role="alert" className="mt-4 rounded-[var(--radius-md)] border border-[var(--danger)]/35 bg-[var(--danger-subtle)] p-3 text-sm text-[var(--expense)]">
          {item.errors.join(' ')}
        </div>
      )}

      {item.duplicate && (
        <p className="mt-4 rounded-[var(--radius-md)] bg-[var(--surface-subtle)] p-3 text-sm text-[var(--text-muted)]">
          Este item já possui a mesma identidade de importação e fica fora da seleção.
        </p>
      )}

      <div className="mt-5 space-y-4 border-t border-[var(--border)] pt-4">
        <label className="block text-sm font-medium text-[var(--foreground)]">
          Categoria
          <select
            aria-label="Categoria"
            value={item.categoryId ?? ''}
            onChange={(event) => onUpdate(item.index, { categoryId: event.target.value || null })}
            disabled={!canCategorize || submitting}
            className="mt-2 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--background)] px-3 py-2.5 text-sm text-[var(--foreground)] disabled:opacity-50"
          >
            <option value="">Selecione</option>
            {availableCategories.map((category) => (
              <option key={category.id} value={category.id}>{category.name}</option>
            ))}
          </select>
        </label>

        {canCategorize && (
          <label className="block text-sm font-medium text-[var(--foreground)]">
            Estabelecimento
            {merchantOptionsUnavailable && (
              <span
                className="mt-2 block rounded-[var(--radius-md)] border border-[var(--warning)]/35 bg-[var(--warning-subtle)] p-2 text-xs font-normal leading-relaxed text-[var(--text-muted)]"
                role="status"
              >
                Lista de estabelecimentos indisponível. Você pode continuar sem estabelecimento; sugestões já reconhecidas no preview podem ser mantidas.
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={onRetryMerchants}
                  isLoading={merchantRetrying}
                  loadingText="Recarregando…"
                >
                  Tentar carregar estabelecimentos
                </Button>
              </span>
            )}
            <input
              type="search"
              aria-label="Buscar estabelecimento"
              value={merchantSearch}
              onChange={(event) => onSearchMerchants(event.target.value)}
              disabled={submitting || merchantOptionsUnavailable}
              placeholder="Buscar por nome"
              className="mt-2 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--background)] px-3 py-2.5 text-sm text-[var(--foreground)] disabled:opacity-50"
            />
            {merchantSearchLoading && (
              <span className="mt-1 block text-xs font-normal text-[var(--text-muted)]" role="status">
                Buscando estabelecimentos…
              </span>
            )}
            <select
              aria-label="Estabelecimento"
              value={item.merchantId ?? ''}
              onChange={(event) => onUpdate(item.index, {
                merchantId: event.target.value || null,
                merchantReviewed: true,
                learnMerchantAlias: false,
              })}
              disabled={submitting || merchantOptionsUnavailable}
              className="mt-2 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--background)] px-3 py-2.5 text-sm text-[var(--foreground)] disabled:opacity-50"
            >
              <option value="">Sem estabelecimento</option>
              {suggestedMerchantOutsideOptions && item.merchantId && (
                <option value={item.merchantId}>
                  {item.suggestedMerchantName ?? 'Estabelecimento sugerido'}
                </option>
              )}
              {merchants.map((merchant) => (
                <option key={merchant.id} value={merchant.id}>{merchant.name}</option>
              ))}
            </select>
            {(!item.merchantReviewed || merchantOptionsUnavailable) && (
              <button
                type="button"
                onClick={() =>
                  onUpdate(item.index, {
                    merchantId: null,
                    merchantReviewed: true,
                    learnMerchantAlias: false,
                  })
                }
                className="mt-2 text-xs font-semibold text-[var(--orbit-primary)]"
              >
                Continuar sem estabelecimento
              </button>
            )}

            {item.merchantReviewed && item.merchantId ? (
              <div className="mt-3 rounded-xl border border-[var(--border)] bg-[var(--surface-subtle)] p-3">
                <label className="flex min-h-11 items-center gap-3 text-sm font-medium text-[var(--foreground)]">
                  <input
                    type="checkbox"
                    checked={item.learnMerchantAlias}
                    disabled={submitting}
                    onChange={(event) =>
                      onUpdate(item.index, {
                        learnMerchantAlias: event.target.checked,
                      })
                    }
                  />
                  Aprender esta descrição para próximas importações
                </label>
                {item.learnMerchantAlias ? (
                  <div className="mt-2">
                    <label className="text-xs font-semibold text-[var(--text-muted)]">
                      Regra do reconhecimento
                      <select
                        aria-label="Regra do reconhecimento"
                        value={item.merchantAliasOperator}
                        disabled={submitting}
                        onChange={(event) =>
                          onUpdate(item.index, {
                            merchantAliasOperator:
                              event.target.value as MerchantAliasOperator,
                          })
                        }
                        className="mt-1 min-h-11 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)]"
                      >
                        <option value="EQUALS">Igual a</option>
                        <option value="STARTS_WITH">Começa com</option>
                        <option value="CONTAINS">Contém</option>
                      </select>
                    </label>
                    <p className="mt-2 break-all text-xs text-[var(--text-muted)]">
                      Padrão: <span className="font-mono">{item.description}</span>
                    </p>
                    <p className="mt-1 text-xs text-[var(--text-muted)]">
                      Se um alias equivalente já apontar para outro estabelecimento,
                      ele será reclassificado atomicamente para esta escolha.
                    </p>
                  </div>
                ) : null}
              </div>
            ) : null}
          </label>
        )}

        {canCategorize && (
          <ManualImportRuleCreator
            accountId={accountId}
            transactionType={item.type}
            description={item.description}
            categoryId={item.categoryId}
            suggestedCategoryId={item.suggestedCategoryId}
            categoryName={selectedCategory?.name}
            disabled={submitting}
          />
        )}

        {!item.duplicate && item.errors.length === 0 && (
          <label className="flex min-h-11 items-center gap-3 text-sm text-[var(--foreground)]">
            <input
              type="checkbox"
              checked={item.selected && !item.ignored}
              disabled={submitting}
              onChange={(event) =>
                onUpdate(item.index, {
                  selected: event.target.checked,
                  ignored: !event.target.checked,
                })
              }
            />
            Importar este lançamento
          </label>
        )}

        {item.errors.length > 0 && !item.duplicate && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={submitting}
            onClick={() => onUpdate(item.index, { ignored: !item.ignored, selected: false })}
          >
            {item.ignored ? 'Voltar para revisão' : 'Ignorar item inválido'}
          </Button>
        )}
      </div>
    </aside>
  );
}

function MobileImportDetail({
  item,
  accountId,
  categories,
  merchants,
  merchantOptionsUnavailable,
  merchantRetrying,
  onRetryMerchants,
  merchantSearch,
  merchantSearchLoading,
  onSearchMerchants,
  accountCurrency,
  showValues,
  submitting,
  onUpdate,
  onClose,
}: {
  item: EditablePreviewItem;
  accountId: string;
  categories: CategoryModel[];
  merchants: MerchantDTO[];
  merchantOptionsUnavailable: boolean;
  merchantRetrying: boolean;
  onRetryMerchants: () => void;
  merchantSearch: string;
  merchantSearchLoading: boolean;
  onSearchMerchants: (query: string) => void;
  accountCurrency?: string;
  showValues: boolean;
  submitting: boolean;
  onUpdate: (
    index: number,
    patch: Partial<Pick<EditablePreviewItem, 'selected' | 'categoryId' | 'merchantId' | 'merchantReviewed' | 'learnMerchantAlias' | 'merchantAliasOperator' | 'ignored'>>,
  ) => void;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const restoreFocus = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const dialog = dialogRef.current;
    const focusables = () =>
      Array.from(
        dialog?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      );

    const frame = window.requestAnimationFrame(() => {
      focusables()[0]?.focus();
    });

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab') return;

      const elements = focusables();
      if (elements.length === 0) {
        event.preventDefault();
        return;
      }

      const first = elements[0];
      const last = elements[elements.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      restoreFocus?.focus();
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/45 p-0 lg:hidden">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`mobile-import-detail-${item.index}`}
        className="max-h-[88vh] w-full overscroll-contain overflow-y-auto rounded-t-[var(--radius-xl)] bg-[var(--background)] p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-2xl"
      >
        <div className="mb-3 flex justify-end">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Fechar
          </Button>
        </div>
        <ImportDetail
          item={item}
          accountId={accountId}
          categories={categories}
          merchants={merchants}
          merchantOptionsUnavailable={merchantOptionsUnavailable}
          merchantRetrying={merchantRetrying}
          onRetryMerchants={onRetryMerchants}
          merchantSearch={merchantSearch}
          merchantSearchLoading={merchantSearchLoading}
          onSearchMerchants={onSearchMerchants}
          accountCurrency={accountCurrency}
          showValues={showValues}
          submitting={submitting}
          onUpdate={onUpdate}
          headingIdPrefix="mobile-import-detail"
        />
      </div>
    </div>
  );
}