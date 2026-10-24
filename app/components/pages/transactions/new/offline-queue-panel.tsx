'use client';

import { Button } from '@/app/components/ui';
import type { OfflineTransactionQueueItem } from '@/app/lib/pwa/offline-transaction-queue';

const MASKED_AMOUNT = '••••';

function amountLabel(amount: number) {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount / 100);
}

interface OfflineQueuePanelProps {
  items: OfflineTransactionQueueItem[];
  pendingCount: number;
  isOnline: boolean;
  now: number;
  showValues: boolean;
  syncingId: string | null;
  message: string | null;
  onSync: (item: OfflineTransactionQueueItem) => void;
  onReview: (item: OfflineTransactionQueueItem) => void;
  onDiscard: (item: OfflineTransactionQueueItem) => void;
  onResolveAsNew: (item: OfflineTransactionQueueItem) => void;
  onReauthenticate: () => void;
}

export default function OfflineQueuePanel({
  items: offlineQueue,
  pendingCount: pendingQueueCount,
  isOnline,
  now,
  showValues,
  syncingId: queueSyncingId,
  message: queueMessage,
  onSync: syncQueuedTransaction,
  onReview: reviewQueuedTransaction,
  onDiscard: discardQueuedTransaction,
  onResolveAsNew: resolveConflictAsNew,
  onReauthenticate: reauthenticateForQueue,
}: OfflineQueuePanelProps) {
  return (
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
            Estes itens ficam salvos sem criptografia neste dispositivo e são removidos ao sair da conta.
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
                  {showValues ? amountLabel(item.payload.amount) : MASKED_AMOUNT} ·{' '}
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
                  <Button size="xs" variant="outline" onClick={() => discardQueuedTransaction(item)} disabled={Boolean(queueSyncingId)}>
                    Limpar
                  </Button>
                ) : item.failureKind === 'auth' ? (
                  <>
                    <Button size="xs" onClick={reauthenticateForQueue} disabled={Boolean(queueSyncingId)}>
                      Entrar novamente
                    </Button>
                    <Button size="xs" variant="outline" onClick={() => discardQueuedTransaction(item)} disabled={Boolean(queueSyncingId)}>
                      Descartar
                    </Button>
                  </>
                ) : item.failureKind === 'idempotency_conflict' && item.errorCode === 'IDEMPOTENCY_PAYLOAD_CONFLICT' ? (
                  <>
                    <Button size="xs" onClick={() => resolveConflictAsNew(item)} disabled={!isOnline || Boolean(queueSyncingId)}>
                      Criar como novo
                    </Button>
                    <Button size="xs" variant="outline" onClick={() => discardQueuedTransaction(item)} disabled={Boolean(queueSyncingId)}>
                      Descartar
                    </Button>
                  </>
                ) : (
                  <>
                    {(item.failureKind === 'validation' || item.failureKind === 'business_conflict') ? (
                      <Button size="xs" onClick={() => reviewQueuedTransaction(item)} disabled={Boolean(queueSyncingId)}>
                        Revisar
                      </Button>
                    ) : (
                    <Button size="xs" onClick={() => syncQueuedTransaction(item)} disabled={!isOnline || Boolean(queueSyncingId) || Boolean(item.retryAfterAt && now < Date.parse(item.retryAfterAt))}>
                      {queueSyncingId === item.id ? 'Sincronizando...' : 'Sincronizar'}
                    </Button>
                    )}
                    <Button size="xs" variant="outline" onClick={() => discardQueuedTransaction(item)} disabled={Boolean(queueSyncingId)}>
                      Descartar
                    </Button>
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
  );
}
