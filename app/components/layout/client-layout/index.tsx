'use client';

import { useSyncExternalStore } from 'react';

import { useAuth } from '@/app/context';
import {
  AppSidebar,
  BottomNav,
  MobileTopbar,
} from '@/app/components/layout';

function subscribeHydration(): () => void {
  return () => undefined;
}

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useAuth();
  const mounted = useSyncExternalStore(
    subscribeHydration,
    () => true,
    () => false,
  );

  if (!mounted || user === undefined) {
    return null;
  }

  if (!user) {
    return children;
  }

  return (
    <div className="min-h-screen w-full bg-[var(--background)] text-[var(--foreground)]">
      <a
        href="#main-content"
        className="sr-only z-[70] rounded-[var(--radius-md)] bg-[var(--primary)] px-4 py-3 text-base font-semibold text-[var(--on-primary)] focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Pular para o conteúdo
      </a>

      <AppSidebar />

      <div className="min-h-screen lg:pl-[264px]">
        <MobileTopbar />

        <main
          className="min-h-screen w-full overflow-x-hidden pb-[calc(68px+env(safe-area-inset-bottom))] lg:pb-0"
          id="main-content"
          tabIndex={-1}
        >
          {children}
        </main>
      </div>

      <BottomNav />
    </div>
  );
}
