'use client';

import { PageContainer, PageTitle } from '@/app/components/base-pages';
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import Pagination from '@/app/components/navigation/pagination';
import { Alert } from '@/app/components/feedback';
import { ProtectedRoute } from '@/app/components/layout';
import { Button, Input } from '@/app/components/ui';
import { FaPlus } from 'react-icons/fa';
import TransactionTemplateCard from '@/app/components/pages/transaction-templates/transaction-template-card';
import TransactionTemplateFormFields from '@/app/components/pages/transaction-templates/transaction-template-form-fields';
import { formPreview, groupTemplates } from '@/app/components/pages/transaction-templates/transaction-templates-model';
import { useAuth } from '@/app/context';
import { useDebounce } from '@/app/hooks/use-debounce';
import { useMediaQuery } from '@/app/hooks/use-media-query';
import { ModalShell } from '@/app/components/overlays/modal-shell';
import { formatCurrency } from '@/app/lib/currency/format-currency';
import { analyzeTransactionTemplateSource } from '@/app/lib/templates/transaction-template-mapping';
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
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const [formOpen, setFormOpen] = useState(Boolean(sourceTransactionId));
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
      setFormOpen(true);
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
    setFormOpen(false);
    setEditing(null);
    setForm(emptyForm);
    setSourceNotices([]);
    setSourceBlocked(false);
    setSourceError('');
  }

  function startEdit(item: TransactionTemplateDTO) {
    setFormOpen(true);
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

  const formTitle = editing
    ? 'Editar modelo'
    : sourceTransactionId
      ? 'Salvar transação como modelo'
      : 'Novo modelo';
  const submitLabel = saving
    ? 'Salvando...'
    : editing
      ? 'Salvar alterações'
      : 'Salvar modelo';
  const submitDisabled = sourceBlocked || saving || !form.name.trim();

  const accountOptions = [
    ...(editingInactiveAccount
      ? [
          {
            value: editingInactiveAccount.id,
            label: `${editingInactiveAccount.name} (inativa — escolha outra)`,
            disabled: true,
          },
        ]
      : []),
    ...accounts
      .filter((account) => account.isActive)
      .map((account) => ({ value: account.id, label: account.name })),
  ];
  const categoryOptions = [
    ...(editingInactiveCategory && editingInactiveCategory.type === form.type
      ? [
          {
            value: editingInactiveCategory.id,
            label: `${editingInactiveCategory.name} (inativa — escolha outra)`,
            disabled: true,
          },
        ]
      : []),
    ...compatibleCategories
      .filter((category) => category.isActive)
      .map((category) => ({ value: category.id, label: category.name })),
  ];

  const accountCurrency = accounts.find((account) => account.id === form.accountId)?.currency ?? 'BRL';
  const preview = formPreview({
    form,
    accountName: accounts.find((account) => account.id === form.accountId)?.name ?? null,
    money: (cents) => formatCurrency(cents, accountCurrency),
  });
  const { favorites, others } = groupTemplates(items);

  const renderCards = (list: TransactionTemplateDTO[]) => (
    <div className="grid gap-3 md:grid-cols-2">
      {list.map((item) => (
        <TransactionTemplateCard
          key={item.id}
          item={item}
          showValues={showValues}
          favoriteBusy={favoriteBusyIds.includes(item.id)}
          deleting={deletingIds.includes(item.id)}
          onEdit={() => startEdit(item)}
          onToggleFavorite={() => void toggleFavorite(item)}
          onDelete={() => setDeleteCandidate(item)}
        />
      ))}
    </div>
  );

  const sourceNoticeList = sourceNotices.length > 0 && (
    <div className="mt-3 grid gap-2" aria-label="Avisos da transação de origem">
      {sourceNotices.map((notice) => (
        <p
          key={notice}
          className="rounded-xl border border-[var(--warning)]/35 bg-[var(--warning-subtle)] p-3 text-sm"
        >
          {notice}
        </p>
      ))}
    </div>
  );

  return (
    <ProtectedRoute>
    <PageContainer>
      <PageTitle
        eyebrow="Atalhos"
        title="Modelos de lançamento"
        description="Um modelo só preenche uma nova transação. Nada é lançado sem a sua confirmação."
        actions={
          <Button
            variant="accent"
            size="sm"
            icon={<FaPlus aria-hidden="true" />}
            onClick={() => {
              resetForm();
              setFormOpen(true);
            }}
          >
            Novo modelo
          </Button>
        }
      />

      {actionError && (
        <div className="mt-4">
          <Alert variant="error" message={actionError} />
        </div>
      )}
      {sourceError && (
        <div className="mt-4">
          <Alert variant="error" message={sourceError} />
        </div>
      )}
      {successMessage && (
        <div className="mt-4">
          <Alert variant="success" message={successMessage} />
        </div>
      )}

      <section className="mt-5 space-y-4" aria-labelledby="transaction-template-list-heading">
        <h2 id="transaction-template-list-heading" className="sr-only">Seus modelos</h2>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-[240px] flex-1 sm:max-w-[420px]">
            <Input
              label="Buscar modelos"
              type="search"
              enterKeyHint="search"
              value={templateSearch}
              placeholder="Nome ou descrição"
              onChange={(event) => {
                setTemplateSearch(event.target.value);
                setTemplatePage(1);
              }}
            />
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[13px] text-[var(--text-muted)]">
              {templateTotal} {templateTotal === 1 ? 'modelo' : 'modelos'}
            </span>
            {templateError && (
              <Button variant="outline" size="sm" onClick={() => void loadTemplates()}>
                Tentar novamente
              </Button>
            )}
          </div>
        </div>

        {templateError ? (
          <Alert variant="error" message={templateError} />
        ) : templatesLoading ? (
          <p className="text-sm text-[var(--text-muted)]">Carregando…</p>
        ) : items.length === 0 ? (
          <div className="grid justify-items-center gap-2.5 rounded-[16px] border border-[var(--border)] bg-[var(--surface)] px-4 py-11 text-center">
            <h3 className="text-lg font-bold">
              {debouncedTemplateSearch ? 'Nenhum modelo encontrado' : 'Nenhum modelo criado'}
            </h3>
            <p className="max-w-[50ch] text-sm text-[var(--text-muted)]">
              {debouncedTemplateSearch
                ? 'Tente outro nome ou descrição.'
                : 'Crie um modelo para as contas que você repete e lance em dois toques. Você também pode abrir uma transação e escolher “Salvar como modelo”.'}
            </p>
            {!debouncedTemplateSearch && (
              <Button
                variant="accent"
                icon={<FaPlus aria-hidden="true" />}
                onClick={() => {
                  resetForm();
                  setFormOpen(true);
                }}
              >
                Criar primeiro modelo
              </Button>
            )}
          </div>
        ) : (
          <>
            {favorites.length > 0 && (
              <div className="grid gap-3">
                <h3 className="flex items-baseline gap-2.5 text-sm font-bold">
                  ★ Favoritos <span className="text-xs font-normal text-[var(--text-muted)]">{favorites.length}</span>
                </h3>
                {renderCards(favorites)}
              </div>
            )}
            {others.length > 0 && (
              <div className="grid gap-3">
                {favorites.length > 0 && (
                  <h3 className="flex items-baseline gap-2.5 text-sm font-bold">
                    Outros modelos <span className="text-xs font-normal text-[var(--text-muted)]">{others.length}</span>
                  </h3>
                )}
                {renderCards(others)}
              </div>
            )}
          </>
        )}

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
      </section>

      {formOpen && (
        <ModalShell
          variant={isDesktop ? 'side-panel' : 'fullscreen-sheet'}
          maxWidthClass="max-w-md"
          title={formTitle}
          onClose={resetForm}
          closeDisabled={saving}
          footer={
            <div className="grid gap-2">
              <Button type="submit" form="transaction-template-form" variant="accent" fullWidth disabled={submitDisabled}>
                {submitLabel}
              </Button>
              <Button variant="outline" fullWidth disabled={saving} onClick={resetForm}>
                Cancelar
              </Button>
            </div>
          }
        >
          <form id="transaction-template-form" onSubmit={saveTemplate}>
            {sourceNoticeList}
            <div className={sourceNotices.length > 0 ? 'mt-3' : ''}>
              <TransactionTemplateFormFields
                form={form}
                setForm={setForm}
                accountOptions={accountOptions}
                categoryOptions={categoryOptions}
                accountsLoading={accountsLoading}
                categoriesLoading={categoriesLoading}
                accountError={accountError}
                categoryError={categoryError}
                onRetryAccounts={() => void loadAccounts()}
                onRetryCategories={() => void loadCategories()}
                preview={preview}
              />
            </div>
          </form>
        </ModalShell>
      )}

      {deleteCandidate && (
        <ModalShell
          title="Excluir Modelo?"
          description={`“${deleteCandidate.name}” será removido definitivamente. Transações existentes não serão alteradas.`}
          onClose={closeDeleteDialog}
          closeDisabled={deletingCandidate}
          maxWidthClass="max-w-md"
          footer={
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" disabled={deletingCandidate} onClick={closeDeleteDialog}>
                Cancelar
              </Button>
              <Button
                variant="danger"
                disabled={deletingCandidate}
                onClick={() => void removeTemplate(deleteCandidate.id)}
              >
                {deletingCandidate ? 'Excluindo...' : 'Excluir'}
              </Button>
            </div>
          }
        >
          {null}
        </ModalShell>
      )}
    </PageContainer>
    </ProtectedRoute>
  );
}
