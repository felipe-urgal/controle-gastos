'use client';

import { ListPageHeader, PageContainer } from '@/app/components/base-pages';
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FaArchive,
  FaEdit,
  FaRedo,
  FaSearch,
  FaTrash,
  FaUndo,
} from 'react-icons/fa';

import { ProtectedRoute } from '@/app/components/layout';
import { Alert } from '@/app/components/feedback';
import TagReportPanel from '@/app/components/pages/tags/tag-report-panel';
import { monthExpenseLabel, statusFilterParam, type TagStatusFilter } from '@/app/components/pages/tags/tags-model';
import { Button, IconButton, Input, Select } from '@/app/components/ui';
import { ModalShell } from '@/app/components/overlays/modal-shell';
import ConfirmationModal from '@/app/components/overlays/confirmation-modal';
import { useAuth } from '@/app/context';
import { formatCurrency } from '@/app/lib/currency/format-currency';
import { normalizeTagDisplayName } from '@/app/lib/tags/tag-name';
import { ApiClientError } from '@/app/services/api-client';
import { tagService } from '@/app/services/tag-service';
import type { TagDTO, TagReport, TagReportPeriod } from '@/app/types/tag';

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
  const [createOpen, setCreateOpen] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
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

  const [statusFilter, setStatusFilter] = useState<TagStatusFilter>('all');
  const [reportPeriod, setReportPeriod] = useState<TagReportPeriod>('all');
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
        isActive: statusFilterParam(statusFilter),
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
  }, [page, search, statusFilter]);

  useEffect(() => {
    let active = true;

    tagService
      .getAll({
        page,
        pageSize: TAG_PAGE_SIZE,
        search: search || undefined,
        isActive: statusFilterParam(statusFilter),
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
  }, [page, search, statusFilter]);

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

  // A busca roda ao digitar, com uma pequena espera para não consultar a cada tecla.
  function changeSearch(value: string) {
    setSearchDraft(value);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setLoadingTags(true);
      setListError('');
      setPage(1);
      setSearch(normalizeTagDisplayName(value));
    }, 300);
  }

  useEffect(() => () => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
  }, []);

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
      setCreateOpen(false);
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

  async function loadReport(tag: TagDTO, period: TagReportPeriod = reportPeriod) {
    setSelectedReportTagId(tag.id);
    setReportLoadingTagId(tag.id);
    setReportError('');
    setReport(null);
    try {
      const response = await tagService.report(tag.id, period);
      setReport(response.data);
    } catch (error) {
      setReportError(messageFromError(error, 'Erro ao carregar relatório'));
    } finally {
      setReportLoadingTagId(null);
    }
  }

  function selectTag(tag: TagDTO) {
    void loadReport(tag);
    if (window.matchMedia('(max-width: 1023px)').matches) {
      window.requestAnimationFrame(() => {
        const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        document.getElementById('tag-report')?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
      });
    }
  }

  function changeReportPeriod(period: TagReportPeriod) {
    setReportPeriod(period);
    if (selectedReportTag) void loadReport(selectedReportTag, period);
  }

  function changeStatusFilter(filter: TagStatusFilter) {
    setLoadingTags(true);
    setListError('');
    setPage(1);
    setStatusFilter(filter);
  }

  const statusOptions: Array<{ value: TagStatusFilter; label: string }> = [
    { value: 'all', label: 'Todas' },
    { value: 'active', label: 'Ativas' },
    { value: 'archived', label: 'Arquivadas' },
  ];

  return (
    <ProtectedRoute>
      <PageContainer>
        <ListPageHeader
          title="Tags"
          createLabel="Nova tag"
          onCreate={() => {
            setName('');
            setActionError('');
            setActionFeedbackTagId(null);
            setCreateOpen(true);
          }}
          controls={
            <div className="w-[10.5rem]">
              <Select
                ariaLabel="Filtrar tags"
                value={statusFilter}
                onChange={(value) => changeStatusFilter(value as TagStatusFilter)}
                options={statusOptions}
              />
            </div>
          }
        />

        {notice && actionFeedbackTagId === null ? <div className="mt-4"><Alert variant="info" message={notice} /></div> : null}
        {actionError && actionFeedbackTagId === null && !createOpen ? <div className="mt-4"><Alert variant="error" message={actionError} /></div> : null}

        <section className="mt-5 grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
          <section className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-surface)]" aria-labelledby="tag-list-title">
            <h2 id="tag-list-title" className="sr-only">Suas tags</h2>
            <div role="search">
              <Input
                value={searchDraft}
                onChange={(event) => changeSearch(event.target.value)}
                icon={<FaSearch aria-hidden="true" />}
                placeholder="Buscar tag pelo nome"
                aria-label="Buscar tags"
                type="search"
                enterKeyHint="search"
              />
            </div>

            {!loadingTags && !listError ? (
              <p className="mt-3 text-xs text-[var(--text-muted)]">
                {total === 1 ? '1 tag' : `${total} tags`}
                {search ? ` para “${search}”` : ''}. Toque numa tag para ver o relatório.
              </p>
            ) : null}

            {listError ? (
              <div className="mt-4 grid gap-2">
                <Alert variant="error" message={listError} />
                <Button variant="outline" size="sm" icon={<FaRedo aria-hidden="true" />} onClick={() => void loadTags()} disabled={loadingTags}>
                  Tentar novamente
                </Button>
              </div>
            ) : loadingTags ? (
              <p className="mt-4 text-sm text-[var(--text-muted)]">Carregando tags…</p>
            ) : tags.length === 0 ? (
              <p className="mt-4 text-sm text-[var(--text-muted)]">
                {search || statusFilter !== 'all' ? 'Nenhuma tag encontrada para esta busca.' : 'Nenhuma tag cadastrada. Use “Nova tag” para criar a primeira.'}
              </p>
            ) : (
              <ul className="mt-3 divide-y divide-[var(--border)] border-t border-[var(--border)]">
                {tags.map((tag) => {
                  const spent = monthExpenseLabel(tag.monthExpenses, (cents, currency) => (showValues ? formatCurrency(cents, currency) : '••••'));
                  const selected = selectedReportTagId === tag.id;
                  return (
                    <li key={tag.id} className={`flex flex-col gap-2 py-2 ${selected ? 'bg-[var(--primary-subtle)]' : ''}`}>
                      {editing?.id === tag.id ? (
                        <form onSubmit={saveRename} className="flex min-w-0 flex-1 flex-col gap-2 px-2 sm:flex-row">
                          <div className="min-w-0 flex-1">
                            <Input
                              autoFocus
                              value={editing.name}
                              onChange={(event) => setEditing({ id: tag.id, name: event.target.value })}
                              maxLength={41}
                              aria-label="Novo nome da tag"
                              enterKeyHint="done"
                              disabled={renamingId === tag.id}
                            />
                          </div>
                          <Button type="submit" variant="outline" size="sm" disabled={renamingId === tag.id || !normalizeTagDisplayName(editing.name)}>
                            {renamingId === tag.id ? 'Salvando…' : 'Salvar'}
                          </Button>
                          <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(null)} disabled={renamingId === tag.id}>Cancelar</Button>
                        </form>
                      ) : (
                        <div className="flex items-center justify-between gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => selectTag(tag)}
                            aria-label={`Relatório da tag ${tag.name}`}
                            aria-pressed={selected}
                            className="min-w-0 flex-1 justify-start text-left font-normal [&>span]:w-full [&>span]:justify-start"
                          >
                            <span className="grid min-w-0 gap-0.5 text-left">
                              <span className="flex min-w-0 items-center gap-2">
                                <strong className="min-w-0 truncate text-sm text-[var(--foreground)]" title={`#${tag.name}`}>#{tag.name}</strong>
                                {!tag.isActive && (
                                  <span className="shrink-0 rounded-full border border-[var(--border)] px-2 py-0.5 text-xs font-semibold text-[var(--text-muted)]">Arquivada</span>
                                )}
                              </span>
                              <span className="break-words text-xs leading-snug text-[var(--text-muted)]">
                                {tag.transactionCount === 1 ? '1 transação' : `${tag.transactionCount} transações`}
                                {spent ? <> · <span className="money">{spent}</span> no mês</> : null}
                              </span>
                            </span>
                          </Button>

                          <div className="flex shrink-0 items-center">
                            <IconButton label={`Renomear tag ${tag.name}`} icon={<FaEdit />} onClick={() => setEditing({ id: tag.id, name: tag.name })} disabled={renamingId !== null} />
                            <IconButton
                              label={tag.isActive ? `Arquivar tag ${tag.name}` : `Reativar tag ${tag.name}`}
                              icon={tag.isActive ? <FaArchive /> : <FaUndo />}
                              onClick={() => void toggleArchive(tag)}
                              disabled={lifecycleId !== null}
                            />
                            <IconButton
                              label={tag.transactionCount > 0 ? `Não é possível excluir ${tag.name}; arquive para preservar o histórico` : `Excluir tag ${tag.name}`}
                              title={tag.transactionCount > 0 ? 'Tag em uso: arquive para preservar o histórico' : 'Excluir permanentemente'}
                              tone="danger"
                              icon={<FaTrash />}
                              onClick={() => setDeleteCandidate(tag)}
                              disabled={tag.transactionCount > 0 || deletingId !== null}
                            />
                          </div>
                        </div>
                      )}

                      {actionFeedbackTagId === tag.id && (notice || actionError) ? (
                        <Alert variant={actionError ? 'error' : 'info'} message={actionError || notice} />
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}

            {!loadingTags && !listError && totalPages > 1 ? (
              <nav className="mt-4 flex items-center justify-between gap-3 border-t border-[var(--border)] pt-4" aria-label="Paginação de tags">
                <Button variant="outline" size="sm" onClick={() => changePage(Math.max(1, page - 1))} disabled={page <= 1}>Anterior</Button>
                <span className="text-xs font-semibold text-[var(--text-muted)]">Página {page} de {totalPages}</span>
                <Button variant="outline" size="sm" onClick={() => changePage(Math.min(totalPages, page + 1))} disabled={page >= totalPages}>Próxima</Button>
              </nav>
            ) : null}
          </section>

          <TagReportPanel
            tag={selectedReportTag}
            report={report}
            period={reportPeriod}
            loading={reportLoadingTagId !== null}
            error={reportError}
            showValues={showValues}
            onPeriodChange={changeReportPeriod}
            onRetry={() => selectedReportTag && void loadReport(selectedReportTag)}
          />
        </section>

        {createOpen && (
          <ModalShell title="Nova tag" onClose={() => setCreateOpen(false)} closeDisabled={creating} maxWidthClass="max-w-md">
            <form onSubmit={createTag} className="grid gap-4">
              <Input
                label="Nome da tag"
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={41}
                placeholder="Ex.: ferias-2026"
                enterKeyHint="done"
                autoFocus
                disabled={creating}
              />
              <p className="text-xs text-[var(--text-muted)]">Use tags para agrupar transações de um mesmo assunto, como uma viagem ou uma reforma.</p>
              {actionError ? <Alert variant="error" message={actionError} /> : null}
              <div className="grid grid-cols-2 gap-2">
                <Button type="button" variant="outline" disabled={creating} onClick={() => setCreateOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={creating || !normalizeTagDisplayName(name)}>
                  {creating ? 'Criando…' : 'Criar tag'}
                </Button>
              </div>
            </form>
          </ModalShell>
        )}

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
      </PageContainer>
    </ProtectedRoute>
  );
}
