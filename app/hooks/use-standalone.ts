'use client';

import { useSyncExternalStore } from 'react';

type NavigatorWithStandalone = Navigator & {
  standalone?: boolean;
};

function emptySubscribe(): () => void {
  return () => undefined;
}

function detectIOS(): boolean {
  if (typeof window === 'undefined') return false;
  const nav = window.navigator as NavigatorWithStandalone;
  return (
    /iPad|iPhone|iPod/.test(nav.userAgent) &&
    !(window as Window & { MSStream?: unknown }).MSStream
  );
}

function detectStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  const nav = window.navigator as NavigatorWithStandalone;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    nav.standalone === true ||
    document.referrer.includes('android-app://')
  );
}

function subscribeStandalone(listener: () => void): () => void {
  const mediaQuery = window.matchMedia('(display-mode: standalone)');
  mediaQuery.addEventListener('change', listener);
  return () => mediaQuery.removeEventListener('change', listener);
}

export function useStandalone() {
  const isIOS = useSyncExternalStore(emptySubscribe, detectIOS, () => false);
  const isStandalone = useSyncExternalStore(
    subscribeStandalone,
    detectStandalone,
    () => false,
  );

  return { isStandalone, isIOS };
}
