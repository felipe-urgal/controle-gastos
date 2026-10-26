'use client';

import { motion, useReducedMotion, type Variants } from 'framer-motion';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { FaDownload, FaMoon, FaSearch, FaSignOutAlt, FaSun, FaUser } from 'react-icons/fa';

import {
  getAppNavigation,
  mobileMoreExtraKeys,
  mobileMoreNavigationGroups,
  type AppNavigationItem,
} from '@/app/components/layout/app-navigation';
import { lockBodyScroll } from '@/app/components/overlays/modal-shell';
import { switchThemeWithReveal } from '@/app/components/layout/theme-transition';
import { IconButton, IconLink } from '@/app/components/ui';
import { CARD_EASE } from '@/app/components/ui/motion';
import { useAuth, useTheme } from '@/app/context';

const menuStack: Variants = { hidden: {}, shown: { transition: { staggerChildren: 0.05, delayChildren: 0.12 } } };
const menuGroup: Variants = {
  hidden: { opacity: 0, y: 12 },
  shown: { opacity: 1, y: 0, transition: { duration: 0.3, ease: CARD_EASE, staggerChildren: 0.025 } },
};
const menuItem: Variants = { hidden: { opacity: 0, scale: 0.85 }, shown: { opacity: 1, scale: 1, transition: { type: 'spring', stiffness: 500, damping: 26 } } };

/** Distância do painel até a borda de baixo: respiro da pílula (0,75rem) + a pílula (66px), sem vão: o painel é a barra crescendo. */
const PANEL_BOTTOM = 'calc(env(safe-area-inset-bottom) + 0.75rem + 4.125rem)';

/**
 * Menu "Mais" do mobile: um painel que sobe de cima da barra inferior flutuante, que continua
 * visível (o próprio "Mais" alterna). Fecha ao tocar fora, com Esc ou ao escolher um destino.
 */
export default function MobileMoreMenu({
  closing = false,
  bottomKeys,
  onPick,
  onClose,
  onInstallApp,
  onOpenGlobalSearch,
}: {
  /** Em saída: toca a animação de fechar antes de o chamador desmontar o menu. */
  closing?: boolean;
  /** Itens que já estão na barra inferior (não aparecem aqui). */
  bottomKeys: AppNavigationItem['key'][];
  /** Chamado ao abrir um destino: ele passa a ocupar a barra inferior. */
  onPick: (key: string) => void;
  onClose: () => void;
  onInstallApp?: () => Promise<void>;
  onOpenGlobalSearch?: () => void;
}) {
  const reduce = useReducedMotion();
  const pathname = usePathname();
  const { logout, user } = useAuth();
  const { resolvedTheme, setTheme } = useTheme();
  const profileActive = pathname.startsWith('/usuario');
  const panelRef = useRef<HTMLDivElement>(null);
  const navigation = getAppNavigation();

  const groups = mobileMoreNavigationGroups
    .map((group, index) => ({
      ...group,
      // O Calendário e as Contas (quando saem da barra inferior) abrem o primeiro grupo.
      items: [...(index === 0 ? [...mobileMoreExtraKeys, 'accounts' as const] : []), ...group.keys]
        // O perfil fica na seção "Conta" abaixo, com tema, busca e sair.
        .filter((key) => key !== 'profile' && !bottomKeys.includes(key))
        .map((key) => navigation.find((item) => item.key === key))
        .filter((item): item is AppNavigationItem => item !== undefined),
    }))
    .filter((group) => group.items.length > 0);

  // O chamador passa uma função nova a cada render; a ref mantém o efeito (foco e Esc) montado uma vez só.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  // Trava o scroll da página enquanto o menu está aberto; libera já ao começar a fechar.
  useEffect(() => {
    if (closing) return;
    return lockBodyScroll();
  }, [closing]);

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
      <motion.div
        aria-hidden="true"
        onClick={onClose}
        data-state={closing ? 'closed' : 'open'}
        initial={{ opacity: 0 }}
        animate={{ opacity: closing ? 0 : 1 }}
        transition={{ duration: closing ? 0.18 : 0.25 }}
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
        <motion.div
          ref={panelRef}
          role="dialog"
          aria-label="Mais opções"
          tabIndex={-1}
          data-state={closing ? 'closed' : 'open'}
          style={{ transformOrigin: 'bottom center', maxHeight: `calc(100dvh - var(--app-mobile-topbar-height) - env(safe-area-inset-top) - ${PANEL_BOTTOM} - 0.75rem)` }}
          initial={{ y: 28, scale: 0.96, opacity: 0 }}
          animate={closing ? { y: 20, scale: 0.97, opacity: 0, transition: { duration: 0.18, ease: 'easeIn' } } : { y: 0, scale: 1, opacity: 1, transition: { type: 'spring', stiffness: 380, damping: 30 } }}
          className={
            'mx-auto max-w-sm overflow-y-auto overscroll-contain rounded-t-[1.25rem] rounded-b-none border border-b-0 border-[var(--border)] bg-[var(--surface)] p-3 shadow-[0_-16px_40px_-12px_rgba(0,0,0,0.35)] outline-none ' +
            (closing ? 'pointer-events-none' : 'pointer-events-auto')
          }
        >
          <motion.nav aria-label="Todas as funcionalidades" className="space-y-3" variants={menuStack} initial={reduce ? false : 'hidden'} animate="shown">
            {groups.map((group) => (
              <motion.section key={group.label} variants={menuGroup}>
                <h3 className="mb-1.5 px-2 text-xs font-bold uppercase tracking-[0.12em] text-[var(--text-subtle)]">
                  {group.label}
                </h3>
                <div className="grid grid-cols-2 gap-1">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const active = item.isActive(pathname);

                    return (
                      <motion.div key={item.key} variants={menuItem}>
                      <Link
                        href={item.href}
                        onClick={() => {
                          onPick(item.key);
                          onClose();
                        }}
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
                      </motion.div>
                    );
                  })}
                </div>
              </motion.section>
            ))}
          </motion.nav>

          <section className="mt-3 flex items-center justify-between border-t border-[var(--border)] pt-2" aria-label="Conta e preferências">
            <IconLink
              label={user?.name ? `Perfil de ${user.name}` : 'Perfil'}
              title="Perfil"
              href="/usuario"
              icon={<FaUser />}
              tone={profileActive ? 'primary' : 'neutral'}
              onClick={onClose}
            />
            <IconButton
              label="Abrir busca global"
              title="Busca global"
              icon={<FaSearch />}
              onClick={() => {
                onClose();
                onOpenGlobalSearch?.();
              }}
            />
            <IconButton
              label={resolvedTheme === 'dark' ? 'Usar tema claro' : 'Usar tema escuro'}
              title={resolvedTheme === 'dark' ? 'Tema claro' : 'Tema escuro'}
              icon={resolvedTheme === 'dark' ? <FaSun /> : <FaMoon />}
              onClick={(event) => {
                // O mesmo círculo que se expande do sidebar: para o escuro nasce no botão, para o claro volta do canto superior direito.
                const box = event.currentTarget.getBoundingClientRect();
                switchThemeWithReveal(resolvedTheme === 'dark' ? 'light' : 'dark', setTheme, { x: box.left + box.width / 2, y: box.top + box.height / 2 });
              }}
            />
            <IconButton label="Sair da conta" title="Sair" tone="danger" icon={<FaSignOutAlt />} onClick={() => void logout()} />
          </section>

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
        </motion.div>
      </div>
    </div>
  );
}
