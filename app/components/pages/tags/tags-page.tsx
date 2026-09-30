'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { FaChartBar, FaEdit, FaPlus, FaTag, FaTrash } from 'react-icons/fa';

import { ProtectedRoute } from '@/app/components/layout';
import { useAuth } from '@/app/context';
import { formatCurrency } from '@/app/lib/currency/format-currency';
import { tagService } from '@/app/services/tag-service';
import type { TagDTO, TagReport } from '@/app/types/tag';

export default function TagsPage() {
  const { user } = useAuth();
  const showValues = user?.showValues !== false;
  const [tags, setTags] = useState<TagDTO[]>([]);
  const [name, setName] = useState('');
  const [editing, setEditing] = useState<{ id: string; name: string } | null>(null);
  const [report, setReport] = useState<TagReport | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    const response = await tagService.getAll();
    setTags(response.data.items ?? []);
  }

  useEffect(() => {
    let active = true;

    async function loadInitial() {
      try {
        const response = await tagService.getAll();
        if (active) setTags(response.data.items ?? []);
      } catch {
        if (active) setError('Não foi possível carregar as tags.');
      }
    }

    void loadInitial();
    return () => {
      active = false;
    };
  }, []);

  async function createTag(event: FormEvent) {
    event.preventDefault();
    const normalized = name.trim().replace(/^#/, '');
    if (!normalized) return;
    setBusy(true);
    setError('');
    try {
      await tagService.create({ name: normalized });
      setName('');
      await load();
    } catch (caught: any) {
      setError(caught?.response?.data?.error?.message ?? caught?.message ?? 'Erro ao criar tag');
    } finally {
      setBusy(false);
    }
  }

  async function saveRename(event: FormEvent) {
    event.preventDefault();
    if (!editing) return;
    const normalized = editing.name.trim().replace(/^#/, '');
    if (!normalized) return;
    setBusy(true);
    setError('');
    try {
      await tagService.update(editing.id, { name: normalized });
      setEditing(null);
      if (report?.tag.id === editing.id) setReport(null);
      await load();
    } catch (caught: any) {
      setError(caught?.response?.data?.error?.message ?? caught?.message ?? 'Erro ao renomear tag');
    } finally {
      setBusy(false);
    }
  }

  async function removeTag(tag: TagDTO) {
    if (!window.confirm(`Excluir #${tag.name}? As transações serão preservadas; apenas o vínculo da tag será removido.`)) return;
    setBusy(true);
    setError('');
    try {
      await tagService.delete(tag.id);
      if (report?.tag.id === tag.id) setReport(null);
      await load();
    } catch (caught: any) {
      setError(caught?.response?.data?.error?.message ?? caught?.message ?? 'Erro ao excluir tag');
    } finally {
      setBusy(false);
    }
  }

  async function loadReport(tag: TagDTO) {
    setBusy(true);
    setError('');
    try {
      const response = await tagService.report(tag.id);
      setReport(response.data);
    } catch (caught: any) {
      setError(caught?.response?.data?.error?.message ?? caught?.message ?? 'Erro ao carregar relatório');
    } finally {
      setBusy(false);
    }
  }

  return (
    <ProtectedRoute>
      <main className="mx-auto w-full max-w-5xl px-4 py-5 sm:px-6 lg:px-8">
        <header className="border-b border-[var(--border)] pb-5">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--orbit-primary)]">Contexto</p>
          <h1 className="mt-1 text-2xl font-black sm:text-3xl">Tags</h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Classifique transações por contexto sem alterar categoria, saldo ou tipo financeiro.
          </p>
        </header>

        {error ? (
          <p role="alert" className="mt-4 rounded-xl border border-[var(--expense)]/35 bg-[var(--danger-subtle)] p-3 text-sm text-[var(--expense)]">
            {error}
          </p>
        ) : null}

        <section className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(300px,.8fr)]">
          <div className="space-y-4">
            <form onSubmit={createTag} className="ds-panel flex flex-col gap-3 p-4 sm:flex-row sm:items-end">
              <label className="grid flex-1 gap-1 text-sm font-semibold">
                Nova tag
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  maxLength={41}
                  placeholder="Ex.: ferias-2026"
                  className="ds-control min-h-11 bg-[var(--surface)] px-3"
                  disabled={busy}
                />
              </label>
              <button type="submit" disabled={busy || !name.trim()} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--orbit-primary)] px-4 text-sm font-bold text-[var(--orbit-on-primary)] disabled:opacity-50">
                <FaPlus aria-hidden="true" /> Criar tag
              </button>
            </form>

            <section className="ds-panel p-4" aria-labelledby="tag-list-title">
              <div className="flex items-center gap-2">
                <FaTag className="text-[var(--orbit-primary)]" aria-hidden="true" />
                <h2 id="tag-list-title" className="font-bold">Tags cadastradas</h2>
              </div>

              {tags.length === 0 ? (
                <p className="mt-4 text-sm text-[var(--text-muted)]">Nenhuma tag cadastrada.</p>
              ) : (
                <ul className="mt-4 divide-y divide-[var(--border)]">
                  {tags.map((tag) => (
                    <li key={tag.id} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                      {editing?.id === tag.id ? (
                        <form onSubmit={saveRename} className="flex min-w-[240px] flex-1 gap-2">
                          <input
                            autoFocus
                            value={editing.name}
                            onChange={(event) => setEditing({ id: tag.id, name: event.target.value })}
                            maxLength={41}
                            className="ds-control min-h-11 min-w-0 flex-1 bg-[var(--surface)] px-3"
                          />
                          <button type="submit" disabled={busy} className="min-h-11 rounded-xl border border-[var(--border)] px-3 text-sm font-bold">Salvar</button>
                          <button type="button" onClick={() => setEditing(null)} className="min-h-11 px-2 text-sm text-[var(--text-muted)]">Cancelar</button>
                        </form>
                      ) : (
                        <>
                          <strong className="text-sm text-[var(--foreground)]">#{tag.name}</strong>
                          <div className="flex items-center gap-1">
                            <button type="button" onClick={() => void loadReport(tag)} disabled={busy} aria-label={`Relatório da tag ${tag.name}`} className="grid min-h-11 min-w-11 place-items-center rounded-xl text-[var(--text-muted)] hover:bg-[var(--surface-subtle)] hover:text-[var(--foreground)]">
                              <FaChartBar aria-hidden="true" />
                            </button>
                            <button type="button" onClick={() => setEditing({ id: tag.id, name: tag.name })} disabled={busy} aria-label={`Renomear tag ${tag.name}`} className="grid min-h-11 min-w-11 place-items-center rounded-xl text-[var(--text-muted)] hover:bg-[var(--surface-subtle)] hover:text-[var(--foreground)]">
                              <FaEdit aria-hidden="true" />
                            </button>
                            <button type="button" onClick={() => void removeTag(tag)} disabled={busy} aria-label={`Excluir tag ${tag.name}`} className="grid min-h-11 min-w-11 place-items-center rounded-xl text-[var(--text-muted)] hover:bg-[var(--danger-subtle)] hover:text-[var(--expense)]">
                              <FaTrash aria-hidden="true" />
                            </button>
                          </div>
                        </>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          <aside className="ds-panel h-fit p-4" aria-labelledby="tag-report-title">
            <h2 id="tag-report-title" className="font-bold">Relatório por tag</h2>
            {!report ? (
              <p className="mt-3 text-sm text-[var(--text-muted)]">
                Selecione o ícone de relatório de uma tag para ver receitas e despesas concluídas, separadas por moeda.
              </p>
            ) : (
              <div className="mt-3 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <strong>#{report.tag.name}</strong>
                  <Link href="/transacoes" className="text-sm font-semibold text-[var(--orbit-primary)]">Abrir transações</Link>
                </div>
                {report.currencies.length === 0 ? (
                  <p className="text-sm text-[var(--text-muted)]">Sem transações concluídas nesta tag.</p>
                ) : (
                  report.currencies.map((item) => (
                    <dl key={item.currency} className="rounded-xl border border-[var(--border)] p-3 text-sm">
                      <div className="flex justify-between"><dt>Moeda</dt><dd className="font-bold">{item.currency}</dd></div>
                      <div className="mt-2 flex justify-between"><dt>Transações</dt><dd>{item.transactionCount}</dd></div>
                      <div className="mt-2 flex justify-between"><dt>Receitas</dt><dd className="text-[var(--income)]">{showValues ? formatCurrency(item.income, item.currency) : '••••'}</dd></div>
                      <div className="mt-2 flex justify-between"><dt>Despesas</dt><dd className="text-[var(--expense)]">{showValues ? formatCurrency(item.expense, item.currency) : '••••'}</dd></div>
                      <div className="mt-2 flex justify-between border-t border-[var(--border)] pt-2"><dt>Resultado</dt><dd className="font-bold">{showValues ? formatCurrency(item.balance, item.currency) : '••••'}</dd></div>
                    </dl>
                  ))
                )}
              </div>
            )}
          </aside>
        </section>
      </main>
    </ProtectedRoute>
  );
}
