'use client';

import { useCallback, useSyncExternalStore } from 'react';

import {
  defaultMobilePinnedKey,
  isMobilePinnableKey,
  mobileFixedBottomKeys,
  type AppNavigationItem,
} from '@/app/components/layout/app-navigation';

const STORAGE_KEY = 'controle-gastos:mobile-bottom-pinned';
const CHANGE_EVENT = 'mobile-bottom-pinned:change';

function subscribe(onChange: () => void) {
  window.addEventListener('storage', onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener('storage', onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

function readPinned(): AppNavigationItem['key'] {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored && isMobilePinnableKey(stored)) return stored;
  } catch {
    // Sem armazenamento (modo privado): segue com o padrão.
  }
  return defaultMobilePinnedKey;
}

/**
 * Terceiro item da barra inferior do mobile: o último destino aberto pelo "Mais". O item que
 * ocupava o lugar vai para o "Mais". Fica salvo no navegador (por dispositivo).
 */
export function useMobileBottomPin() {
  const pinnedKey = useSyncExternalStore(subscribe, readPinned, () => defaultMobilePinnedKey);

  const pin = useCallback((key: string) => {
    if (!isMobilePinnableKey(key)) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, key);
    } catch {
      // Sem armazenamento: vale só até recarregar.
    }
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  const bottomKeys: AppNavigationItem['key'][] = [...mobileFixedBottomKeys, pinnedKey];
  return { bottomKeys, pin };
}
