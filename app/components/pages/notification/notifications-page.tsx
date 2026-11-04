'use client';

import Link from 'next/link';
import { useCallback, useState } from 'react';
import { FaCheckDouble, FaExclamationCircle, FaInfoCircle, FaTimes } from 'react-icons/fa';

import { PageContainer, PageTitle } from '@/app/components/base-pages';
import { pageBarButtonProps } from '@/app/components/base-pages/page-bar';
import { Alert, PageEmpty, PageError } from '@/app/components/feedback';
import { ProtectedRoute } from '@/app/components/layout';
import Pagination from '@/app/components/navigation/pagination';
import { relativeTimeLabel, SEVERITY_LABEL } from '@/app/components/pages/notification/notification-model';
import { Button, Chip, IconButton } from '@/app/components/ui';
import { useNotifications } from '@/app/context';
import { usePaginatedList } from '@/app/hooks/use-paginated-list';
import { errorMessage } from '@/app/lib/error-message';
import { notificationService } from '@/app/services/notification-service';
import type { NotificationDTO, NotificationSeverity } from '@/app/types/notification';

const SEVERITY_STYLE: Record<NotificationSeverity, { border: string; icon: string }> = {
  URGENT: { border: 'border-l-[var(--expense)]', icon: 'text-[var(--expense)]' },
  WARNING: { border: 'border-l-[var(--warning)]', icon: 'text-[var(--warning)]' },
  INFO: { border: 'border-l-[var(--info)]', icon: 'text-[var(--info)]' },
};

export default function NotificationsPage() {
  const { unreadCount, setUnreadCount } = useNotifications();
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [pageSize, setPageSize] = useState(20);
  const [actionError, setActionError] = useState('');
  const [markingAll, setMarkingAll] = useState(false);

  const fetchNotifications = useCallback(
    async (page: number) => {
      const { data } = await notificationService.list({ page, pageSize, unreadOnly });
      // A lista já traz o contador atual: o sino acompanha sem outra chamada.
      setUnreadCount(data.unreadCount);
      return data;
    },
    [pageSize, setUnreadCount, unreadOnly],
  );

  const { items, setItems, total, setTotal, totalPages, page, setPage, loading, error, reload } =
    usePaginatedList<NotificationDTO>({
      fetchPage: fetchNotifications,
      fallbackError: 'Não foi possível carregar os avisos.',
    });

  function markReadLocally(id: string) {
    const readAt = new Date().toISOString();
    setItems((current) => current.map((item) => (item.id === id ? { ...item, readAt } : item)));
  }

  /** O link já navega; aqui só se registra a leitura, sem travar a navegação. */
  function openNotification(item: NotificationDTO) {
    if (item.readAt) return;
    markReadLocally(item.id);
    setUnreadCount(Math.max(0, unreadCount - 1));
    void notificationService.markRead(item.id).catch(() => undefined);
  }

  async function markAllRead() {
    if (markingAll || unreadCount === 0) return;
    setMarkingAll(true);
    setActionError('');
    try {
      await notificationService.markAllRead();
      setUnreadCount(0);
      if (unreadOnly) reload();
      else {
        const readAt = new Date().toISOString();
        setItems((current) => current.map((item) => ({ ...item, readAt: item.readAt ?? readAt })));
      }
    } catch (caught) {
      setActionError(errorMessage(caught, 'Não foi possível marcar os avisos como lidos.'));
    } finally {
      setMarkingAll(false);
    }
  }

  async function dismiss(item: NotificationDTO) {
    setActionError('');
    try {
      await notificationService.dismiss(item.id);
      setItems((current) => current.filter((entry) => entry.id !== item.id));
      setTotal((current) => Math.max(0, current - 1));
      if (!item.readAt) setUnreadCount(Math.max(0, unreadCount - 1));
      if (items.length === 1 && page > 1) setPage(page - 1);
    } catch (caught) {
      setActionError(errorMessage(caught, 'Não foi possível remover o aviso.'));
    }
  }

  function changeFilter(next: boolean) {
    if (next === unreadOnly) return;
    setPage(1);
    setUnreadOnly(next);
  }

  return (
    <ProtectedRoute>
      <PageTitle
        title="Avisos"
        sidebarAligned
        actions={
          <Button
            variant="outline"
            {...pageBarButtonProps}
            icon={<FaCheckDouble aria-hidden="true" />}
            onClick={() => void markAllRead()}
            disabled={markingAll || unreadCount === 0}
          >
            Marcar tudo como lido
          </Button>
        }
      />
      <PageContainer>
        <div className="mt-4 flex flex-wrap items-center gap-2" role="group" aria-label="Filtrar avisos">
          <Chip layoutId="notifications-filter" selected={!unreadOnly} onClick={() => changeFilter(false)}>
            Todos
          </Chip>
          <Chip layoutId="notifications-filter" selected={unreadOnly} onClick={() => changeFilter(true)}>
            Não lidos{unreadCount > 0 ? ` (${unreadCount})` : ''}
          </Chip>
        </div>

        {actionError && <Alert variant="error" message={actionError} />}

        {error ? (
          <PageError title="Não foi possível carregar os avisos" message={error} onRetry={reload} />
        ) : loading && items.length === 0 ? (
          <div className="mt-4 space-y-3" role="status" aria-label="Carregando avisos">
            {[0, 1, 2].map((index) => (
              <div key={index} className="h-20 animate-pulse rounded-[var(--radius-lg)] bg-[var(--skeleton)]" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="mt-4">
            <PageEmpty
              title={unreadOnly ? 'Nenhum aviso não lido' : 'Nenhum aviso por aqui'}
              description={
                unreadOnly
                  ? 'Você está em dia. Os avisos novos aparecem aqui e no sino.'
                  : 'Os avisos de vencimento, orçamento e saldo chegam por volta das 8h. Você escolhe quais receber em Usuário, Preferências.'
              }
            />
          </div>
        ) : (
          <ul
            className={`mt-4 space-y-3 transition-opacity ${loading ? 'opacity-60' : ''}`}
            aria-busy={loading}
            aria-label="Lista de avisos"
          >
            {items.map((item) => {
              const style = SEVERITY_STYLE[item.severity];
              const unread = item.readAt === null;
              const Icon = item.severity === 'INFO' ? FaInfoCircle : FaExclamationCircle;
              return (
                <li
                  key={item.id}
                  className={`flex items-stretch gap-1 rounded-[var(--radius-lg)] border border-l-4 border-[var(--border)] bg-[var(--surface)] ${style.border} ${unread ? '' : 'opacity-80'}`}
                >
                  <Link
                    href={item.href}
                    onClick={() => openNotification(item)}
                    className="flex min-w-0 flex-1 items-start gap-3 rounded-[var(--radius-lg)] p-3.5 transition-colors hover:bg-[var(--surface-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)] sm:p-4"
                  >
                    <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${style.icon}`} aria-hidden="true" />
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-x-2">
                        <span className={`text-base text-[var(--foreground)] ${unread ? 'font-semibold' : 'font-medium'}`}>
                          {item.title}
                        </span>
                        {unread && (
                          <span className="rounded-full bg-[var(--primary-subtle)] px-2 py-0.5 text-xs font-semibold text-[var(--primary)]">
                            Novo
                          </span>
                        )}
                      </span>
                      <span className="mt-1 block text-sm leading-relaxed text-[var(--text-muted)]">{item.body}</span>
                      <span className="mt-1.5 block text-xs text-[var(--text-subtle)]">
                        {SEVERITY_LABEL[item.severity]} · {relativeTimeLabel(item.createdAt)}
                      </span>
                    </span>
                  </Link>
                  <IconButton
                    label={`Remover aviso: ${item.title}`}
                    title="Remover"
                    icon={<FaTimes />}
                    onClick={() => void dismiss(item)}
                    className="m-1.5 self-start"
                  />
                </li>
              );
            })}
          </ul>
        )}

        <div className="mt-4">
          <Pagination
            page={page}
            pageSize={pageSize}
            total={total}
            totalPages={totalPages}
            loading={loading}
            pageSizeOptions={[10, 20, 50]}
            onPageChange={setPage}
            onPageSizeChange={(nextPageSize) => {
              setPageSize(nextPageSize);
              setPage(1);
            }}
          />
        </div>
      </PageContainer>
    </ProtectedRoute>
  );
}
