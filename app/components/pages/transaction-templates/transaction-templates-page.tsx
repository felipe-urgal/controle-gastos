'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { analyzeTransactionTemplateSource } from '@/app/lib/templates/transaction-template-mapping';
import {
  TRANSACTION_DESCRIPTION_MAX_LENGTH,
  TRANSACTION_MAX_AMOUNT_CENTS,
} from '@/app/lib/transactions/transaction-field-contract';
import { accountService } from '@/app/services/account-service';
import { categoryService } from '@/app/services/category-service';
import { transactionService } from '@/app/services/transaction-service';
import { transactionTemplateService } from '@/app/services/transaction-template-service';
import type { AccountModel } from '@/app/types/account';
import type { CategoryModel } from '@/app/types/category';
import type {
  TransactionTemplateDTO,
  TransactionTemplateInput,
} from '@/app/types/transaction-template';

const emptyForm: TransactionTemplateInput = {
  name: '',
  type: 'EXPENSE',
  description: '',
  amount: null,
  isFavorite: false,
  accountId: null,
  categoryId: null,
};

function inputFromTemplate(item: TransactionTemplateDTO): TransactionTemplateInput {
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

export default function TransactionTemplatesPage({
  sourceTransactionId,
}: {
  sourceTransactionId?: string;
}) {
  const [items, setItems] = useState<TransactionTemplateDTO[]>([]);
  const [accounts, setAccounts] = useState<AccountModel[]>([]);
  const [categories, setCategories] = useState<CategoryModel[]>([]);
  const [form, setForm] = useState<TransactionTemplateInput>(emptyForm);
  const [editing, setEditing] = useState<TransactionTemplateDTO | null>(null);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [sourceNotices, setSourceNotices] = useState<string[]>([]);
  const [sourceBlocked, setSourceBlocked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [favoriteBusyId, setFavoriteBusyId] = useState<string | null>(null);

  async function refresh() {
    const [templates, accountResponse, categoryResponse] = await Promise.all([
      transactionTemplateService.getAll(),
      accountService.getAll(),
      categoryService.getAll(),
    ]);
    setItems(templates.data.items);
    setAccounts(accountResponse.data.items);
    setCategories(categoryResponse.data.items);
  }

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        await refresh();
        if (sourceTransactionId) {
          const response = await transactionService.getById(sourceTransactionId);
          if (!active) return;
          const source = analyzeTransactionTemplateSource(response.data);
          setForm(source.input);
          setSourceNotices(source.notices);
          setSourceBlocked(false);
        }
      } catch (cause) {
        if (active) {
          setError(
            cause instanceof Error ? cause.message : 'Erro ao carregar modelos',
          );
          if (sourceTransactionId) setSourceBlocked(true);
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [sourceTransactionId]);

  const compatibleCategories = useMemo(
    () => categories.filter((category) => category.type === form.type),
    [categories, form.type],
  );

  function resetForm() {
    setEditing(null);
    setForm(emptyForm);
    setSourceNotices([]);
    setSourceBlocked(false);
  }

  function startEdit(item: TransactionTemplateDTO) {
    setEditing(item);
    setForm(inputFromTemplate(item));
    setSourceNotices([]);
    setSourceBlocked(false);
    setError('');
    setSuccessMessage('');
  }

  async function saveTemplate(event: React.FormEvent) {
    event.preventDefault();
    if (saving || sourceBlocked) return;

    setSaving(true);
    setError('');
    setSuccessMessage('');
    const payload = {
      ...form,
      accountId: form.accountId || null,
      categoryId: form.categoryId || null,
      description: form.description ?? '',
    };

    try {
      if (editing) {
        await transactionTemplateService.update(editing.id, payload);
        setSuccessMessage('Modelo atualizado.');
      } else {
        await transactionTemplateService.create(payload);
        setSuccessMessage('Modelo criado.');
      }
      resetForm();
      await refresh();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : editing
            ? 'Erro ao atualizar modelo'
            : 'Erro ao salvar modelo',
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleFavorite(item: TransactionTemplateDTO) {
    if (favoriteBusyId) return;
    setFavoriteBusyId(item.id);
    setError('');
    try {
      await transactionTemplateService.update(item.id, {
        isFavorite: !item.isFavorite,
      });
      await refresh();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'Erro ao atualizar favorito',
      );
    } finally {
      setFavoriteBusyId(null);
    }
  }

  async function removeTemplate(id: string) {
    try {
      await transactionTemplateService.delete(id);
      if (editing?.id === id) resetForm();
      await refresh();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'Erro ao excluir modelo',
      );
    }
  }

  const editingInactiveAccount =
    editing?.account && !editing.account.isActive ? editing.account : null;
  const editingInactiveCategory =
    editing?.category && !editing.category.isActive ? editing.category : null;

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-5 sm:px-6 lg:px-8">
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

      {error && (
        <p
          role="alert"
          className="mt-4 rounded-xl border border-[var(--expense)]/35 bg-[var(--danger-subtle)] p-3 text-sm text-[var(--expense)]"
        >
          {error}
        </p>
      )}
      {successMessage && (
        <p
          role="status"
          className="mt-4 rounded-xl border border-[var(--success)]/35 bg-[var(--success-subtle)] p-3 text-sm"
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
            <label className="grid gap-1 text-sm font-semibold">
              Conta opcional
              <select
                value={form.accountId ?? ''}
                onChange={(event) =>
                  setForm((value) => ({
                    ...value,
                    accountId: event.target.value || null,
                  }))
                }
                className="ds-control min-h-11 bg-[var(--surface)] px-3"
              >
                <option value="">Escolher ao usar</option>
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
            <label className="grid gap-1 text-sm font-semibold">
              Categoria opcional
              <select
                value={form.categoryId ?? ''}
                onChange={(event) =>
                  setForm((value) => ({
                    ...value,
                    categoryId: event.target.value || null,
                  }))
                }
                className="ds-control min-h-11 bg-[var(--surface)] px-3"
              >
                <option value="">Escolher ao usar</option>
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

        <section>
          <h2 className="text-lg font-bold">Seus modelos</h2>
          {loading ? (
            <p className="mt-4 text-sm text-[var(--text-muted)]">
              Carregando…
            </p>
          ) : items.length === 0 ? (
            <p className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 text-sm text-[var(--text-muted)]">
              Nenhum modelo criado.
            </p>
          ) : (
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {items.map((item) => (
                <article
                  key={item.id}
                  className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4"
                >
                  <span className="text-xs font-semibold text-[var(--orbit-primary)]">
                    {item.isFavorite
                      ? '★ Favorito'
                      : item.type === 'EXPENSE'
                        ? 'Despesa'
                        : 'Receita'}
                  </span>
                  <h3 className="mt-1 truncate font-bold">{item.name}</h3>
                  <p className="mt-1 truncate text-sm text-[var(--text-muted)]">
                    {item.description || 'Sem descrição fixa'}
                  </p>
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
                      disabled={favoriteBusyId === item.id}
                      onClick={() => void toggleFavorite(item)}
                      className="min-h-11 rounded-xl border border-[var(--border)] px-3 text-sm font-semibold disabled:opacity-50"
                    >
                      {item.isFavorite ? 'Desfavoritar' : 'Favoritar'}
                    </button>
                    <button
                      type="button"
                      onClick={() => void removeTemplate(item.id)}
                      className="min-h-11 rounded-xl border border-[var(--border)] px-3 text-sm font-semibold"
                    >
                      Excluir
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
