'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { useAuth } from '@/app/context/auth-context';
import { notificationService } from '@/app/services/notification-service';

/** Atualiza o contador do sino a cada 5 minutos com a aba visível, e ao voltar para ela. */
const POLL_INTERVAL_MS = 5 * 60_000;

type NotificationsContextValue = {
  unreadCount: number;
  /** Rebusca o contador (depois de ler, dispensar ou abrir a central). */
  refresh: () => Promise<void>;
  /** Ajuste imediato do contador, quando a tela já sabe o novo valor. */
  setUnreadCount: (count: number) => void;
};

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [stored, setStored] = useState(0);
  // Sem usuário (logout) o contador some sem precisar de um efeito para zerar.
  const unreadCount = userId ? stored : 0;

  const refresh = useCallback(async () => {
    if (!userId) return;
    try {
      setStored(await notificationService.unreadCount());
    } catch {
      // O contador é um complemento: se falhar, mantém o último valor em vez de atrapalhar a tela.
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) return;

    const first = window.setTimeout(() => void refresh(), 0);
    const onVisible = () => {
      if (document.visibilityState === 'visible') void refresh();
    };
    const interval = window.setInterval(onVisible, POLL_INTERVAL_MS);
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);

    return () => {
      window.clearTimeout(first);
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
  }, [refresh, userId]);

  const value = useMemo(
    () => ({ unreadCount, refresh, setUnreadCount: setStored }),
    [unreadCount, refresh],
  );

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

export function useNotifications() {
  const context = useContext(NotificationsContext);
  if (!context) throw new Error('useNotifications deve ser usado dentro de NotificationsProvider');
  return context;
}
