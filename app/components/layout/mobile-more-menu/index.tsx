'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { FaDownload } from 'react-icons/fa';

import {
  getAppNavigation,
  mobileMoreExtraKeys,
  mobileMoreNavigationGroups,
  type AppNavigationItem,
} from '@/app/components/layout/app-navigation';

/** Distância do painel até a borda de baixo: respiro da pílula (0,75rem) + a pílula (4rem) + um vão. */
const PANEL_BOTTOM = 'calc(env(safe-area-inset-bottom) + 0.75rem + 4rem + 0.5rem)';

/**
 * Menu "Mais" do mobile: um painel que sobe de cima da barra inferior flutuante, que continua
 * visível (o próprio "Mais" alterna). Fecha ao tocar fora, com Esc ou ao escolher um destino.
 */
export default function MobileMoreMenu({
  onClose,
  onInstallApp,
}: {
  onClose: () => void;
  onInstallApp?: () => Promise<void>;
}) {
  const pathname = usePathname();
  const panelRef = useRef<HTMLDivElement>(null);
  const navigation = getAppNavigation();

  const groups = mobileMoreNavigationGroups
    .map((group, index) => ({
      ...group,
      // O Calendário, fora da barra inferior, abre o primeiro grupo.
      items: [...(index === 0 ? mobileMoreExtraKeys : []), ...group.keys]
        .map((key) => navigation.find((item) => item.key === key))
        .filter((item): item is AppNavigationItem => item !== undefined),
    }))
    .filter((group) => group.items.length > 0);

  // O chamador passa uma função nova a cada render; a ref mantém o efeito (foco e Esc) montado uma vez só.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onCloseRef.current();
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (previouslyFocused?.isConnected) previouslyFocused.focus();
    };
  }, []);

  return (
    <div className="lg:hidden">
      <div
        aria-hidden="true"
        onClick={onClose}
        className="fixed inset-0 z-[var(--z-popover)] bg-[color-mix(in_srgb,var(--background)_55%,transparent)] backdrop-blur-sm"
      />

      <div
        className="pointer-events-none fixed inset-x-0 z-[var(--z-popover)]"
        style={{
          bottom: PANEL_BOTTOM,
          paddingLeft: 'max(0.75rem, env(safe-area-inset-left))',
          paddingRight: 'max(0.75rem, env(safe-area-inset-right))',
        }}
      >
        <div
          ref={panelRef}
          role="dialog"
          aria-label="Mais opções"
          tabIndex={-1}
          className="pointer-events-auto mx-auto max-w-sm animate-sheet-rise overflow-y-auto overscroll-contain rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-3 shadow-[var(--shadow-elevated)] outline-none"
          style={{
            maxHeight: `calc(100dvh - var(--app-mobile-topbar-height) - env(safe-area-inset-top) - ${PANEL_BOTTOM} - 0.75rem)`,
          }}
        >
          <nav aria-label="Todas as funcionalidades" className="space-y-3">
            {groups.map((group) => (
              <section key={group.label}>
                <h3 className="mb-1.5 px-2 text-xs font-bold uppercase tracking-[0.12em] text-[var(--text-subtle)]">
                  {group.label}
                </h3>
                <div className="grid grid-cols-2 gap-1">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const active = item.isActive(pathname);

                    return (
                      <Link
                        key={item.key}
                        href={item.href}
                        onClick={onClose}
                        aria-current={active ? 'page' : undefined}
                        className={
                          'flex min-h-11 items-center gap-2.5 rounded-[var(--radius-md)] px-2.5 py-2 text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)] ' +
                          (active
                            ? 'bg-[var(--primary-subtle)] font-semibold text-[var(--primary)]'
                            : 'font-medium text-[var(--foreground)] hover:bg-[var(--surface-hover)]')
                        }
                      >
                        <Icon
                          className={'shrink-0 ' + (active ? 'text-[var(--primary)]' : 'text-[var(--text-subtle)]')}
                          aria-hidden="true"
                        />
                        <span className="truncate">{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </section>
            ))}
          </nav>

          {onInstallApp && (
            <button
              type="button"
              onClick={() => void onInstallApp()}
              className="mt-3 flex min-h-11 w-full items-center gap-2.5 rounded-[var(--radius-md)] border border-[var(--border)] px-2.5 py-2 text-left text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--surface-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]"
            >
              <FaDownload className="shrink-0 text-[var(--primary)]" aria-hidden="true" />
              <span>Instalar aplicativo</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
