'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { FaCloudUploadAlt } from 'react-icons/fa';

import { useAuth } from '@/app/context';
import { readOfflineTransactionDraft } from '@/app/lib/pwa/offline-transaction-draft';
import {
  OFFLINE_QUEUE_CHANGED_EVENT,
  readOfflineTransactionQueue,
} from '@/app/lib/pwa/offline-transaction-queue';

// Indicador discreto de lançamentos locais ainda não enviados. Nunca exibe valores
// e nunca inicia sincronização: apenas leva o usuário à tela de revisão manual.
export default function OfflinePendingBadge({ className = '' }: { className?: string }) {
  const { user } = useAuth();
  const userId = user?.id;
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!userId) return;

    const update = () => {
      const queued = readOfflineTransactionQueue(userId).length;
      const draft = readOfflineTransactionDraft(userId) ? 1 : 0;
      setCount(queued + draft);
    };

    queueMicrotask(update);
    window.addEventListener(OFFLINE_QUEUE_CHANGED_EVENT, update);
    window.addEventListener('storage', update);
    window.addEventListener('focus', update);
    return () => {
      window.removeEventListener(OFFLINE_QUEUE_CHANGED_EVENT, update);
      window.removeEventListener('storage', update);
      window.removeEventListener('focus', update);
    };
  }, [userId]);

  if (!userId || count === 0) return null;

  const label =
    count === 1
      ? '1 lançamento local aguardando envio'
      : `${count} lançamentos locais aguardando envio`;

  return (
    <Link
      href="/transacoes/nova"
      aria-label={label}
      title={label}
      data-testid="offline-pending-badge"
      className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-md)] text-[var(--warning)] transition-colors hover:bg-[var(--surface-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)] ${className}`}
    >
      <FaCloudUploadAlt aria-hidden="true" />
      <span
        aria-hidden="true"
        className="absolute right-1 top-1 min-w-4 rounded-full bg-[var(--warning)] px-1 text-center text-[10px] font-bold leading-4 text-white"
      >
        {count}
      </span>
    </Link>
  );
}
