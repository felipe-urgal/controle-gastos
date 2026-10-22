'use client';

import Link from 'next/link';
import { useState } from 'react';
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
import { useAuth, useTheme } from '@/app/context';

const GROUPS_STORAGE_KEY = 'sidebar-closed-groups';

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
}: {
  item: AppNavigationItem;
  active: boolean;
  collapsed: boolean;
}) {
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      aria-current={active ? 'page' : undefined}
      title={collapsed ? item.label : undefined}
      className={`
        group relative flex min-h-10 items-center rounded-[var(--radius-md)] py-2
        text-[0.9375rem] font-medium transition-[background-color,color] duration-150
        focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]
        ${collapsed ? 'justify-center px-0' : 'gap-3 px-3'}
        ${
          active
            ? 'bg-[var(--primary-subtle)] text-[var(--foreground)]'
            : 'text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]'
        }
      `}
    >
      {active && (
        <span
          aria-hidden="true"
          className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-[var(--primary)]"
        />
      )}
      <Icon
        className={`h-[18px] w-[18px] shrink-0 transition-colors ${active ? 'text-[var(--primary)]' : 'text-[var(--text-subtle)] group-hover:text-[var(--foreground)]'}`}
        aria-hidden="true"
      />
      <span className={collapsed ? 'sr-only' : 'truncate'}>{item.label}</span>
    </Link>
  );
}

export default function AppSidebar({
  collapsed = false,
  onToggleCollapsed,
  onOpenGlobalSearch,
}: {
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
  onOpenGlobalSearch?: () => void;
}) {
  const pathname = usePathname();
  const { logout, user } = useAuth();
  const { resolvedTheme, setTheme } = useTheme();
  const navigation = getAppNavigation().filter((item) => item.key !== 'profile');
  const profileHref = '/usuario';
  const profileActive = pathname === '/usuario' || pathname.startsWith('/usuario/');
  // O shell só renderiza a sidebar após a hidratação, então ler o localStorage aqui é seguro.
  const [closedGroups, setClosedGroups] = useState<string[]>(readClosedGroups);

  const byKey = new Map(navigation.map((item) => [item.key, item]));
  const primaryItems = mobilePrimaryNavigationKeys
    .map((key) => byKey.get(key))
    .filter((item): item is AppNavigationItem => Boolean(item));
  const groups = mobileMoreNavigationGroups
    .map((group) => ({
      label: group.label,
      items: (group.keys as readonly string[])
        .map((key) => byKey.get(key as AppNavigationItem['key']))
        .filter((item): item is AppNavigationItem => Boolean(item)),
    }))
    .filter((group) => group.items.length > 0);

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

  const toggleTheme = () => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
  };

  return (
    <aside
      aria-label="Navegação principal"
      className="orbit-navigation-surface fixed inset-y-0 left-0 z-[var(--z-header)] hidden w-[var(--app-sidebar-current-width)] flex-col border-r border-[var(--border)] lg:flex"
    >
      <div className={`flex h-[68px] items-center border-b border-[var(--border)] ${collapsed ? 'px-2' : 'px-4'}`}>
        <button
          type="button"
          onClick={onToggleCollapsed}
          className={`flex min-w-0 items-center rounded-[var(--radius-md)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--focus)] ${collapsed ? 'w-full justify-center' : 'gap-3'}`}
          aria-label={collapsed ? 'Expandir barra lateral — Controle de Gastos' : 'Recolher barra lateral — Controle de Gastos'}
          aria-expanded={!collapsed}
          title={collapsed ? 'Expandir barra lateral' : 'Recolher barra lateral'}
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-gradient-to-br from-[var(--primary)] to-[var(--primary-hover)] text-[var(--on-primary)] shadow-sm">
            <FaWallet aria-hidden="true" />
          </span>
          <span className={collapsed ? 'sr-only' : 'min-w-0 text-left'}>
            <span className="block truncate text-base font-bold tracking-tight text-[var(--foreground)]">
              Controle de Gastos
            </span>
            <span className="mt-0.5 block truncate text-sm text-[var(--text-muted)]">
              Finanças pessoais
            </span>
          </span>
        </button>
      </div>

      <nav className={`flex-1 overflow-y-auto py-4 ${collapsed ? 'px-2' : 'px-3'}`} aria-label="Seções do aplicativo">
        <button
          type="button"
          onClick={onOpenGlobalSearch}
          aria-label="Abrir busca global"
          title={collapsed ? 'Busca global' : undefined}
          className={`mb-4 flex min-h-10 w-full items-center rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] py-2.5 text-base font-medium text-[var(--text-muted)] transition-colors hover:border-[var(--primary)]/35 hover:text-[var(--foreground)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)] ${collapsed ? 'justify-center px-0' : 'gap-3 px-3'}`}
        >
          <FaSearch className="h-5 w-5 shrink-0 text-[var(--text-subtle)]" aria-hidden="true" />
          <span className={collapsed ? 'sr-only' : 'min-w-0 flex-1 truncate text-left'}>
            Busca global
          </span>
          {!collapsed && (
            <kbd className="rounded border border-[var(--border)] px-1.5 py-0.5 text-xs text-[var(--text-subtle)]">
              Ctrl K
            </kbd>
          )}
        </button>

        <div className="space-y-0.5">
          {primaryItems.map((item) => (
            <SidebarLink key={item.key} item={item} active={item.isActive(pathname)} collapsed={collapsed} />
          ))}
        </div>

        {groups.map((group) => {
          const hasActive = group.items.some((item) => item.isActive(pathname));
          const open = collapsed || hasActive || !closedGroups.includes(group.label);
          const panelId = `sidebar-group-${group.label}`;

          return (
            <div
              key={group.label}
              className={collapsed ? 'mt-3 space-y-0.5 border-t border-[var(--border)] pt-3' : 'mt-5'}
            >
              {!collapsed && (
                <button
                  type="button"
                  onClick={() => toggleGroup(group.label)}
                  aria-expanded={open}
                  aria-controls={panelId}
                  disabled={hasActive}
                  className="mb-1 flex w-full items-center justify-between rounded-[var(--radius-sm)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-subtle)] transition-colors hover:text-[var(--foreground)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)] disabled:cursor-default disabled:hover:text-[var(--text-subtle)]"
                >
                  {group.label}
                  <FaChevronDown
                    className={`h-2.5 w-2.5 transition-transform duration-200 ${open ? '' : '-rotate-90'}`}
                    aria-hidden="true"
                  />
                </button>
              )}
              {open && (
                <div id={panelId} className="space-y-0.5">
                  {group.items.map((item) => (
                    <SidebarLink key={item.key} item={item} active={item.isActive(pathname)} collapsed={collapsed} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className={`border-t border-[var(--border)] ${collapsed ? 'p-2' : 'p-3'}`}>
        <button
          type="button"
          onClick={toggleTheme}
          className={`mb-2 flex min-h-11 w-full items-center rounded-[var(--radius-md)] py-2.5 text-left text-base font-medium text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)] ${collapsed ? 'justify-center px-0' : 'gap-3 px-3'}`}
          aria-label={resolvedTheme === 'dark' ? 'Usar tema claro' : 'Usar tema escuro'}
          title={collapsed ? (resolvedTheme === 'dark' ? 'Tema claro' : 'Tema escuro') : undefined}
        >
          {resolvedTheme === 'dark' ? (
            <FaSun className="h-5 w-5 text-[var(--text-subtle)]" aria-hidden="true" />
          ) : (
            <FaMoon className="h-5 w-5 text-[var(--text-subtle)]" aria-hidden="true" />
          )}
          <span className={collapsed ? 'sr-only' : undefined}>{resolvedTheme === 'dark' ? 'Tema claro' : 'Tema escuro'}</span>
        </button>

        <OfflinePendingBadge block />

        <div
          className={`flex items-center rounded-[var(--radius-lg)] border p-2 transition-colors ${
            collapsed ? 'flex-col gap-1' : 'gap-2'
          } ${
            profileActive
              ? 'border-[var(--primary)]/35 bg-[var(--primary-subtle)]'
              : 'border-[var(--border)] bg-[var(--orbit-navigation-raised)]'
          }`}
        >
          <Link
            href={profileHref}
            aria-current={profileActive ? 'page' : undefined}
            title={collapsed ? user?.name || 'Meu perfil' : undefined}
            className={`flex min-w-0 items-center rounded-[var(--radius-md)] p-1.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)] ${collapsed ? 'justify-center' : 'flex-1 gap-3'}`}
          >
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--primary-subtle)] text-base font-bold text-[var(--primary)]"
              aria-hidden="true"
            >
              {initial}
            </span>
            <span className={collapsed ? 'sr-only' : 'min-w-0'}>
              <span className="block truncate text-sm font-semibold text-[var(--foreground)]">
                {user?.name || 'Meu perfil'}
              </span>
              <span className="block truncate text-sm text-[var(--text-muted)]">
                {user?.email || 'Configurações'}
              </span>
            </span>
          </Link>

          <IconButton
            label="Sair da conta"
            title="Sair"
            tone="danger"
            icon={<FaSignOutAlt />}
            onClick={() => void logout()}
          />
        </div>
      </div>
    </aside>
  );
}
