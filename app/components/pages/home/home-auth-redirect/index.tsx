'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { useAuth } from '@/app/context';

export function shouldCoverPublicLanding(
  isLoading: boolean,
  isAuthenticated: boolean,
) {
  return isLoading || isAuthenticated;
}

export default function HomeAuthRedirect() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace('/contas');
    }
  }, [isAuthenticated, isLoading, router]);

  if (!shouldCoverPublicLanding(isLoading, isAuthenticated)) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex min-h-dvh items-center justify-center bg-[var(--background)] px-6 text-center"
      role="status"
      aria-live="polite"
      aria-label="Carregando sessão"
    >
      <div className="max-w-sm">
        <p className="text-base font-semibold text-[var(--foreground)]">
          Carregando sua sessão…
        </p>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Estamos preparando seu espaço financeiro.
        </p>
      </div>
    </div>
  );
}
