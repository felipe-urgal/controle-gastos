'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { NewPage } from '@/app/components/base-pages';
import { TransactionForm } from '@/app/components/pages/transactions';
import TransferForm from '@/app/components/pages/transactions/transfer-form';
import { useAuth } from '@/app/context';
import { FormData } from '@/app/lib/interface/transaction.interface';
import {
  clearOfflineTransactionDraft,
  offlineDraftToFormData,
  readOfflineTransactionDraft,
  type OfflineTransactionDraft,
} from '@/app/lib/pwa/offline-transaction-draft';
import {
  readOfflineTransactionQueue,
  rekeyOfflineTransactionQueueItem,
  removeOfflineTransactionQueueItem,
  syncOfflineTransactionQueueItem,
  type OfflineTransactionQueueItem,
} from '@/app/lib/pwa/offline-transaction-queue';
import { logicalDateFromUtcInstant } from '@/app/lib/date/logical-date';
import { templateToTransactionInitialValues } from '@/app/lib/templates/transaction-template-mapping';
import { getDuplicateTransactionValues } from '@/app/lib/transactions/transaction-quick-actions';
import { transactionService } from '@/app/services/transaction-service';
import { transactionTemplateService } from '@/app/services/transaction-template-service';
import type { TransactionTemplateDTO } from '@/app/types/transaction-template';

type ComposeMode = 'transaction' | 'transfer';
type CategoryType = 'INCOME' | 'EXPENSE';

interface NewProps {
  duplicateId?: string;
  templateId?: string;
  initialMode?: ComposeMode;
  initialCategoryType?: CategoryType;
}

function draftAmountLabel(amount: number) {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount / 100);
}

export default function New({
  duplicateId,
  templateId,
  initialMode = 'transaction',
  initialCategoryType = 'EXPENSE',
}: NewProps) {
  const router = useRouter();
  const { user, requireReauthentication } = useAuth();
  const [initialValues, setInitialValues] = useState<FormData>();
  const [loadingDuplicate, setLoadingDuplicate] = useState(Boolean(duplicateId || templateId));
  const [duplicateError, setDuplicateError] = useState<string | null>(null);
  const [templateWarnings, setTemplateWarnings] = useState<string[]>([]);
  const [favoriteTemplates, setFavoriteTemplates] = useState<TransactionTemplateDTO[]>([]);
  const [favoriteTemplatesLoading, setFavoriteTemplatesLoading] = useState(false);
  const [favoriteTemplatesError, setFavoriteTemplatesError] = useState<string | null>(null);
  const [composeMode, setComposeMode] = useState<ComposeMode>(duplicateId || templateId ? 'transaction' : initialMode);
  const [preferredCategoryType, setPreferredCategoryType] = useState<CategoryType | null>(initialCategoryType);
  const [offlineDraft, setOfflineDraft] = useState<OfflineTransactionDraft | null>(null);
  const [offlineQueue, setOfflineQueue] = useState<OfflineTransactionQueueItem[]>([]);
  const [queueSyncingId, setQueueSyncingId] = useState<string | null>(null);
  const [queueMessage, setQueueMessage] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const [now, setNow] = useState(0);
  const [loadedOfflineDraftId, setLoadedOfflineDraftId] = useState<string | null>(null);
  const [formRevision, setFormRevision] = useState(0);
  const isDuplicating = Boolean(duplicateId);
  const isUsingTemplate = Boolean(templateId);
  const isTransfer = !isDuplicating && composeMode === 'transfer';
  const canUseOfflineDraft = !isDuplicating && !isUsingTemplate;
  const pendingQueueCount = offlineQueue.filter(
    (item) => item.status !== 'synced',
  ).length;

  useEffect(() => {
    if (!duplicateId && !templateId) return;

    let cancelled = false;

    async function loadSource() {
      setLoadingDuplicate(true);
      setDuplicateError(null);

      try {
        if (duplicateId) {
          const response = await transactionService.getById(duplicateId);
          if (!cancelled) {
            setInitialValues(getDuplicateTransactionValues(response.data));
            setPreferredCategoryType(response.data.type);
          }
        } else if (templateId) {
          const response = await transactionTemplateService.getById(templateId);
          const template = response.data;
          const today = logicalDateFromUtcInstant(new Date());
          const prepared = templateToTransactionInitialValues(template, today);
          if (!cancelled) {
            setInitialValues(prepared.values);
            setTemplateWarnings(prepared.warnings);
            setPreferredCategoryType(template.type);
          }
        }
      } catch (error) {
        if (!cancelled) {
          setDuplicateError(
            error instanceof Error
              ? error.message
              : 'Não foi possível carregar os dados iniciais',
          );
        }
      } finally {
        if (!cancelled) setLoadingDuplicate(false);
      }
    }

    void loadSource();
    return () => { cancelled = true; };
  }, [duplicateId, templateId]);

  useEffect(() => {
    if (!user?.id || isDuplicating || isUsingTemplate) return;

    let cancelled = false;

    async function loadFavoriteTemplates() {
      setFavoriteTemplatesLoading(true);
      setFavoriteTemplatesError(null);
      try {
        const response = await transactionTemplateService.getAll({
          isFavorite: true,
          limit: 3,
        });
        if (!cancelled) setFavoriteTemplates(response.data.items);
      } catch (error) {
        if (!cancelled) {
          setFavoriteTemplatesError(
            error instanceof Error
              ? error.message
              : 'Não foi possível carregar os Modelos favoritos',
          );
        }
      } finally {
        if (!cancelled) setFavoriteTemplatesLoading(false);
      }
    }

    void loadFavoriteTemplates();
    return () => {
      cancelled = true;
    };
  }, [isDuplicating, isUsingTemplate, user?.id]);

  useEffect(() => {
    if (!user?.id || !canUseOfflineDraft) return;

    const draft = readOfflineTransactionDraft(user.id);
    let cancelled = false;

    queueMicrotask(() => {
      if (!cancelled) setOfflineDraft(draft);
    });

    return () => {
      cancelled = true;
    };
  }, [canUseOfflineDraft, user?.id]);

  function refreshOfflineQueue() {
    if (!user?.id) {
      setOfflineQueue([]);
      return;
    }
    setOfflineQueue(readOfflineTransactionQueue(user.id));
  }

  useEffect(() => {
    let cancelled = false;
    const items = user?.id ? readOfflineTransactionQueue(user.id) : [];

    queueMicrotask(() => {
      if (!cancelled) setOfflineQueue(items);
    });

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  useEffect(() => {
    let cancelled = false;
    const updateOnlineState = () => {
      if (!cancelled) setIsOnline(navigator.onLine);
    };

    queueMicrotask(updateOnlineState);
    window.addEventListener('online', updateOnlineState);
    window.addEventListener('offline', updateOnlineState);

    return () => {
      cancelled = true;
      window.removeEventListener('online', updateOnlineState);
      window.removeEventListener('offline', updateOnlineState);
    };
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  async function syncQueuedTransaction(item: OfflineTransactionQueueItem) {
    if (!user?.id || !isOnline || queueSyncingId) return;

    setQueueSyncingId(item.id);
    setQueueMessage(null);
    try {
      await syncOfflineTransactionQueueItem(
        user.id,
        item.id,
        (payload, idempotencyKey) =>
          transactionService.createIdempotent(payload, idempotencyKey),
      );

      if (item.sourceDraftId) {
        const currentDraft = readOfflineTransactionDraft(user.id);
        if (currentDraft?.id === item.sourceDraftId) {
          clearOfflineTransactionDraft(user.id);
          setOfflineDraft(null);
          setLoadedOfflineDraftId(null);
        }
      }

      setQueueMessage('Lançamento sincronizado com sucesso.');
    } catch (error) {
      setQueueMessage(
        error instanceof Error
          ? error.message
          : 'Não foi possível sincronizar o lançamento.',
      );
    } finally {
      setQueueSyncingId(null);
      refreshOfflineQueue();
    }
  }

  function discardQueuedTransaction(item: OfflineTransactionQueueItem) {
    if (!user?.id || queueSyncingId) return;
    removeOfflineTransactionQueueItem(user.id, item.id);
    setQueueMessage(
      'Lançamento pendente descartado.',
    );
    refreshOfflineQueue();
  }

  async function resolveConflictAsNew(item: OfflineTransactionQueueItem) {
    if (!user?.id || !isOnline || queueSyncingId) return;

    try {
      const rekeyed = rekeyOfflineTransactionQueueItem(user.id, item.id);
      refreshOfflineQueue();
      await syncQueuedTransaction(rekeyed);
    } catch (error) {
      setQueueMessage(
        error instanceof Error
          ? error.message
          : 'Não foi possível recriar o lançamento com uma nova chave.',
      );
      refreshOfflineQueue();
    }
  }

  function reauthenticateForQueue() {
    requireReauthentication();
  }

  function continueOfflineDraft() {
    if (!offlineDraft) return;

    setInitialValues(offlineDraftToFormData(offlineDraft));
    setPreferredCategoryType(offlineDraft.type);
    setComposeMode('transaction');
    setLoadedOfflineDraftId(offlineDraft.id);
    setFormRevision((current) => current + 1);
  }

  function discardOfflineDraft() {
    if (!user?.id) return;

    clearOfflineTransactionDraft(user.id);
    setOfflineDraft(null);

    if (loadedOfflineDraftId) {
      setInitialValues(undefined);
      setLoadedOfflineDraftId(null);
      setPreferredCategoryType(initialCategoryType);
      setFormRevision((current) => current + 1);
    }
  }

  function handleOfflineDraftSaved() {
    if (!user?.id || !loadedOfflineDraftId) return;

    clearOfflineTransactionDraft(user.id);
    setOfflineDraft(null);
    setLoadedOfflineDraftId(null);
    router.replace('/transacoes');
  }

  return (
    <NewPage
      backUrl="/transacoes"
      title={isDuplicating ? 'Duplicar transação' : isUsingTemplate ? 'Usar modelo' : isTransfer ? 'Nova transferência' : 'Nova transação'}
      description={
        isDuplicating
          ? 'Revise os dados copiados e confirme somente quando o novo lançamento estiver correto.'
          : isUsingTemplate
            ? 'O modelo apenas preenche o formulário. Revise os dados antes de salvar.'
          : isTransfer
            ? 'Mova saldo entre contas próprias sem criar receita ou despesa operacional.'
            : 'Crie sua transação em poucos segundos.'
      }
    >
      {!isDuplicating && !isUsingTemplate && !isTransfer && (
        <section
          className="mt-4 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-4"
          aria-labelledby="favorite-transaction-templates-heading"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2
                id="favorite-transaction-templates-heading"
                className="text-sm font-extrabold text-[var(--foreground)]"
              >
                Modelos favoritos
              </h2>
              <p className="mt-1 text-xs text-[var(--text-muted)]">
                Atalhos para preencher o formulário. Nada é lançado automaticamente.
              </p>
            </div>
            <Link
              href="/modelos"
              className="inline-flex min-h-11 items-center rounded-full border border-[var(--border-strong)] px-3 text-xs font-bold text-[var(--foreground)]"
            >
              Gerenciar modelos
            </Link>
          </div>

          {favoriteTemplatesLoading ? (
            <p className="mt-3 text-xs text-[var(--text-muted)]">
              Carregando favoritos…
            </p>
          ) : favoriteTemplatesError ? (
            <p className="mt-3 text-xs text-[var(--text-muted)]" role="status">
              Favoritos indisponíveis no momento. Você pode continuar criando a transação normalmente.
            </p>
          ) : favoriteTemplates.length > 0 ? (
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              {favoriteTemplates.map((template) => (
                <Link
                  key={template.id}
                  href={`/transacoes/nova?template=${encodeURIComponent(template.id)}`}
                  className="flex min-h-11 min-w-0 items-center justify-between gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 text-sm font-semibold text-[var(--foreground)]"
                >
                  <span className="truncate">{template.name}</span>
                  <span className="shrink-0 text-xs text-[var(--text-muted)]">
                    {template.type === 'EXPENSE' ? 'Despesa' : 'Receita'}
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-xs text-[var(--text-muted)]">
              Favorite um Modelo para acessar aqui com um toque.
            </p>
          )}
        </section>
      )}

      {offlineQueue.length > 0 && !isTransfer && (
        <section
          className="mt-4 rounded-[var(--radius-lg)] border border-[var(--border-strong)] bg-[var(--surface)] p-4"
          aria-label="Fila de sincronização"
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-extrabold text-[var(--foreground)]">
                {pendingQueueCount > 0
                  ? pendingQueueCount === 1
                    ? '1 lançamento aguardando sincronização'
                    : `${pendingQueueCount} lançamentos aguardando sincronização`
                  : 'Nenhum lançamento pendente'}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-[var(--text-muted)]">
                O envio é manual. Cada retry reutiliza a mesma chave para evitar duplicidade.
              </p>
            </div>
            <span className="text-xs font-bold text-[var(--text-muted)]">
              {isOnline ? 'Online' : 'Sem conexão'}
            </span>
          </div>

          <div className="mt-3 space-y-2">
            {offlineQueue.map((item) => (
              <div
                key={item.id}
                className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-raised)] p-3"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[var(--foreground)]">
                      {item.payload.description}
                    </p>
                    <p className="mt-1 text-xs text-[var(--text-muted)]">
                      {draftAmountLabel(item.payload.amount)} ·{' '}
                      {item.payload.type === 'EXPENSE' ? 'Despesa' : 'Receita'} ·{' '}
                      {item.status === 'error'
                        ? item.failureKind === 'auth'
                          ? 'Sessão expirada'
                          : item.failureKind === 'idempotency_conflict'
                            ? 'Conflito de idempotência'
                            : item.failureKind === 'business_conflict'
                              ? 'Conflito de negócio'
                              : item.failureKind === 'validation'
                                ? 'Precisa de revisão'
                                : item.failureKind === 'rate_limit'
                                  ? 'Aguarde para tentar novamente'
                                  : item.failureKind === 'network'
                                    ? 'Falha de conexão'
                                    : item.failureKind === 'server'
                                      ? 'Falha do servidor'
                                      : 'Erro'
                        : item.status === 'synced'
                          ? 'Sincronizado'
                          : item.status === 'sending'
                            ? 'Enviando'
                            : 'Pendente'}
                    </p>
                    {item.retryAfterAt && now < Date.parse(item.retryAfterAt) && (
                      <p className="mt-1 text-xs text-[var(--text-muted)]">
                        Nova tentativa disponível após {new Date(item.retryAfterAt).toLocaleTimeString('pt-BR')}.
                      </p>
                    )}
                    {item.lastError && (
                      <p className="mt-1 text-xs text-[var(--expense)]">
                        {item.lastError}
                      </p>
                    )}
                  </div>

                  <div className="flex shrink-0 flex-wrap gap-2">
                    {item.status === 'synced' ? (
                      <button
                        type="button"
                        onClick={() => discardQueuedTransaction(item)}
                        disabled={Boolean(queueSyncingId)}
                        className="min-h-9 rounded-full border border-[var(--border-strong)] px-3 text-xs font-bold text-[var(--foreground)] disabled:opacity-50"
                      >
                        Limpar
                      </button>
                    ) : item.failureKind === 'auth' ? (
                      <>
                        <button
                          type="button"
                          onClick={reauthenticateForQueue}
                          disabled={Boolean(queueSyncingId)}
                          className="min-h-9 rounded-full bg-[var(--orbit-primary)] px-3 text-xs font-bold text-white disabled:opacity-50"
                        >
                          Entrar novamente
                        </button>
                        <button
                          type="button"
                          onClick={() => discardQueuedTransaction(item)}
                          disabled={Boolean(queueSyncingId)}
                          className="min-h-9 rounded-full border border-[var(--border-strong)] px-3 text-xs font-bold text-[var(--foreground)] disabled:opacity-50"
                        >
                          Descartar
                        </button>
                      </>
                    ) : item.failureKind === 'idempotency_conflict' && item.errorCode === 'IDEMPOTENCY_PAYLOAD_CONFLICT' ? (
                      <>
                        <button
                          type="button"
                          onClick={() => void resolveConflictAsNew(item)}
                          disabled={!isOnline || Boolean(queueSyncingId)}
                          className="min-h-9 rounded-full bg-[var(--orbit-primary)] px-3 text-xs font-bold text-white disabled:opacity-50"
                        >
                          Criar como novo
                        </button>
                        <button
                          type="button"
                          onClick={() => discardQueuedTransaction(item)}
                          disabled={Boolean(queueSyncingId)}
                          className="min-h-9 rounded-full border border-[var(--border-strong)] px-3 text-xs font-bold text-[var(--foreground)] disabled:opacity-50"
                        >
                          Descartar
                        </button>
                      </>
                    ) : (
                      <>
                        {(item.failureKind === 'validation' || item.failureKind === 'business_conflict' || item.failureKind === 'conflict') ? (
                          <span className="text-xs text-[var(--text-muted)]">Este lançamento exige revisão antes de uma nova tentativa. Descarte-o somente após conferir os dados.</span>
                        ) : (
                        <button
                          type="button"
                          onClick={() => void syncQueuedTransaction(item)}
                          disabled={!isOnline || Boolean(queueSyncingId) || Boolean(item.retryAfterAt && now < Date.parse(item.retryAfterAt))}
                          className="min-h-9 rounded-full bg-[var(--orbit-primary)] px-3 text-xs font-bold text-white disabled:opacity-50"
                        >
                          {queueSyncingId === item.id ? 'Sincronizando...' : 'Sincronizar'}
                        </button>
                        )
                        <button
                          type="button"
                          onClick={() => discardQueuedTransaction(item)}
                          disabled={Boolean(queueSyncingId)}
                          className="min-h-9 rounded-full border border-[var(--border-strong)] px-3 text-xs font-bold text-[var(--foreground)] disabled:opacity-50"
                        >
                          Descartar
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {queueMessage && (
            <p className="mt-3 text-xs font-medium text-[var(--text-muted)]" role="status">
              {queueMessage}
            </p>
          )}
        </section>
      )}

      {offlineDraft && canUseOfflineDraft && !isTransfer && (
        <section
          role="status"
          className="mt-4 rounded-[var(--radius-lg)] border border-[var(--orbit-primary)]/35 bg-[var(--orbit-primary-subtle)] p-4"
          aria-label="Rascunho offline"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-extrabold text-[var(--foreground)]">
                {loadedOfflineDraftId === offlineDraft.id
                  ? 'Rascunho offline carregado'
                  : 'Rascunho offline encontrado'}
              </p>
              <p className="mt-1 text-sm text-[var(--text-muted)]">
                {offlineDraft.description} · {draftAmountLabel(offlineDraft.amount)} ·{' '}
                {offlineDraft.type === 'EXPENSE' ? 'Despesa' : 'Receita'}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-[var(--text-muted)]">
                Nada será enviado automaticamente. Revise os dados, escolha conta e categoria e confirme a criação normalmente.
              </p>
            </div>

            <div className="flex shrink-0 flex-wrap gap-2">
              {loadedOfflineDraftId !== offlineDraft.id && (
                <button
                  type="button"
                  onClick={continueOfflineDraft}
                  className="min-h-10 rounded-full bg-[var(--orbit-primary)] px-4 text-sm font-bold text-white"
                >
                  Continuar rascunho
                </button>
              )}
              <button
                type="button"
                onClick={discardOfflineDraft}
                className="min-h-10 rounded-full border border-[var(--border-strong)] px-4 text-sm font-bold text-[var(--foreground)]"
              >
                Descartar
              </button>
            </div>
          </div>
        </section>
      )}

      {templateWarnings.length > 0 && isUsingTemplate && (
        <section
          role="status"
          aria-label="Referências do modelo"
          className="mt-4 grid gap-2"
        >
          {templateWarnings.map((warning) => (
            <p
              key={warning}
              className="rounded-[var(--radius-md)] border border-[var(--warning)]/35 bg-[var(--warning-subtle)] p-3 text-sm font-medium text-[var(--foreground)]"
            >
              {warning}
            </p>
          ))}
        </section>
      )}

      {loadingDuplicate ? (
        <div
          role="status"
          className="mt-4 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-6 text-center text-sm text-[var(--text-muted)]"
        >
          Carregando dados da transação...
        </div>
      ) : duplicateError ? (
        <div
          role="alert"
          className="mt-4 rounded-[var(--radius-lg)] border border-[var(--danger)]/35 bg-[var(--danger-subtle)] p-4 text-sm font-medium text-[var(--expense)]"
        >
          {duplicateError}
        </div>
      ) : isTransfer ? (
        <TransferForm
          onSelectTransactionType={(type) => {
            setPreferredCategoryType(type);
            setComposeMode('transaction');
          }}
        />
      ) : (
        <TransactionForm
          key={`transaction-form-${formRevision}`}
          isEditing={false}
          initialValues={initialValues}
          initialCategoryType={preferredCategoryType}
          onSuccess={loadedOfflineDraftId ? handleOfflineDraftSaved : undefined}
          offlineOwnerUserId={user?.id}
          offlineDraftId={loadedOfflineDraftId}
          onOfflineQueueChanged={refreshOfflineQueue}
          onCancelOverride={
            loadedOfflineDraftId ? () => router.replace('/transacoes') : undefined
          }
          onSelectTransfer={isDuplicating ? undefined : () => setComposeMode('transfer')}
        />
      )}
    </NewPage>
  );
}
