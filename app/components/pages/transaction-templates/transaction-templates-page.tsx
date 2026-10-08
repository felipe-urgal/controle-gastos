'use client';

import Link from 'next/link';
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import Pagination from '@/app/components/navigation/pagination';
import { useAuth } from '@/app/context';
import { useDebounce } from '@/app/hooks/use-debounce';
import { useModalFocus } from '@/app/hooks/use-modal-focus';
import { formatCurrency } from '@/app/lib/currency/format-currency';
import { analyzeTransactionTemplateSource } from '@/app/lib/templates/transaction-template-mapping';
import {
  TRANSACTION_DESCRIPTION_MAX_LENGTH,
  TRANSACTION_MAX_AMOUNT_CENTS,
} from '@/app/lib/transactions/transaction-field-contract';
import { accountService } from '@/app/services/account-service';
import { ApiClientError } from '@/app/services/api-client';
import { categoryService } from '@/app/services/category-service';
import { transactionService } from '@/app/services/transaction-service';
import { transactionTemplateService } from '@/app/services/transaction-template-service';
import type { AccountModel } from '@/app/types/account';
import type { CategoryModel } from '@/app/types/category';
import type {
  TransactionTemplateDTO,
  TransactionTemplateInput,
} from '@/app/types/transaction-template';

const TEMPLATE_PAGE_SIZE = 10;

const emptyForm: TransactionTemplateInput = {
  name: '',
  type: 'EXPENSE',
  description: '',
  amount: null,
  isFavorite: false,
  accountId: null,
  categoryId: null,
};

function inputFromTemplate(
  item: TransactionTemplateDTO,
): TransactionTemplateInput {
  return {
    name: item.name,
    type: item.type,
    description: item.description,
    amount: item.amount,
    isFavorite: item.isFavorite,
    accountId: item.account?.id ?? null,
    categoryId: item.category?.id ?? null,
  };
}

function errorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiClientError) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

function templateAmountLabel(
  item: TransactionTemplateDTO,
  showValues: boolean,
) {
  if (item.amount === null) return 'Valor: escolher ao usar';
  if (!showValues) return 'Valor: ••••';

  return `Valor: ${formatCurrency(
    item.amount,
    item.account?.currency ?? 'BRL',
  )}`;
}

function templateReferenceLabel(
  label: 'Conta' | 'Categoria',
  reference: { name: string; isActive: boolean } | null,
) {
  if (!reference) return `${label}: escolher ao usar`;
  if (!reference.isActive) {
    return `${label}: ${reference.name} (inativa — escolher novamente)`;
  }
  return `${label}: ${reference.name}`;
}

function sortTemplates(items: TransactionTemplateDTO[]) {
  return [...items].sort((left, right) => {
    if (left.isFavorite !== right.isFavorite) {
      return left.isFavorite ? -1 : 1;
    }
    return Date.parse(right.updatedAt) - Date.parse(left.updatedAt);
  });
}

export default function TransactionTemplatesPage({
  sourceTransactionId,
  focusTemplateId,
}: {
  sourceTransactionId?: string;
  focusTemplateId?: string;
}) {
  const { user } = useAuth();
  const showValues = user?.showValues !== false;
  const [items, setItems] = useState<TransactionTemplateDTO[]>([]);
  const [accounts, setAccounts] = useState<AccountModel[]>([]);
  const [categories, setCategories] = useState<CategoryModel[]>([]);
  const [form, setForm] = useState<TransactionTemplateInput>(emptyForm);
  const [editing, setEditing] = useState<TransactionTemplateDTO | null>(null);

  const [actionError, setActionError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [templateError, setTemplateError] = useState('');
  const [accountError, setAccountError] = useState('');
  const [categoryError, setCategoryError] = useState('');
  const [sourceError, setSourceError] = useState('');
  const [sourceNotices, setSourceNotices] = useState<string[]>([]);
  const [sourceBlocked, setSourceBlocked] = useState(false);

  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [accountsLoading, setAccountsLoading] = useState(true);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [favoriteBusyIds, setFavoriteBusyIds] = useState<string[]>([]);
  const [deletingIds, setDeletingIds] = useState<string[]>([]);
  const [templatePage, setTemplatePage] = useState(1);
  const [templatePageSize, setTemplatePageSize] = useState(TEMPLATE_PAGE_SIZE);
  const [templateTotal, setTemplateTotal] = useState(0);
  const [templateTotalPages, setTemplateTotalPages] = useState(1);
  const [templateSearch, setTemplateSearch] = useState('');
  const [deleteCandidate, setDeleteCandidate] =
    useState<TransactionTemplateDTO | null>(null);

  const debouncedTemplateSearch = useDebounce(templateSearch.trim(), 300);
  const deletingCandidate = deleteCandidate
    ? deletingIds.includes(deleteCandidate.id)
    : false;
  const closeDeleteDialog = useCallback(() => {
    setDeleteCandidate(null);
  }, []);
  const deleteDialogRef = useModalFocus<HTMLDivElement>(
    Boolean(deleteCandidate),
    closeDeleteDialog,
    deletingCandidate,
  );

  const loadTemplates = useCallback(async () => {
    setTemplatesLoading(true);
    setTemplateError('');
    try {
      const response = await transactionTemplateService.getAll({
        page: templatePage,
        pageSize: templatePageSize,
        ...(debouncedTemplateSearch
          ? { search: debouncedTemplateSearch }
          : {}),
      });
      setItems(sortTemplates(response.data.items));
      setTemplateTotal(response.data.total);
      setTemplateTotalPages(Math.max(1, response.data.totalPages ?? 1));
    } catch (error) {
      setTemplateError(errorMessage(error, 'Erro ao carregar modelos'));
    } finally {
      setTemplatesLoading(false);
    }
  }, [debouncedTemplateSearch, templatePage, templatePageSize]);

  const loadAccounts = useCallback(async () => {
    setAccountsLoading(true);
    setAccountError('');
    try {
      const response = await accountService.getAll();
      setAccounts(response.data.items);
    } catch (error) {
      setAccountError(errorMessage(error, 'Erro ao carregar contas'));
    } finally {
      setAccountsLoading(false);
    }
  }, []);

  const loadCategories = useCallback(async () => {
    setCategoriesLoading(true);
    setCategoryError('');
    try {
      const response = await categoryService.getAll();
      setCategories(response.data.items);
    } catch (error) {
      setCategoryError(errorMessage(error, 'Erro ao carregar categorias'));
    } finally {
      setCategoriesLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadTemplates();
      void loadAccounts();
      void loadCategories();
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [loadAccounts, loadCategories, loadTemplates]);

  useEffect(() => {
    if (!sourceTransactionId) return;

    let active = true;
    async function loadSource() {
      setSourceError('');
      try {
        const response =
          await transactionService.getById(sourceTransactionId as string);
        if (!active) return;

        const source = analyzeTransactionTemplateSource(response.data);
        setForm(source.input);
        setSourceNotices(source.notices);
        setSourceBlocked(false);
      } catch (error) {
        if (!active) return;
        setSourceError(
          errorMessage(error, 'Erro ao carregar transação de origem'),
        );
        setSourceBlocked(true);
      }
    }

    void loadSource();
    return () => {
      active = false;
    };
  }, [sourceTransactionId]);

  useEffect(() => {
    if (!focusTemplateId || sourceTransactionId) return;
    let cancelled = false;
    void transactionTemplateService.getById(focusTemplateId).then(({ data }) => {
      if (cancelled) return;
      setEditing(data);
      setForm(inputFromTemplate(data));
      setSourceNotices([]);
      setSourceBlocked(false);
      setSourceError('');
      setActionError('');
    }).catch(() => {
      // Fall back to normal page for absent/inaccessible models.
    });
    return () => { cancelled = true; };
  }, [focusTemplateId, sourceTransactionId]);

  const compatibleCategories = useMemo(
    () => categories.filter((category) => category.type === form.type),
    [categories, form.type],
  );

  function resetForm() {
    setEditing(null);
    setForm(emptyForm);
    setSourceNotices([]);
    setSourceBlocked(false);
    setSourceError('');
  }

  function startEdit(item: TransactionTemplateDTO) {
    setEditing(item);
    setForm(inputFromTemplate(item));
    setSourceNotices([]);
    setSourceBlocked(false);
    setSourceError('');
    setActionError('');
    setSuccessMessage('');
  }

  function insertCreatedTemplate(item: TransactionTemplateDTO) {
    setTemplateError('');
    setTemplateTotal((current) => current + 1);
    setTemplateSearch('');
    setTemplatePage(1);
    setItems((current) =>
      sortTemplates([item, ...current]).slice(0, templatePageSize),
    );
  }

  function replaceTemplate(item: TransactionTemplateDTO) {
    setItems((current) =>
      sortTemplates(
        current.map((currentItem) =>
          currentItem.id === item.id ? item : currentItem,
        ),
      ),
    );
  }

  async function saveTemplate(event: React.FormEvent) {
    event.preventDefault();
    if (saving || sourceBlocked) return;

    setSaving(true);
    setActionError('');
    setSuccessMessage('');

    const payload = {
      ...form,
      accountId: form.accountId || null,
      categoryId: form.categoryId || null,
      description: form.description ?? '',
    };

    try {
      if (editing) {
        const response = await transactionTemplateService.update(
          editing.id,
          payload,
        );
        replaceTemplate(response.data);
        setSuccessMessage('Modelo atualizado.');
      } else {
        const response = await transactionTemplateService.create(payload);
        insertCreatedTemplate(response.data);
        setSuccessMessage('Modelo criado.');
      }
      resetForm();
    } catch (error) {
      setActionError(
        errorMessage(
          error,
          editing ? 'Erro ao atualizar modelo' : 'Erro ao salvar modelo',
        ),
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleFavorite(item: TransactionTemplateDTO) {
    if (favoriteBusyIds.includes(item.id)) return;

    setFavoriteBusyIds((current) => [...current, item.id]);
    setActionError('');
    setSuccessMessage('');
    try {
      const response = await transactionTemplateService.update(item.id, {
        isFavorite: !item.isFavorite,
      });
      replaceTemplate(response.data);
    } catch (error) {
      setActionError(errorMessage(error, 'Erro ao atualizar favorito'));
    } finally {
      setFavoriteBusyIds((current) =>
        current.filter((id) => id !== item.id),
      );
    }
  }

  async function removeTemplate(id: string) {
    if (deletingIds.includes(id)) return;

    setDeletingIds((current) => [...current, id]);
    setActionError('');
    setSuccessMessage('');
    try {
      await transactionTemplateService.delete(id);
      setTemplateTotal((current) => Math.max(0, current - 1));
      if (items.length === 1 && templatePage > 1) {
        setTemplatePage((current) => Math.max(1, current - 1));
      } else {
        setItems((current) => current.filter((item) => item.id !== id));
      }
      if (editing?.id === id) resetForm();
      setDeleteCandidate(null);
      setSuccessMessage('Modelo excluído. Transações existentes não foram alteradas.');
    } catch (error) {
      setActionError(errorMessage(error, 'Erro ao excluir modelo'));
    } finally {
      setDeletingIds((current) => current.filter((currentId) => currentId !== id));
    }
  }

  const editingInactiveAccount =
    editing?.account && !editing.account.isActive ? editing.account : null;
  const editingInactiveCategory =
    editing?.category && !editing.category.isActive ? editing.category : null;

  const accountSelectDisabled = accountsLoading || Boolean(accountError);
  const categorySelectDisabled =
    categoriesLoading || Boolean(categoryError);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-5 sm:px-6 lg:px-8">
      <header className="border-b border-[var(--border)] pb-5">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--orbit-primary)]">
          Atalhos
        </p>
        <h1 className="mt-1 text-2xl font-black sm:text-3xl">
          Modelos de lançamento
        </h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Modelos apenas preenchem uma nova transação. Nada é lançado sem sua
          confirmação.
        </p>
      </header>

      {actionError && (
        <p
          role="alert"
          className="mt-4 rounded-xl border border-[var(--expense)]/35 bg-[var(--danger-subtle)] p-3 text-sm text-[var(--expense)]"
        >
          {actionError}
        </p>
      )}
      {sourceError && (
        <p
          role="alert"
          className="mt-4 rounded-xl border border-[var(--expense)]/35 bg-[var(--danger-subtle)] p-3 text-sm text-[var(--expense)]"
        >
          {sourceError}
        </p>
      )}
      {successMessage && (
        <p
          role="status"
          className="mt-4 rounded-xl border border-[var(--orbit-primary)]/35 bg-[var(--orbit-primary-subtle)] p-3 text-sm"
        >
          {successMessage}
        </p>
      )}

      <section className="mt-5 grid gap-5 lg:grid-cols-[360px_minmax(0,1fr)]">
        <form
          onSubmit={saveTemplate}
          className="h-fit rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4"
        >
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold">
              {editing
                ? 'Editar modelo'
                : sourceTransactionId
                  ? 'Salvar transação como modelo'
                  : 'Novo modelo'}
            </h2>
            {editing && (
              <button
                type="button"
                onClick={resetForm}
                className="min-h-11 rounded-xl border border-[var(--border)] px-3 text-sm font-semibold"
              >
                Cancelar
              </button>
            )}
          </div>

          {sourceNotices.length > 0 && (
            <div
              className="mt-3 grid gap-2"
              aria-label="Avisos da transação de origem"
            >
              {sourceNotices.map((notice) => (
                <p
                  key={notice}
                  className="rounded-xl border border-[var(--warning)]/35 bg-[var(--warning-subtle)] p-3 text-sm"
                >
                  {notice}
                </p>
              ))}
            </div>
          )}

          <div className="mt-4 grid gap-3">
            <label className="grid gap-1 text-sm font-semibold">
              Nome
              <input
                required
                maxLength={80}
                value={form.name}
                onChange={(event) =>
                  setForm((value) => ({ ...value, name: event.target.value }))
                }
                className="ds-control min-h-11 bg-[var(--surface)] px-3"
              />
            </label>

            <label className="grid gap-1 text-sm font-semibold">
              Tipo
              <select
                value={form.type}
                onChange={(event) =>
                  setForm((value) => ({
                    ...value,
                    type: event.target.value as 'INCOME' | 'EXPENSE',
                    categoryId: null,
                  }))
                }
                className="ds-control min-h-11 bg-[var(--surface)] px-3"
              >
                <option value="EXPENSE">Despesa</option>
                <option value="INCOME">Receita</option>
              </select>
            </label>

            <label className="grid gap-1 text-sm font-semibold">
              Descrição
              <input
                maxLength={TRANSACTION_DESCRIPTION_MAX_LENGTH}
                value={form.description ?? ''}
                onChange={(event) =>
                  setForm((value) => ({
                    ...value,
                    description: event.target.value,
                  }))
                }
                className="ds-control min-h-11 bg-[var(--surface)] px-3"
              />
            </label>

            <label className="grid gap-1 text-sm font-semibold">
              Valor opcional
              <input
                type="number"
                min="0.01"
                max={TRANSACTION_MAX_AMOUNT_CENTS / 100}
                step="0.01"
                value={form.amount ? form.amount / 100 : ''}
                onChange={(event) =>
                  setForm((value) => ({
                    ...value,
                    amount: event.target.value
                      ? Math.round(Number(event.target.value) * 100)
                      : null,
                  }))
                }
                className="ds-control min-h-11 bg-[var(--surface)] px-3"
              />
            </label>

            <div className="grid gap-1">
              <label className="grid gap-1 text-sm font-semibold">
                Conta opcional
                <select
                  value={form.accountId ?? ''}
                  disabled={accountSelectDisabled}
                  onChange={(event) =>
                    setForm((value) => ({
                      ...value,
                      accountId: event.target.value || null,
                    }))
                  }
                  className="ds-control min-h-11 bg-[var(--surface)] px-3 disabled:opacity-60"
                >
                  <option value="">
                    {accountsLoading ? 'Carregando contas…' : 'Escolher ao usar'}
                  </option>
                  {editingInactiveAccount && (
                    <option value={editingInactiveAccount.id} disabled>
                      {editingInactiveAccount.name} (inativa — escolha outra)
                    </option>
                  )}
                  {accounts
                    .filter((account) => account.isActive)
                    .map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.name}
                      </option>
                    ))}
                </select>
              </label>
              {accountError && (
                <div className="flex items-center justify-between gap-2 rounded-lg border border-[var(--border)] p-2 text-xs">
                  <span role="alert">{accountError}</span>
                  <button
                    type="button"
                    onClick={() => void loadAccounts()}
                    className="min-h-11 shrink-0 rounded-lg border border-[var(--border)] px-3 font-semibold"
                  >
                    Tentar novamente
                  </button>
                </div>
              )}
            </div>

            <div className="grid gap-1">
              <label className="grid gap-1 text-sm font-semibold">
                Categoria opcional
                <select
                  value={form.categoryId ?? ''}
                  disabled={categorySelectDisabled}
                  onChange={(event) =>
                    setForm((value) => ({
                      ...value,
                      categoryId: event.target.value || null,
                    }))
                  }
                  className="ds-control min-h-11 bg-[var(--surface)] px-3 disabled:opacity-60"
                >
                  <option value="">
                    {categoriesLoading
                      ? 'Carregando categorias…'
                      : 'Escolher ao usar'}
                  </option>
                  {editingInactiveCategory &&
                    editingInactiveCategory.type === form.type && (
                      <option value={editingInactiveCategory.id} disabled>
                        {editingInactiveCategory.name} (inativa — escolha outra)
                      </option>
                    )}
                  {compatibleCategories
                    .filter((category) => category.isActive)
                    .map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                </select>
              </label>
              {categoryError && (
                <div className="flex items-center justify-between gap-2 rounded-lg border border-[var(--border)] p-2 text-xs">
                  <span role="alert">{categoryError}</span>
                  <button
                    type="button"
                    onClick={() => void loadCategories()}
                    className="min-h-11 shrink-0 rounded-lg border border-[var(--border)] px-3 font-semibold"
                  >
                    Tentar novamente
                  </button>
                </div>
              )}
            </div>

            <label className="flex min-h-11 items-center gap-2 text-sm font-semibold">
              <input
                type="checkbox"
                checked={form.isFavorite ?? false}
                onChange={(event) =>
                  setForm((value) => ({
                    ...value,
                    isFavorite: event.target.checked,
                  }))
                }
              />
              Favoritar
            </label>

            <button
              type="submit"
              disabled={sourceBlocked || saving}
              className="min-h-11 rounded-xl bg-[var(--orbit-primary)] px-4 text-sm font-bold text-[var(--orbit-on-primary)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving
                ? 'Salvando...'
                : editing
                  ? 'Salvar alterações'
                  : 'Salvar modelo'}
            </button>
          </div>
        </form>

        <section aria-labelledby="transaction-template-list-heading">
          <div className="flex items-center justify-between gap-3">
            <h2 id="transaction-template-list-heading" className="text-lg font-bold">
              Seus modelos
            </h2>
            {templateError && (
              <button
                type="button"
                onClick={() => void loadTemplates()}
                className="min-h-11 rounded-xl border border-[var(--border)] px-3 text-sm font-semibold"
              >
                Tentar novamente
              </button>
            )}
          </div>

          <label className="mt-3 grid gap-1 text-sm font-semibold">
            Buscar modelos
            <input
              type="search"
              value={templateSearch}
              placeholder="Nome ou descrição"
              onChange={(event) => {
                setTemplateSearch(event.target.value);
                setTemplatePage(1);
              }}
              className="ds-control min-h-11 bg-[var(--surface)] px-3"
            />
          </label>

          {templateError ? (
            <p
              role="alert"
              className="mt-3 rounded-2xl border border-[var(--expense)]/35 bg-[var(--danger-subtle)] p-4 text-sm text-[var(--expense)]"
            >
              {templateError}
            </p>
          ) : templatesLoading ? (
            <p className="mt-4 text-sm text-[var(--text-muted)]">
              Carregando…
            </p>
          ) : items.length === 0 ? (
            <p className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 text-sm text-[var(--text-muted)]">
              Nenhum modelo criado.
            </p>
          ) : (
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {items.map((item) => {
                const favoriteBusy = favoriteBusyIds.includes(item.id);
                const deleting = deletingIds.includes(item.id);

                return (
                  <article
                    key={item.id}
                    className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4"
                  >
                    <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-[var(--orbit-primary)]">
                      <span>
                        {item.type === 'EXPENSE' ? 'Despesa' : 'Receita'}
                      </span>
                      {item.isFavorite && <span>★ Favorito</span>}
                    </div>
                    <h3 className="mt-1 truncate font-bold">{item.name}</h3>
                    <p className="mt-1 truncate text-sm text-[var(--text-muted)]">
                      {item.description || 'Sem descrição fixa'}
                    </p>
                    <div className="mt-3 grid gap-1 text-xs text-[var(--text-muted)]">
                      <span>{templateAmountLabel(item, showValues)}</span>
                      <span>
                        {templateReferenceLabel('Conta', item.account)}
                      </span>
                      <span>
                        {templateReferenceLabel('Categoria', item.category)}
                      </span>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <Link
                        href={`/transacoes/nova?template=${encodeURIComponent(item.id)}`}
                        className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[var(--orbit-primary)] px-3 text-sm font-bold text-[var(--orbit-on-primary)]"
                      >
                        Usar
                      </Link>
                      <button
                        type="button"
                        onClick={() => startEdit(item)}
                        className="min-h-11 rounded-xl border border-[var(--border)] px-3 text-sm font-semibold"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        disabled={favoriteBusy}
                        onClick={() => void toggleFavorite(item)}
                        className="min-h-11 rounded-xl border border-[var(--border)] px-3 text-sm font-semibold disabled:opacity-50"
                      >
                        {favoriteBusy
                          ? 'Atualizando...'
                          : item.isFavorite
                            ? 'Desfavoritar'
                            : 'Favoritar'}
                      </button>
                      <button
                        type="button"
                        disabled={deleting}
                        onClick={() => setDeleteCandidate(item)}
                        className="min-h-11 rounded-xl border border-[var(--border)] px-3 text-sm font-semibold disabled:opacity-50"
                      >
                        {deleting ? 'Excluindo...' : 'Excluir'}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          <div className="mt-4">
            <Pagination
              page={templatePage}
              pageSize={templatePageSize}
              total={templateTotal}
              totalPages={templateTotalPages}
              loading={templatesLoading}
              pageSizeOptions={[10, 20, 50]}
              onPageChange={setTemplatePage}
              onPageSizeChange={(nextPageSize) => {
                setTemplatePageSize(nextPageSize);
                setTemplatePage(1);
              }}
            />
          </div>
        </section>
      </section>

      {deleteCandidate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !deletingCandidate) {
              closeDeleteDialog();
            }
          }}
        >
          <div
            ref={deleteDialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-template-title"
            aria-describedby="delete-template-description"
            tabIndex={-1}
            className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-xl outline-none"
          >
            <h2 id="delete-template-title" className="text-lg font-bold">
              Excluir Modelo?
            </h2>
            <p
              id="delete-template-description"
              className="mt-2 text-sm leading-relaxed text-[var(--text-muted)]"
            >
              “{deleteCandidate.name}” será removido definitivamente. Transações
              existentes não serão alteradas.
            </p>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={deletingCandidate}
                onClick={closeDeleteDialog}
                className="min-h-11 rounded-xl border border-[var(--border)] px-3 text-sm font-semibold disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={deletingCandidate}
                onClick={() => void removeTemplate(deleteCandidate.id)}
                className="min-h-11 rounded-xl bg-[var(--expense)] px-3 text-sm font-bold text-white disabled:opacity-50"
              >
                {deletingCandidate ? 'Excluindo...' : 'Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
