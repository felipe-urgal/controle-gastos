'use client';

import { useEffect } from 'react';

export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    if (process.env.NODE_ENV !== 'production') {
      void navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const registration of registrations) {
          void registration.unregister();
        }
      });
      return;
    }

    const register = () => {
      void navigator.serviceWorker
        .register('/sw.js', {
          scope: '/',
          updateViaCache: 'none',
        })
        .catch((error) => {
          console.warn('Não foi possível registrar o service worker', error);
        });
    };

    const handleOfflineTransactionLink = (event: MouseEvent) => {
      if (navigator.onLine) return;
      if (!(event.target instanceof Element)) return;

      const anchor = event.target.closest('a[href]');
      if (!(anchor instanceof HTMLAnchorElement)) return;

      const url = new URL(anchor.href, window.location.origin);
      if (
        url.origin !== window.location.origin ||
        url.pathname !== '/transacoes/nova'
      ) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      window.location.assign(url.toString());
    };

    document.addEventListener('click', handleOfflineTransactionLink, true);

    if (document.readyState === 'complete') {
      register();
      return () =>
        document.removeEventListener('click', handleOfflineTransactionLink, true);
    }

    window.addEventListener('load', register, { once: true });
    return () => {
      window.removeEventListener('load', register);
      document.removeEventListener('click', handleOfflineTransactionLink, true);
    };
  }, []);

  return null;
}
