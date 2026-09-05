'use client';

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react';

import { PageHeader } from '@/app/components/base-pages';
import { Alert } from '@/app/components/feedback';
import { ProtectedRoute } from '@/app/components/layout';
import { Button } from '@/app/components/ui';
import { useAuth } from '@/app/context';
import { accountService } from '@/app/services/account-service';
import { categoryService } from '@/app/services/category-service';
import type { AccountModel } from '@/app/types/account';
import type { CategoryModel } from '@/app/types/category';

type ImportType = 'INCOME' | 'EXPENSE';
type ImportSource = 'CSV' | 'OFX';
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
  suggestedDescription?: string | null;
};

type EditablePreviewItem = PreviewItem & {
  selected: boolean;
  categoryId: string | null;
  ignored: boolean;
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

const inboxFilters: Array<{ value: InboxFilter; label: string }> = [
  { value: 'all', label: 'Todas' },
  { value: 'review', label: 'Precisa revisar' },
  { value: 'ready', label: 'Prontas' },
  { value: 'duplicate', label: 'Duplicadas' },
  { value: 'ignored', label: 'Ignoradas' },
];

function formatAmount(cents: number, currency = 'BRL', showValues = true) {
  if (!showValues) return '••••';

  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency,
  }).format(cents / 100);
}

function getInboxState(item: EditablePreviewItem): InboxState {
  if (item.duplicate) return 'duplicate';
  if (item.errors.length > 0) return item.ignored ? 'ignored' : 'review';
  if (item.ignored || !item.selected) return 'ignored';
  return item.categoryId ? 'ready' : 'review';
}

function stateLabel(state: InboxState) {
  if (state === 'review') return 'Precisa revisar';
  if (state === 'ready') return 'Pronta';
  if (state === 'duplicate') return 'Duplicada';
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
  };
}

export default function TransactionImportPage() {
  const { user } = useAuth();
  const showValues = user?.showValues !== false;
  const [accounts, setAccounts] = useState<AccountModel[]>([]);
  const [categories, setCategories] = useState<CategoryModel[]>([]);
  const [accountId, setAccountId] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewData | null>(null);
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

  const selectedCount = items.filter(
    (item) => item.selected && !item.ignored && !item.duplicate && item.errors.length === 0,
  ).length;
  const reviewCount = stateCounts.review;
  const ignoredOnConfirm = stateCounts.duplicate + stateCounts.ignored;
  const step = result ? 3 : preview ? 2 : 1;

  const visibleItems = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase('pt-BR');

    return items.filter((item) => {
      if (filter !== 'all' && getInboxState(item) !== filter) return false;
      if (!normalizedSearch) return true;

      return [item.description, item.date, item.source, item.matchedRuleName ?? '']
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
    setResult(null);
    setFilter('all');
    setSearch('');
    setActiveIndex(null);
    setMobileDetailOpen(false);
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

      const editableItems = payload.data.items.map((item): EditablePreviewItem => {
        const eligibleSuggestion = item.suggestedCategoryId
          ? categories.find(
              (category) => category.id === item.suggestedCategoryId && category.type === item.type,
            )
          : null;

        return {
          ...item,
          selected: item.errors.length === 0 && !item.duplicate,
          categoryId: eligibleSuggestion?.id ?? null,
          ignored: item.duplicate,
        };
      });

      setPreview(payload.data);
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

  function updateItem(
    index: number,
    patch: Partial<Pick<EditablePreviewItem, 'selected' | 'categoryId' | 'ignored'>>,
  ) {
    setItems((current) => current.map((item) => (item.index === index ? { ...item, ...patch } : item)));
  }

  function openItem(index: number) {
    setActiveIndex(index);
    setMobileDetailOpen(true);
  }

  async function handleConfirm() {
    if (!preview || selectedCount === 0 || reviewCount > 0) return;
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
      if (!response.ok || !payload.success) throw new Error(payload.message || 'Falha ao confirmar importação.');
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

      {error && <Alert variant="error" message={error} />}

      {step === 1 && (
        <form onSubmit={handlePreview} className="ds-panel overflow-hidden">
          <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.55fr)]">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--orbit-primary)]">Import Inbox</p>
              <h2 className="mt-1 text-xl font-semibold text-[var(--foreground)]">Escolha de onde vamos revisar</h2>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--text-muted)]">
                CSV e OFX, até 2 MB e 1.000 transações. Gerar preview é somente leitura: nenhum lançamento é criado nesta etapa.
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
                    accept=".csv,.ofx,text/csv,application/x-ofx"
                    onChange={onFileChange}
                    disabled={submitting}
                    className="block w-full rounded-xl border border-[var(--border-strong)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] file:mr-3 file:rounded-lg file:border-0 file:px-3 file:py-1.5"
                    required
                  />
                </label>
              </div>
            </div>

            <aside className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-subtle)] p-4">
              <p className="text-sm font-semibold text-[var(--foreground)]">Antes de continuar</p>
              <ul className="mt-3 space-y-2 text-sm leading-relaxed text-[var(--text-muted)]">
                <li>• duplicadas nunca são selecionadas automaticamente;</li>
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
              </div>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="status" aria-live="polite" aria-atomic="true">
                <InboxMetric label="Revisar" value={stateCounts.review} state="review" />
                <InboxMetric label="Prontas" value={stateCounts.ready} state="ready" />
                <InboxMetric label="Duplicadas" value={stateCounts.duplicate} state="duplicate" />
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

                <label className="block text-sm font-medium text-[var(--foreground)]">
                  Buscar na revisão
                  <input
                    type="search"
                    value={search}
                    onChange={(event) => {
                      setSearch(event.target.value);
                      setActiveIndex(null);
                      setMobileDetailOpen(false);
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
                    categories={categories}
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
                <Button type="button" size="sm" variant="outline" onClick={resetImport} disabled={submitting}>
                  Cancelar
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleConfirm}
                  disabled={selectedCount === 0 || reviewCount > 0}
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
          </div>

          {mobileDetailOpen && activeItem && (
            <MobileImportDetail
              item={activeItem}
              categories={categories}
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
                {result.selected} selecionada(s) · {result.duplicates} ignorada(s) por duplicidade na confirmação.
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
  categories,
  accountCurrency,
  showValues,
  submitting,
  onUpdate,
}: {
  item: EditablePreviewItem;
  categories: CategoryModel[];
  accountCurrency?: string;
  showValues: boolean;
  submitting: boolean;
  onUpdate: (
    index: number,
    patch: Partial<Pick<EditablePreviewItem, 'selected' | 'categoryId' | 'ignored'>>,
  ) => void;
}) {
  const state = getInboxState(item);
  const availableCategories = categories.filter((category) => category.type === item.type);
  const canCategorize = !item.duplicate && item.errors.length === 0 && !item.ignored;

  return (
    <aside className="ds-panel p-5" aria-labelledby={`import-detail-${item.index}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-[var(--text-muted)]">Linha {item.index + 1}</p>
          <h3 id={`import-detail-${item.index}`} className="mt-1 break-words font-semibold text-[var(--foreground)]">
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
          <dd className="mt-0.5 break-words text-[var(--foreground)]">{item.matchedRuleName ?? 'Nenhuma sugestão'}</dd>
        </div>
      </dl>

      {item.suggestedDescription && (
        <div className="mt-4 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-subtle)] p-3 text-sm">
          <p className="font-medium text-[var(--foreground)]">Descrição sugerida</p>
          <p className="mt-1 break-words text-[var(--text-muted)]">{item.suggestedDescription}</p>
          <p className="mt-1 text-xs text-[var(--text-subtle)]">Informativa neste slice; o conteúdo assinado do preview não é alterado.</p>
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
  categories,
  accountCurrency,
  showValues,
  submitting,
  onUpdate,
  onClose,
}: {
  item: EditablePreviewItem;
  categories: CategoryModel[];
  accountCurrency?: string;
  showValues: boolean;
  submitting: boolean;
  onUpdate: (
    index: number,
    patch: Partial<Pick<EditablePreviewItem, 'selected' | 'categoryId' | 'ignored'>>,
  ) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/45 p-0 lg:hidden" role="dialog" aria-label="Revisar lançamento importado">
      <div className="max-h-[88vh] w-full overflow-y-auto rounded-t-[var(--radius-xl)] bg-[var(--background)] p-4 shadow-2xl">
        <div className="mb-3 flex justify-end">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Fechar
          </Button>
        </div>
        <ImportDetail
          item={item}
          categories={categories}
          accountCurrency={accountCurrency}
          showValues={showValues}
          submitting={submitting}
          onUpdate={onUpdate}
        />
      </div>
    </div>
  );
}
