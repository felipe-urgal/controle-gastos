'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { analyzeTransactionTemplateSource } from '@/app/lib/templates/transaction-template-mapping';
import { TRANSACTION_DESCRIPTION_MAX_LENGTH, TRANSACTION_MAX_AMOUNT_CENTS } from '@/app/lib/transactions/transaction-field-contract';
import { accountService } from '@/app/services/account-service';
import { categoryService } from '@/app/services/category-service';
import { transactionService } from '@/app/services/transaction-service';
import { transactionTemplateService } from '@/app/services/transaction-template-service';
import type { AccountModel } from '@/app/types/account';
import type { CategoryModel } from '@/app/types/category';
import type { TransactionTemplateDTO, TransactionTemplateInput } from '@/app/types/transaction-template';

const emptyForm: TransactionTemplateInput = {
  name: '', type: 'EXPENSE', description: '', amount: null,
  isFavorite: false, position: 0, accountId: null, categoryId: null,
};

export default function TransactionTemplatesPage({ sourceTransactionId }: { sourceTransactionId?: string }) {
  const [items, setItems] = useState<TransactionTemplateDTO[]>([]);
  const [accounts, setAccounts] = useState<AccountModel[]>([]);
  const [categories, setCategories] = useState<CategoryModel[]>([]);
  const [form, setForm] = useState<TransactionTemplateInput>(emptyForm);
  const [error, setError] = useState('');
  const [sourceNotices, setSourceNotices] = useState<string[]>([]);
  const [sourceBlocked, setSourceBlocked] = useState(false);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    const [templates, accountResponse, categoryResponse] = await Promise.all([
      transactionTemplateService.getAll(), accountService.getAll(), categoryService.getAll(),
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
          const transaction = response.data;
          const source = analyzeTransactionTemplateSource(transaction);
          setForm(source.input);
          setSourceNotices(source.notices);
          setSourceBlocked(false);
        }
      } catch (cause) {
        if (active) {
          setError(cause instanceof Error ? cause.message : 'Erro ao carregar modelos');
          if (sourceTransactionId) setSourceBlocked(true);
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => { active = false; };
  }, [sourceTransactionId]);

  async function saveTemplate(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    try {
      await transactionTemplateService.create({ ...form, accountId: form.accountId || null, categoryId: form.categoryId || null, description: form.description ?? '' });
      setForm(emptyForm);
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Erro ao salvar modelo');
    }
  }

  async function removeTemplate(id: string) {
    try {
      await transactionTemplateService.delete(id);
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Erro ao excluir modelo');
    }
  }

  const compatibleCategories = categories.filter((category) => category.type === form.type);

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-5 sm:px-6 lg:px-8">
      <header className="border-b border-[var(--border)] pb-5">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--orbit-primary)]">Atalhos</p>
        <h1 className="mt-1 text-2xl font-black sm:text-3xl">Modelos de lançamento</h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">Modelos apenas preenchem uma nova transação. Nada é lançado sem sua confirmação.</p>
      </header>
      {error && <p role="alert" className="mt-4 rounded-xl border border-[var(--expense)]/35 bg-[var(--danger-subtle)] p-3 text-sm text-[var(--expense)]">{error}</p>}
      <section className="mt-5 grid gap-5 lg:grid-cols-[360px_minmax(0,1fr)]">
        <form onSubmit={saveTemplate} className="h-fit rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
          <h2 className="text-lg font-bold">{sourceTransactionId ? 'Salvar transação como modelo' : 'Novo modelo'}</h2>
          {sourceNotices.length > 0 && <div className="mt-3 grid gap-2" aria-label="Avisos da transação de origem">{sourceNotices.map((notice) => <p key={notice} className="rounded-xl border border-[var(--warning)]/35 bg-[var(--warning-subtle)] p-3 text-sm">{notice}</p>)}</div>}
          <div className="mt-4 grid gap-3">
            <label className="grid gap-1 text-sm font-semibold">Nome<input required maxLength={80} value={form.name} onChange={(e) => setForm((v) => ({ ...v, name: e.target.value }))} className="ds-control min-h-11 bg-[var(--surface)] px-3" /></label>
            <label className="grid gap-1 text-sm font-semibold">Tipo<select value={form.type} onChange={(e) => setForm((v) => ({ ...v, type: e.target.value as 'INCOME' | 'EXPENSE', categoryId: null }))} className="ds-control min-h-11 bg-[var(--surface)] px-3"><option value="EXPENSE">Despesa</option><option value="INCOME">Receita</option></select></label>
            <label className="grid gap-1 text-sm font-semibold">Descrição<input maxLength={TRANSACTION_DESCRIPTION_MAX_LENGTH} value={form.description ?? ''} onChange={(e) => setForm((v) => ({ ...v, description: e.target.value }))} className="ds-control min-h-11 bg-[var(--surface)] px-3" /></label>
            <label className="grid gap-1 text-sm font-semibold">Valor opcional<input type="number" min="0.01" max={TRANSACTION_MAX_AMOUNT_CENTS / 100} step="0.01" value={form.amount ? form.amount / 100 : ''} onChange={(e) => setForm((v) => ({ ...v, amount: e.target.value ? Math.round(Number(e.target.value) * 100) : null }))} className="ds-control min-h-11 bg-[var(--surface)] px-3" /></label>
            <label className="grid gap-1 text-sm font-semibold">Conta opcional<select value={form.accountId ?? ''} onChange={(e) => setForm((v) => ({ ...v, accountId: e.target.value || null }))} className="ds-control min-h-11 bg-[var(--surface)] px-3"><option value="">Escolher ao usar</option>{accounts.filter((a) => a.isActive).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></label>
            <label className="grid gap-1 text-sm font-semibold">Categoria opcional<select value={form.categoryId ?? ''} onChange={(e) => setForm((v) => ({ ...v, categoryId: e.target.value || null }))} className="ds-control min-h-11 bg-[var(--surface)] px-3"><option value="">Escolher ao usar</option>{compatibleCategories.filter((c) => c.isActive).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
            <label className="flex min-h-11 items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={form.isFavorite ?? false} onChange={(e) => setForm((v) => ({ ...v, isFavorite: e.target.checked }))} />Favoritar</label>
            <button type="submit" disabled={sourceBlocked} className="min-h-11 rounded-xl bg-[var(--orbit-primary)] px-4 text-sm font-bold text-[var(--orbit-on-primary)] disabled:cursor-not-allowed disabled:opacity-50">Salvar modelo</button>
          </div>
        </form>
        <section>
          <h2 className="text-lg font-bold">Seus modelos</h2>
          {loading ? <p className="mt-4 text-sm text-[var(--text-muted)]">Carregando…</p> : items.length === 0 ? <p className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 text-sm text-[var(--text-muted)]">Nenhum modelo criado.</p> : (
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {items.map((item) => <article key={item.id} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
                <span className="text-xs font-semibold text-[var(--orbit-primary)]">{item.isFavorite ? '★ Favorito' : item.type === 'EXPENSE' ? 'Despesa' : 'Receita'}</span>
                <h3 className="mt-1 truncate font-bold">{item.name}</h3>
                <p className="mt-1 truncate text-sm text-[var(--text-muted)]">{item.description || 'Sem descrição fixa'}</p>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <Link href={`/transacoes/nova?template=${encodeURIComponent(item.id)}`} className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[var(--orbit-primary)] px-3 text-sm font-bold text-[var(--orbit-on-primary)]">Usar</Link>
                  <button type="button" onClick={() => void removeTemplate(item.id)} className="min-h-11 rounded-xl border border-[var(--border)] px-3 text-sm font-semibold">Excluir</button>
                </div>
              </article>)}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
