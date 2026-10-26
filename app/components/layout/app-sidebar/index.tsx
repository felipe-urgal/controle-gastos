'use client';

import { AnimatePresence, motion } from 'framer-motion';
import Link from 'next/link';
import { useEffect, useState, type MouseEvent } from 'react';
import { IconButton } from '@/app/components/ui';
import { usePathname } from 'next/navigation';
import {
  FaChevronDown,
  FaMoon,
  FaSearch,
  FaSignOutAlt,
  FaSun,
  FaWallet,
} from 'react-icons/fa';

import {
  getAppNavigation,
  mobileMoreNavigationGroups,
  mobilePrimaryNavigationKeys,
  type AppNavigationItem,
} from '@/app/components/layout/app-navigation';
import OfflinePendingBadge from '@/app/components/pwa/offline-pending-badge';
import { GLOBAL_SEARCH_SURFACE_ID } from '@/app/components/layout/global-search-dialog';
import { switchThemeWithReveal } from '@/app/components/layout/theme-transition';
import { useAuth, useTheme } from '@/app/context';

const GROUPS_STORAGE_KEY = 'sidebar-closed-groups';
const ACTIVE_SPRING = { type: 'spring', stiffness: 500, damping: 40 } as const;
const ICON_SPRING = { type: 'spring', stiffness: 400, damping: 12 } as const;
const ICON_VARIANTS = { hover: { rotate: -8, scale: 1.12 } };

const MotionLink = motion.create(Link);

// Recolher e expandir: largura, margens e opacidades usam a mesma curva e duração para andar juntas.
const COLLAPSE = 'duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none';

// A entrada em cascata toca só na primeira carga; navegar entre páginas não a repete.
let introPlayed = false;
const introDelay = (order: number) => 0.1 + order * 0.03;

function readClosedGroups(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(GROUPS_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((value) => typeof value === 'string') : [];
  } catch {
    return [];
  }
}

function SidebarLink({
  item,
  active,
  collapsed,
  indented = false,
  hovered,
  onHover,
  intro,
}: {
  item: AppNavigationItem;
  active: boolean;
  collapsed: boolean;
  indented?: boolean;
  hovered: boolean;
  onHover: (key: string) => void;
  /** Ordem do item na cascata de entrada; `null` quando não há entrada a tocar. */
  intro: number | null;
}) {
  const Icon = item.icon;

  return (
    <MotionLink
      href={item.href}
      initial={intro === null ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut', delay: intro === null ? 0 : introDelay(intro) }}
      whileHover="hover"
      whileTap={{ scale: 0.98 }}
      onHoverStart={() => onHover(item.key)}
      onFocus={() => onHover(item.key)}
      aria-current={active ? 'page' : undefined}
      title={collapsed ? item.label : undefined}
      className={`
        group relative isolate flex min-h-10 items-center gap-3 rounded-[var(--radius-md)] px-[14px] py-2
        text-sm font-medium transition-colors duration-150
        focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]
        ${
          active
            ? 'text-[var(--foreground)]'
            : 'text-[var(--text-muted)] hover:text-[var(--foreground)]'
        }
      `}
    >
      {hovered && !active && (
        <motion.span
          aria-hidden="true"
          layoutId="sidebar-hover-bg"
          transition={ACTIVE_SPRING}
          className="absolute inset-0 -z-20 rounded-[var(--radius-md)] bg-[var(--surface-hover)]"
        />
      )}
      {active && (
        <>
          <motion.span
            aria-hidden="true"
            layoutId="sidebar-active-bg"
            transition={ACTIVE_SPRING}
            className="absolute inset-0 -z-10 rounded-[var(--radius-md)] bg-[var(--primary-subtle)]"
          />
          <motion.span
            aria-hidden="true"
            layoutId="sidebar-active-bar"
            transition={ACTIVE_SPRING}
            className={`absolute top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full bg-[var(--primary)] ${indented ? '-left-[9px]' : 'left-0'}`}
          />
        </>
      )}
      <motion.span variants={ICON_VARIANTS} transition={ICON_SPRING} className="flex shrink-0">
        <Icon
          className={`h-[18px] w-[18px] transition-colors ${active ? 'text-[var(--primary)]' : 'text-[var(--text-subtle)] group-hover:text-[var(--foreground)]'}`}
          aria-hidden="true"
        />
      </motion.span>
      <span className={`min-w-0 truncate whitespace-nowrap transition-opacity ${COLLAPSE} ${collapsed ? 'opacity-0' : 'opacity-100'}`}>
        {item.label}
      </span>
    </MotionLink>
  );
}

export default function AppSidebar({
  collapsed = false,
  onToggleCollapsed,
  onOpenGlobalSearch,
  globalSearchOpen = false,
}: {
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
  onOpenGlobalSearch?: () => void;
  /** Com a busca aberta, a superfície do botão passa para a caixa (morph) e volta ao fechar. */
  globalSearchOpen?: boolean;
}) {
  const pathname = usePathname();
  const { logout, user } = useAuth();
  const { resolvedTheme, setTheme } = useTheme();
  const navigation = getAppNavigation().filter((item) => item.key !== 'profile');
  const profileHref = '/usuario';
  const profileActive = pathname === '/usuario' || pathname.startsWith('/usuario/');
  // O shell só renderiza a sidebar após a hidratação, então ler o localStorage aqui é seguro.
  const [closedGroups, setClosedGroups] = useState<string[]>(readClosedGroups);
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);
  const [playIntro] = useState(() => !introPlayed);
  useEffect(() => {
    introPlayed = true;
  }, []);
  let introOrder = 0;

  const byKey = new Map(navigation.map((item) => [item.key, item]));
  const primaryItems = mobilePrimaryNavigationKeys
    .map((key) => byKey.get(key))
    .filter((item): item is AppNavigationItem => Boolean(item));
  const groups = [{ label: 'Principal', items: primaryItems }, ...mobileMoreNavigationGroups
    .map((group) => ({
      label: group.label,
      items: (group.keys as readonly string[])
        .map((key) => byKey.get(key as AppNavigationItem['key']))
        .filter((item): item is AppNavigationItem => Boolean(item)),
    }))
    .filter((group) => group.items.length > 0)];

  const toggleGroup = (label: string) => {
    setClosedGroups((current) => {
      const next = current.includes(label)
        ? current.filter((value) => value !== label)
        : [...current, label];
      try {
        window.localStorage.setItem(GROUPS_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // preferência visual: segue sem persistência
      }
      return next;
    });
  };

  const initial = user?.name?.trim().charAt(0).toUpperCase() || 'U';

  const toggleTheme = (event: MouseEvent<HTMLElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    switchThemeWithReveal(resolvedTheme === 'dark' ? 'light' : 'dark', setTheme, {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    });
  };

  return (
    <aside
      aria-label="Navegação principal"
      className={`orbit-navigation-surface fixed inset-y-0 left-0 z-[var(--z-header)] hidden w-[var(--app-sidebar-current-width)] flex-col overflow-hidden border-r border-[var(--border)] transition-[width] ${COLLAPSE} lg:flex`}
    >
      <div className="flex h-[var(--app-sidebar-header-height)] items-center border-b border-[var(--border)] px-[17px]">
        <button
          type="button"
          onClick={onToggleCollapsed}
          className={`flex min-w-0 items-center rounded-[var(--radius-md)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--focus)] gap-3`}
          aria-label={collapsed ? 'Expandir barra lateral — Controle de Gastos' : 'Recolher barra lateral — Controle de Gastos'}
          aria-expanded={!collapsed}
          title={collapsed ? 'Expandir barra lateral' : 'Recolher barra lateral'}
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-gradient-to-br from-[var(--primary)] to-[var(--primary-hover)] text-[var(--on-primary)] shadow-sm">
            <FaWallet aria-hidden="true" />
          </span>
          <span className={`min-w-0 whitespace-nowrap text-left transition-opacity ${COLLAPSE} ${collapsed ? 'opacity-0' : 'opacity-100'}`}>
            <span className="block truncate text-base font-bold tracking-tight text-[var(--foreground)]">
              Controle de Gastos
            </span>
            <span className="mt-0.5 block truncate text-sm text-[var(--text-muted)]">
              Finanças pessoais
            </span>
          </span>
        </button>
      </div>

      <nav
          className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-4"
          aria-label="Seções do aplicativo"
          onMouseLeave={() => setHoveredKey(null)}
          onBlur={() => setHoveredKey(null)}
        >
        <motion.button
          type="button"
          whileTap={{ scale: 0.97 }}
          onClick={onOpenGlobalSearch}
          aria-label="Abrir busca global"
          title={collapsed ? 'Busca global' : undefined}
          className="group relative isolate mb-4 flex min-h-10 w-full items-center gap-3 rounded-[var(--radius-md)] px-3 py-2.5 text-base font-medium text-[var(--text-muted)] transition-colors hover:text-[var(--foreground)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]"
        >
          {/* Superfície do botão: é o elemento que a caixa da busca assume ao abrir (layoutId) e para onde volta ao fechar. */}
          {!globalSearchOpen && (
            <motion.span
              aria-hidden="true"
              layoutId={GLOBAL_SEARCH_SURFACE_ID}
              transition={{ type: 'spring', stiffness: 380, damping: 34 }}
              style={{ borderRadius: 12 }}
              className="absolute inset-0 -z-10 border border-[var(--border)] bg-[var(--surface)] transition-colors group-hover:border-[var(--primary)]/35"
            />
          )}
          <FaSearch className="h-5 w-5 shrink-0 text-[var(--text-subtle)]" aria-hidden="true" />
          <span className={`min-w-0 flex-1 truncate whitespace-nowrap text-left transition-opacity ${COLLAPSE} ${collapsed || globalSearchOpen ? 'opacity-0' : 'opacity-100'}`}>
            Busca global
          </span>
          <kbd className={`whitespace-nowrap rounded border border-[var(--border)] px-1.5 py-0.5 text-xs text-[var(--text-subtle)] transition-opacity ${COLLAPSE} ${collapsed || globalSearchOpen ? 'opacity-0' : 'opacity-100'}`}>
            Ctrl K
          </kbd>
        </motion.button>

        {groups.map((group, index) => {
          const hasActive = group.items.some((item) => item.isActive(pathname));
          const open = collapsed || !closedGroups.includes(group.label);
          const panelId = `sidebar-group-${group.label}`;

          return (
            <motion.div
              key={group.label}
              initial={playIntro ? { clipPath: 'inset(0 0 100% 0)' } : false}
              animate={{ clipPath: 'inset(0 0 0% 0)', transitionEnd: { clipPath: 'none' } }}
              transition={{ duration: 0.45, ease: 'easeOut', delay: index * 0.08 }}
              className={
                index === 0
                  ? ''
                  : `border-t transition-[margin,padding,border-color] ${COLLAPSE} ${
                      collapsed ? 'mt-3 border-[var(--border)] pt-3' : 'mt-[15px] border-transparent pt-0'
                    }`
              }
            >
              {/* Título do grupo: recolhe a altura e some ao recolher a sidebar, sem trocar de layout de uma vez. */}
              <div
                inert={collapsed}
                className={`grid transition-[grid-template-rows,opacity] ${COLLAPSE} ${
                  collapsed ? 'grid-rows-[0fr] opacity-0' : 'grid-rows-[1fr] opacity-100'
                }`}
              >
                <div className="min-h-0 overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleGroup(group.label)}
                  aria-expanded={open}
                  aria-controls={panelId}
                  className={`mb-1 flex w-full items-center justify-between rounded-[var(--radius-sm)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)] ${
                    hasActive
                      ? 'text-[var(--primary)]'
                      : 'text-[var(--text-subtle)] hover:text-[var(--foreground)]'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <motion.span
                      aria-hidden="true"
                      initial={playIntro ? { scale: 0 } : false}
                      animate={{ scale: 1 }}
                      transition={{ ...ICON_SPRING, delay: index * 0.08 + 0.3 }}
                      className={`h-[7px] w-[7px] rounded-full transition-colors ${hasActive ? 'bg-[var(--primary)]' : 'bg-[var(--border)]'}`}
                    />
                    {group.label}
                  </span>
                  <FaChevronDown
                    className={`h-2.5 w-2.5 transition-transform duration-200 ${open ? '' : '-rotate-90'}`}
                    aria-hidden="true"
                  />
                </button>
                </div>
              </div>
              <AnimatePresence initial={false}>
                {open && (
                  <motion.div
                    key="panel"
                    id={panelId}
                    initial={{ height: 0, opacity: 0, overflow: 'hidden' }}
                    animate={{ height: 'auto', opacity: 1, transitionEnd: { overflow: 'visible' } }}
                    exit={{ height: 0, opacity: 0, overflow: 'hidden' }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                    className={`space-y-0.5 border-l transition-[margin,padding,border-color] ${COLLAPSE} ${
                      collapsed
                        ? 'ml-0 border-transparent pl-0'
                        : `ml-[15px] pl-2 ${hasActive ? 'border-[var(--primary)]/40' : 'border-[var(--border)]'}`
                    }`}
                  >
                    {group.items.map((item) => (
                      <SidebarLink
                      key={item.key}
                      item={item}
                      active={item.isActive(pathname)}
                      collapsed={collapsed}
                      indented={!collapsed}
                      hovered={hoveredKey === item.key}
                      onHover={setHoveredKey}
                      intro={playIntro ? introOrder++ : null}
                    />
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </nav>

      <motion.div
        initial={playIntro ? { opacity: 0, y: 8 } : false}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut', delay: 0.5 }}
        className="border-t border-[var(--border)] px-[10px] py-3"
      >
        <button
          type="button"
          onClick={toggleTheme}
          className="mb-2 flex min-h-11 w-full items-center gap-3 overflow-hidden rounded-[var(--radius-md)] px-[15px] py-2.5 text-left text-base font-medium text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]"
          aria-label={resolvedTheme === 'dark' ? 'Usar tema claro' : 'Usar tema escuro'}
          title={collapsed ? (resolvedTheme === 'dark' ? 'Tema claro' : 'Tema escuro') : undefined}
        >
          <span className="relative flex h-5 w-5 shrink-0 items-center justify-center">
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={resolvedTheme}
                initial={{ rotate: -90, scale: 0.4, opacity: 0 }}
                animate={{ rotate: 0, scale: 1, opacity: 1 }}
                exit={{ rotate: 90, scale: 0.4, opacity: 0 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
                className="flex text-[var(--text-subtle)]"
              >
                {resolvedTheme === 'dark' ? (
                  <FaSun className="h-5 w-5" aria-hidden="true" />
                ) : (
                  <FaMoon className="h-5 w-5" aria-hidden="true" />
                )}
              </motion.span>
            </AnimatePresence>
          </span>
          <span className={`whitespace-nowrap transition-opacity ${COLLAPSE} ${collapsed ? 'opacity-0' : 'opacity-100'}`}>
            {resolvedTheme === 'dark' ? 'Tema claro' : 'Tema escuro'}
          </span>
        </button>

        <OfflinePendingBadge block />

        <div
          className={`flex items-center gap-2 overflow-hidden rounded-[var(--radius-lg)] border p-1.5 transition-colors ${
            profileActive
              ? 'border-[var(--primary)]/35 bg-[var(--primary-subtle)]'
              : 'border-[var(--border)] bg-[var(--orbit-navigation-raised)]'
          }`}
        >
          <Link
            href={profileHref}
            aria-current={profileActive ? 'page' : undefined}
            title={collapsed ? user?.name || 'Meu perfil' : undefined}
            className="flex min-w-0 flex-1 items-center gap-3 rounded-[var(--radius-md)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]"
          >
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--primary-subtle)] text-base font-bold text-[var(--primary)]"
              aria-hidden="true"
            >
              {initial}
            </span>
            <span className={`min-w-0 whitespace-nowrap transition-opacity ${COLLAPSE} ${collapsed ? 'opacity-0' : 'opacity-100'}`}>
              <span className="block truncate text-sm font-semibold text-[var(--foreground)]">
                {user?.name || 'Meu perfil'}
              </span>
              <span className="block truncate text-sm text-[var(--text-muted)]">
                {user?.email || 'Configurações'}
              </span>
            </span>
          </Link>

          <div
            inert={collapsed}
            className={`shrink-0 overflow-hidden transition-[max-width,opacity] ${COLLAPSE} ${collapsed ? 'max-w-0 opacity-0' : 'max-w-11 opacity-100'}`}
          >
            <IconButton
              label="Sair da conta"
              title="Sair"
              tone="danger"
              icon={<FaSignOutAlt />}
              onClick={() => void logout()}
            />
          </div>
        </div>

        {/* Recolhida, a ação de sair desce para uma linha própria, com altura animada. */}
        <AnimatePresence initial={false}>
          {collapsed && (
            <motion.div
              key="logout-collapsed"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="flex justify-center overflow-hidden pt-1"
            >
              <IconButton
                label="Sair da conta"
                title="Sair"
                tone="danger"
                icon={<FaSignOutAlt />}
                onClick={() => void logout()}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </aside>
  );
}
