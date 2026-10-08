'use client';

import Link from 'next/link';
import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import {
  FaArchive,
  FaChartBar,
  FaEdit,
  FaPlus,
  FaRedo,
  FaTag,
  FaTrash,
  FaUndo,
} from 'react-icons/fa';

import { ProtectedRoute } from '@/app/components/layout';
import ConfirmationModal from '@/app/components/overlays/confirmation-modal';
import { useAuth } from '@/app/context';
import { formatCurrency } from '@/app/lib/currency/format-currency';
import { normalizeTagDisplayName } from '@/app/lib/tags/tag-name';
import { ApiClientError } from '@/app/services/api-client';
import { tagService } from '@/app/services/tag-service';
import type { TagDTO, TagReport } from '@/app/types/tag';

function messageFromError(error: unknown, fallback: string) {
  return error instanceof ApiClientError || error instanceof Error
    ? error.message
    : fallback;
}

const TAG_PAGE_SIZE = 50;

function sortTags(tags: TagDTO[]) {
  return [...tags].sort(
    (left, right) =>
      Number(right.isActive) - Number(left.isActive) ||
      left.name.localeCompare(right.name, 'pt-BR') ||
      left.id.localeCompare(right.id),
  );
}

export default function TagsPage({ focusTagId }: { focusTagId?: string }) {
  const { user } = useAuth();
  const showValues = user?.showValues !== false;

  const [tags, setTags] = useState<TagDTO[]>([]);
  const [name, setName] = useState('');
  const [searchDraft, setSearchDraft] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [editing, setEditing] = useState<{ id: string; name: string } | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<TagDTO | null>(null);

  const [loadingTags, setLoadingTags] = useState(true);
  const [creating, setCreating] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [lifecycleId, setLifecycleId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [listError, setListError] = useState('');
  const [actionError, setActionError] = useState('');
  const [notice, setNotice] = useState('');
  const [actionFeedbackTagId, setActionFeedbackTagId] = useState<string | null>(null);

  const [report, setReport] = useState<TagReport | null>(null);
  const [selectedReportTagId, setSelectedReportTagId] = useState<string | null>(null);
  const [reportLoadingTagId, setReportLoadingTagId] = useState<string | null>(null);
  const [reportError, setReportError] = useState('');

  const selectedReportTag = useMemo(
    () => tags.find((tag) => tag.id === selectedReportTagId) ?? null,
    [selectedReportTagId, tags],
  );

  const loadTags = useCallback(async () => {
    setLoadingTags(true);
    setListError('');
    try {
      const response = await tagService.getAll({
        page,
        pageSize: TAG_PAGE_SIZE,
        search: search || undefined,
      });
      const nextTotalPages = Math.max(1, response.data.totalPages ?? 1);
      if (page > nextTotalPages) {
        setPage(nextTotalPages);
        return;
      }
      setTags(sortTags(response.data.items ?? []));
      setTotal(response.data.total ?? 0);
      setTotalPages(nextTotalPages);
    } catch (error) {
      setListError(messageFromError(error, 'Não foi possível carregar as tags.'));
    } finally {
      setLoadingTags(false);
    }
  }, [page, search]);

  useEffect(() => {
    let active = true;

    tagService
      .getAll({
        page,
        pageSize: TAG_PAGE_SIZE,
        search: search || undefined,
      })
      .then((response) => {
        if (!active) return;

        const nextTotalPages = Math.max(1, response.data.totalPages ?? 1);
        if (page > nextTotalPages) {
          setPage(nextTotalPages);
          return;
        }

        setTags(sortTags(response.data.items ?? []));
        setTotal(response.data.total ?? 0);
        setTotalPages(nextTotalPages);
      })
      .catch((error) => {
        if (!active) return;
        setListError(messageFromError(error, 'Não foi possível carregar as tags.'));
      })
      .finally(() => {
        if (active) setLoadingTags(false);
      });

    return () => {
      active = false;
    };
  }, [page, search]);

  useEffect(() => {
    if (!focusTagId) return;
    let cancelled = false;
    void tagService.getById(focusTagId).then(({ data }) => {
      if (cancelled) return;
      setPage(1);
      setSearchDraft(data.name);
      setSearch(data.name);
      setEditing({ id: data.id, name: data.name });
    }).catch(() => {
      // Do not reveal whether inaccessible IDs exist.
    });
    return () => { cancelled = true; };
  }, [focusTagId]);

  function replaceTag(updated: TagDTO) {
    setTags((current) =>
      sortTags(current.map((tag) => (tag.id === updated.id ? updated : tag))),
    );
  }

  function applySearch(event: FormEvent) {
    event.preventDefault();
    setLoadingTags(true);
    setListError('');
    setPage(1);
    setSearch(normalizeTagDisplayName(searchDraft));
  }

  function clearSearch() {
    setLoadingTags(true);
    setListError('');
    setSearchDraft('');
    setSearch('');
    setPage(1);
  }

  function changePage(nextPage: number) {
    setLoadingTags(true);
    setListError('');
    setPage(nextPage);
  }

  async function createTag(event: FormEvent) {
    event.preventDefault();
    const normalized = normalizeTagDisplayName(name);
    if (!normalized || creating) return;

    setCreating(true);
    setActionFeedbackTagId(null);
    setActionError('');
    setNotice('');
    try {
      const response = await tagService.create({ name: normalized });
      setName('');
      setNotice(`#${response.data.name} criada com sucesso.`);
      if (page !== 1) setPage(1);
      else void loadTags();
    } catch (error) {
      setActionError(messageFromError(error, 'Erro ao criar tag'));
    } finally {
      setCreating(false);
    }
  }

  async function saveRename(event: FormEvent) {
    event.preventDefault();
    if (!editing || renamingId) return;

    const normalized = normalizeTagDisplayName(editing.name);
    if (!normalized) return;

    setRenamingId(editing.id);
    setActionFeedbackTagId(editing.id);
    setActionError('');
    setNotice('');
    try {
      const response = await tagService.update(editing.id, { name: normalized });
      replaceTag(response.data);
      setEditing(null);
      if (report?.tag.id === response.data.id) {
        setReport({
          ...report,
          tag: { ...report.tag, name: response.data.name },
        });
      }
      setNotice(`Tag renomeada para #${response.data.name}.`);
      void loadTags();
    } catch (error) {
      setActionError(messageFromError(error, 'Erro ao renomear tag'));
    } finally {
      setRenamingId(null);
    }
  }

  async function toggleArchive(tag: TagDTO) {
    if (lifecycleId) return;

    setLifecycleId(tag.id);
    setActionFeedbackTagId(tag.id);
    setActionError('');
    setNotice('');
    try {
      const response = await tagService.update(tag.id, {
        isActive: !tag.isActive,
      });
      replaceTag(response.data);
      setNotice(
        response.data.isActive
          ? `#${response.data.name} reativada.`
          : `#${response.data.name} arquivada. O histórico foi preservado.`,
      );
      void loadTags();
    } catch (error) {
      setActionError(
        messageFromError(
          error,
          tag.isActive ? 'Erro ao arquivar tag' : 'Erro ao reativar tag',
        ),
      );
    } finally {
      setLifecycleId(null);
    }
  }

  async function removeTag() {
    const tag = deleteCandidate;
    if (!tag || deletingId) return;

    setDeletingId(tag.id);
    setActionFeedbackTagId(tag.id);
    setActionError('');
    setNotice('');
    try {
      await tagService.delete(tag.id);
      setTags((current) => current.filter((item) => item.id !== tag.id));
      if (selectedReportTagId === tag.id) {
        setSelectedReportTagId(null);
        setReport(null);
        setReportError('');
      }
      setEditing((current) => (current?.id === tag.id ? null : current));
      setDeleteCandidate(null);
      setActionFeedbackTagId(null);
      setNotice(`#${tag.name} excluída.`);
      void loadTags();
    } catch (error) {
      setActionError(messageFromError(error, 'Erro ao excluir tag'));
      setDeleteCandidate(null);
    } finally {
      setDeletingId(null);
    }
  }

  async function loadReport(tag: TagDTO) {
    if (reportLoadingTagId) return;

    setSelectedReportTagId(tag.id);
    setReportLoadingTagId(tag.id);
    setReportError('');
    setReport(null);
    try {
      const response = await tagService.report(tag.id);
      setReport(response.data);
    } catch (error) {
      setReportError(messageFromError(error, 'Erro ao carregar relatório'));
    } finally {
      setReportLoadingTagId(null);
    }
  }

  return (
    <ProtectedRoute>
      <div className="mx-auto w-full max-w-5xl px-4 py-5 sm:px-6 lg:px-8">
        <header className="border-b border-[var(--border)] pb-5">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--orbit-primary)]">
            Contexto
          </p>
          <h1 className="mt-1 text-2xl font-black sm:text-3xl">Tags</h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Classifique transações por contexto sem alterar categoria, saldo ou tipo financeiro.
          </p>
        </header>


        <section className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(300px,.8fr)]">
          <div className="space-y-4">
            <form
              onSubmit={createTag}
              className="ds-panel flex flex-col gap-3 p-4 sm:flex-row sm:items-end"
            >
              <label className="grid flex-1 gap-1 text-sm font-semibold">
                Nova tag
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  maxLength={41}
                  placeholder="Ex.: ferias-2026"
                  className="ds-control min-h-11 bg-[var(--surface)] px-3"
                  disabled={creating}
                />
              </label>
              <button
                type="submit"
                disabled={creating || !normalizeTagDisplayName(name)}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--orbit-primary)] px-4 text-sm font-bold text-[var(--orbit-on-primary)] disabled:opacity-50"
              >
                <FaPlus aria-hidden="true" />
                {creating ? 'Criando…' : 'Criar tag'}
              </button>
            </form>

            {notice && actionFeedbackTagId === null ? (
              <p
                role="status"
                className="rounded-xl border border-[var(--border)] bg-[var(--surface-subtle)] p-3 text-sm text-[var(--foreground)]"
              >
                {notice}
              </p>
            ) : null}

            {actionError && actionFeedbackTagId === null ? (
              <p
                role="alert"
                className="rounded-xl border border-[var(--expense)]/35 bg-[var(--danger-subtle)] p-3 text-sm text-[var(--expense)]"
              >
                {actionError}
              </p>
            ) : null}

            <section className="ds-panel p-4" aria-labelledby="tag-list-title">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <FaTag className="text-[var(--orbit-primary)]" aria-hidden="true" />
                  <h2 id="tag-list-title" className="font-bold">
                    Tags cadastradas
                  </h2>
                </div>
                {listError ? (
                  <button
                    type="button"
                    onClick={() => void loadTags()}
                    disabled={loadingTags}
                    className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[var(--border)] px-3 text-sm font-bold"
                  >
                    <FaRedo aria-hidden="true" />
                    Tentar novamente
                  </button>
                ) : null}
              </div>

              <form
                onSubmit={applySearch}
                className="mt-4 flex flex-col gap-2 sm:flex-row"
                role="search"
              >
                <input
                  value={searchDraft}
                  onChange={(event) => setSearchDraft(event.target.value)}
                  placeholder="Buscar tag pelo nome"
                  className="ds-control min-h-11 min-w-0 flex-1 bg-[var(--surface)] px-3 text-sm"
                  aria-label="Buscar tags"
                />
                <button
                  type="submit"
                  disabled={loadingTags}
                  className="min-h-11 rounded-xl border border-[var(--border)] px-4 text-sm font-bold"
                >
                  Buscar
                </button>
                {search ? (
                  <button
                    type="button"
                    onClick={clearSearch}
                    disabled={loadingTags}
                    className="min-h-11 px-3 text-sm font-semibold text-[var(--text-muted)]"
                  >
                    Limpar
                  </button>
                ) : null}
              </form>

              {!loadingTags && !listError ? (
                <p className="mt-3 text-xs text-[var(--text-muted)]">
                  {total === 1 ? '1 tag encontrada' : `${total} tags encontradas`}
                  {search ? ` para “${search}”` : ''}.
                </p>
              ) : null}

              {listError ? (
                <p
                  role="alert"
                  className="mt-4 rounded-xl border border-[var(--expense)]/35 bg-[var(--danger-subtle)] p-3 text-sm text-[var(--expense)]"
                >
                  {listError}
                </p>
              ) : loadingTags ? (
                <p className="mt-4 text-sm text-[var(--text-muted)]">Carregando tags…</p>
              ) : tags.length === 0 ? (
                <p className="mt-4 text-sm text-[var(--text-muted)]">
                  {search ? 'Nenhuma tag encontrada para esta busca.' : 'Nenhuma tag cadastrada.'}
                </p>
              ) : (
                <ul className="mt-4 divide-y divide-[var(--border)]">
                  {tags.map((tag) => (
                    <li
                      key={tag.id}
                      className="flex flex-col gap-3 py-3 first:pt-0 last:pb-0 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between"
                    >
                      {editing?.id === tag.id ? (
                        <form
                          onSubmit={saveRename}
                          className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row"
                        >
                          <input
                            autoFocus
                            value={editing.name}
                            onChange={(event) =>
                              setEditing({ id: tag.id, name: event.target.value })
                            }
                            maxLength={41}
                            aria-label="Novo nome da tag"
                            className="ds-control min-h-11 min-w-0 flex-1 bg-[var(--surface)] px-3"
                            disabled={renamingId === tag.id}
                          />
                          <button
                            type="submit"
                            disabled={
                              renamingId === tag.id ||
                              !normalizeTagDisplayName(editing.name)
                            }
                            className="min-h-11 rounded-xl border border-[var(--border)] px-3 text-sm font-bold"
                          >
                            {renamingId === tag.id ? 'Salvando…' : 'Salvar'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditing(null)}
                            disabled={renamingId === tag.id}
                            className="min-h-11 px-2 text-sm text-[var(--text-muted)]"
                          >
                            Cancelar
                          </button>
                        </form>
                      ) : (
                        <>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <strong className="break-all text-sm text-[var(--foreground)]">
                                #{tag.name}
                              </strong>
                              <span className="rounded-full border border-[var(--border)] px-2 py-0.5 text-xs font-semibold text-[var(--text-muted)]">
                                {tag.isActive ? 'Ativa' : 'Arquivada'}
                              </span>
                            </div>
                            <p className="mt-1 text-xs text-[var(--text-muted)]">
                              {tag.transactionCount === 1
                                ? '1 transação vinculada'
                                : `${tag.transactionCount} transações vinculadas`}
                            </p>
                          </div>

                          <div className="flex flex-wrap items-center gap-1 self-end sm:self-auto">
                            <button
                              type="button"
                              onClick={() => void loadReport(tag)}
                              disabled={reportLoadingTagId !== null}
                              aria-label={`Relatório da tag ${tag.name}`}
                              className="grid min-h-11 min-w-11 place-items-center rounded-xl text-[var(--text-muted)] hover:bg-[var(--surface-subtle)] hover:text-[var(--foreground)] disabled:opacity-50"
                            >
                              <FaChartBar aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditing({ id: tag.id, name: tag.name })}
                              disabled={renamingId !== null}
                              aria-label={`Renomear tag ${tag.name}`}
                              className="grid min-h-11 min-w-11 place-items-center rounded-xl text-[var(--text-muted)] hover:bg-[var(--surface-subtle)] hover:text-[var(--foreground)] disabled:opacity-50"
                            >
                              <FaEdit aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              onClick={() => void toggleArchive(tag)}
                              disabled={lifecycleId !== null}
                              aria-label={
                                tag.isActive
                                  ? `Arquivar tag ${tag.name}`
                                  : `Reativar tag ${tag.name}`
                              }
                              className="grid min-h-11 min-w-11 place-items-center rounded-xl text-[var(--text-muted)] hover:bg-[var(--surface-subtle)] hover:text-[var(--foreground)] disabled:opacity-50"
                            >
                              {tag.isActive ? (
                                <FaArchive aria-hidden="true" />
                              ) : (
                                <FaUndo aria-hidden="true" />
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteCandidate(tag)}
                              disabled={tag.transactionCount > 0 || deletingId !== null}
                              aria-label={
                                tag.transactionCount > 0
                                  ? `Não é possível excluir ${tag.name}; arquive para preservar o histórico`
                                  : `Excluir tag ${tag.name}`
                              }
                              title={
                                tag.transactionCount > 0
                                  ? 'Tag em uso: arquive para preservar o histórico'
                                  : 'Excluir permanentemente'
                              }
                              className="grid min-h-11 min-w-11 place-items-center rounded-xl text-[var(--text-muted)] hover:bg-[var(--danger-subtle)] hover:text-[var(--expense)] disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              <FaTrash aria-hidden="true" />
                            </button>
                          </div>
                        </>
                      )}

                      {actionFeedbackTagId === tag.id && (notice || actionError) ? (
                        <p
                          role={actionError ? 'alert' : 'status'}
                          className={
                            actionError
                              ? 'basis-full rounded-xl border border-[var(--expense)]/35 bg-[var(--danger-subtle)] p-3 text-sm text-[var(--expense)]'
                              : 'basis-full rounded-xl border border-[var(--border)] bg-[var(--surface-subtle)] p-3 text-sm text-[var(--foreground)]'
                          }
                        >
                          {actionError || notice}
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}

              {!loadingTags && !listError && totalPages > 1 ? (
                <nav
                  className="mt-4 flex items-center justify-between gap-3 border-t border-[var(--border)] pt-4"
                  aria-label="Paginação de tags"
                >
                  <button
                    type="button"
                    onClick={() => changePage(Math.max(1, page - 1))}
                    disabled={page <= 1}
                    className="min-h-11 rounded-xl border border-[var(--border)] px-3 text-sm font-bold disabled:opacity-40"
                  >
                    Anterior
                  </button>
                  <span className="text-xs font-semibold text-[var(--text-muted)]">
                    Página {page} de {totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => changePage(Math.min(totalPages, page + 1))}
                    disabled={page >= totalPages}
                    className="min-h-11 rounded-xl border border-[var(--border)] px-3 text-sm font-bold disabled:opacity-40"
                  >
                    Próxima
                  </button>
                </nav>
              ) : null}
            </section>
          </div>

          <aside className="ds-panel h-fit p-4" aria-labelledby="tag-report-title">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 id="tag-report-title" className="font-bold">
                  Relatório por tag
                </h2>
                <p className="mt-1 text-xs font-semibold text-[var(--text-muted)]">
                  Todo o histórico
                </p>
              </div>
              {report && !reportLoadingTagId ? (
                <Link
                  href={`/transacoes?tagId=${encodeURIComponent(report.tag.id)}`}
                  className="inline-flex min-h-11 shrink-0 items-center text-sm font-semibold text-[var(--orbit-primary)]"
                >
                  Abrir transações
                </Link>
              ) : null}
            </div>

            <p className="mt-3 text-xs leading-relaxed text-[var(--text-muted)]">
              Tags podem se sobrepor na mesma transação. Por isso, totais de tags diferentes
              não devem ser somados entre si.
            </p>

            {reportLoadingTagId ? (
              <p className="mt-4 text-sm text-[var(--text-muted)]">
                Carregando relatório
                {selectedReportTag ? ` de #${selectedReportTag.name}` : ''}…
              </p>
            ) : reportError ? (
              <div className="mt-4 rounded-xl border border-[var(--expense)]/35 bg-[var(--danger-subtle)] p-3">
                <p role="alert" className="text-sm text-[var(--expense)]">
                  {reportError}
                </p>
                {selectedReportTag ? (
                  <button
                    type="button"
                    onClick={() => void loadReport(selectedReportTag)}
                    className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl border border-[var(--border)] px-3 text-sm font-bold text-[var(--foreground)]"
                  >
                    <FaRedo aria-hidden="true" />
                    Tentar novamente
                  </button>
                ) : null}
              </div>
            ) : !report ? (
              <p className="mt-4 text-sm text-[var(--text-muted)]">
                Selecione o ícone de relatório de uma tag para ver receitas e despesas
                concluídas, separadas por moeda.
              </p>
            ) : (
              <div className="mt-4 space-y-3">
                <strong className="block break-all">#{report.tag.name}</strong>
                {report.currencies.length === 0 ? (
                  <p className="text-sm text-[var(--text-muted)]">
                    Sem transações concluídas nesta tag.
                  </p>
                ) : (
                  report.currencies.map((item) => (
                    <dl
                      key={item.currency}
                      className="rounded-xl border border-[var(--border)] p-3 text-sm"
                    >
                      <div className="flex justify-between gap-3">
                        <dt>Moeda</dt>
                        <dd className="font-bold">{item.currency}</dd>
                      </div>
                      <div className="mt-2 flex justify-between gap-3">
                        <dt>Transações</dt>
                        <dd>{item.transactionCount}</dd>
                      </div>
                      <div className="mt-2 flex justify-between gap-3">
                        <dt>Receitas</dt>
                        <dd>
                          {showValues
                            ? formatCurrency(item.income, item.currency)
                            : '••••'}
                        </dd>
                      </div>
                      <div className="mt-2 flex justify-between gap-3">
                        <dt>Despesas</dt>
                        <dd>
                          {showValues
                            ? formatCurrency(item.expense, item.currency)
                            : '••••'}
                        </dd>
                      </div>
                      <div className="mt-2 flex justify-between gap-3 border-t border-[var(--border)] pt-2">
                        <dt>Resultado</dt>
                        <dd className="font-bold">
                          {showValues
                            ? formatCurrency(item.balance, item.currency)
                            : '••••'}
                        </dd>
                      </div>
                    </dl>
                  ))
                )}
              </div>
            )}
          </aside>
        </section>

        <ConfirmationModal
          isOpen={deleteCandidate !== null}
          onClose={() => {
            if (!deletingId) setDeleteCandidate(null);
          }}
          onConfirm={() => void removeTag()}
          title="Excluir tag permanentemente?"
          message={
            deleteCandidate
              ? `#${deleteCandidate.name} não possui transações vinculadas e será removida do catálogo.`
              : ''
          }
          confirmText="Excluir tag"
          isLoading={deletingId !== null}
          dangerNotice="Esta ação é irreversível. Tags em uso não podem ser excluídas; devem ser arquivadas."
        />
      </div>
    </ProtectedRoute>
  );
}
