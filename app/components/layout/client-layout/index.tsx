'use client';

import { useState, useSyncExternalStore } from 'react';
import { usePathname } from 'next/navigation';

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
  const { user, isLoading } = useAuth();
  const pathname = usePathname();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const accountComposeActive =
    pathname === '/contas/nova' || pathname.startsWith('/contas/alterar/');
  const accountShowActive = pathname.startsWith('/contas/show/');
  const categoryComposeActive =
    pathname === '/categorias/nova' || pathname.startsWith('/categorias/alterar/');
  const immersiveMobile =
    accountComposeActive || accountShowActive || categoryComposeActive;
  const mounted = useSyncExternalStore(
    subscribeHydration,
    () => true,
    () => false,
  );

  if (!mounted || isLoading) {
    return null;
  }

  if (!user) {
    return children;
  }

  return (
    <div
      className="authenticated-shell min-h-screen w-full bg-[var(--background)] text-[var(--foreground)]"
      data-sidebar-collapsed={sidebarCollapsed ? 'true' : 'false'}
    >
      <a
        href="#main-content"
        className="sr-only z-[70] rounded-[var(--radius-md)] bg-[var(--orbit-primary)] px-4 py-3 text-base font-semibold text-[var(--orbit-on-primary)] focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus-visible:outline-[var(--orbit-focus)]"
      >
        Pular para o conteúdo
      </a>

      <AppSidebar
        collapsed={sidebarCollapsed}
        onToggleCollapsed={() => setSidebarCollapsed((current) => !current)}
      />

      <div className="min-h-screen lg:pl-[var(--app-sidebar-current-width)]">
        <MobileTopbar />

        <main
          className={
            immersiveMobile
              ? 'min-h-screen w-full overflow-x-hidden pb-[env(safe-area-inset-bottom)] lg:pb-0'
              : 'min-h-screen w-full overflow-x-hidden pb-[calc(var(--app-mobile-bottom-nav-height)+env(safe-area-inset-bottom))] lg:pb-0'
          }
          id="main-content"
          tabIndex={-1}
        >
          {children}
        </main>
      </div>

      {!immersiveMobile && <BottomNav />}
    </div>
  );
}
