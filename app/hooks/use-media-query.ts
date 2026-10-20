'use client';

import { useCallback, useSyncExternalStore } from 'react';

/**
 * Observa uma media query. No servidor (e na hidratação) retorna `false`;
 * use só em UI que renderiza depois de dados carregados no cliente, ou aceite
 * o primeiro render como "mobile". Evita montar duas árvores escondidas por CSS.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const media = window.matchMedia(query);
      media.addEventListener('change', onChange);
      return () => media.removeEventListener('change', onChange);
    },
    [query],
  );

  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );
}
