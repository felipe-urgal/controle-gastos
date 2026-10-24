'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import { usePathname } from 'next/navigation';

import { useAuth } from '@/app/context';
import {
  AppSidebar,
  BottomNav,
  GlobalSearchDialog,
  MobileMoreMenu,
  MobileTopbar,
} from '@/app/components/layout';
import { useMobileBottomPin } from '@/app/components/layout/use-mobile-bottom-pin';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

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
  const [globalSearchOpen, setGlobalSearchOpen] = useState(false);
  const [mobileMoreOpen, setMobileMoreOpen] = useState(false);
  // O menu "Mais" continua montado durante a animação de fechar.
  const [mobileMoreMounted, setMobileMoreMounted] = useState(false);
  const { bottomKeys, pin: pinBottomItem } = useMobileBottomPin();
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const categoryComposeActive =
    pathname === '/categorias/nova' || pathname.startsWith('/categorias/alterar/');
  const categoryShowActive = pathname.startsWith('/categorias/show/');
  const immersiveMobile = categoryComposeActive || categoryShowActive;
  const mounted = useSyncExternalStore(
    subscribeHydration,
    () => true,
    () => false,
  );

  useEffect(() => {
    function handleShortcut(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setMobileMoreOpen(false);
        setGlobalSearchOpen(true);
      }
    }

    window.addEventListener('keydown', handleShortcut);
    return () => window.removeEventListener('keydown', handleShortcut);
  }, []);

  useEffect(() => {
    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    }

    function handleAppInstalled() {
      setInstallPrompt(null);
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  async function installApp() {
    if (!installPrompt) return;

    await installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
    setMobileMoreOpen(false);
  }

  useEffect(() => {
    if (mobileMoreOpen) return;
    const timeout = window.setTimeout(() => setMobileMoreMounted(false), 220);
    return () => window.clearTimeout(timeout);
  }, [mobileMoreOpen]);

  function openGlobalSearch() {
    setMobileMoreOpen(false);
    setGlobalSearchOpen(true);
  }

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
        className="sr-only z-[var(--z-toast)] rounded-[var(--radius-md)] bg-[var(--primary)] px-4 py-3 text-base font-semibold text-[var(--on-primary)] focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus-visible:outline-[var(--focus)]"
      >
        Pular para o conteúdo
      </a>

      <AppSidebar
        collapsed={sidebarCollapsed}
        onToggleCollapsed={() => setSidebarCollapsed((current) => !current)}
        onOpenGlobalSearch={openGlobalSearch}
      />

      <div className="min-h-screen lg:pl-[var(--app-sidebar-current-width)]">
        <MobileTopbar onOpenGlobalSearch={openGlobalSearch} />

        <main
          className={
            immersiveMobile
              ? 'min-h-screen w-full overflow-x-hidden pb-[env(safe-area-inset-bottom)] lg:pb-0'
              : 'min-h-screen w-full overflow-x-clip pb-[calc(var(--app-mobile-bottom-nav-height)+env(safe-area-inset-bottom))] lg:pb-0'
          }
          id="main-content"
          tabIndex={-1}
        >
          {children}
        </main>
      </div>

      {!immersiveMobile && (
        <BottomNav
          keys={bottomKeys}
          onOpenMore={() => {
            if (!mobileMoreOpen) setMobileMoreMounted(true);
            setMobileMoreOpen((open) => !open);
          }}
          moreOpen={mobileMoreOpen}
        />
      )}

      {mobileMoreMounted && !immersiveMobile && (
        <MobileMoreMenu
          closing={!mobileMoreOpen}
          bottomKeys={bottomKeys}
          onPick={pinBottomItem}
          onClose={() => setMobileMoreOpen(false)}
          onInstallApp={installPrompt ? installApp : undefined}
          onOpenGlobalSearch={openGlobalSearch}
        />
      )}

      {globalSearchOpen && (
        <GlobalSearchDialog onClose={() => setGlobalSearchOpen(false)} />
      )}
    </div>
  );
}
