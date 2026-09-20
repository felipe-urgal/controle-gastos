'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  FaMoon,
  FaSignOutAlt,
  FaSun,
  FaWallet,
} from 'react-icons/fa';

import { getAppNavigation } from '@/app/components/layout/app-navigation';
import { useAuth, useTheme } from '@/app/context';

export default function AppSidebar({
  collapsed = false,
  onToggleCollapsed,
}: {
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
}) {
  const pathname = usePathname();
  const { logout, user } = useAuth();
  const { resolvedTheme, setTheme } = useTheme();
  const navigation = getAppNavigation(user?.id).filter((item) => item.key !== 'profile');
  const profileHref = user?.id ? `/usuario/show/${user.id}` : '/usuario';
  const profileActive = pathname === '/usuario' || pathname.startsWith('/usuario/');
  const initial = user?.name?.trim().charAt(0).toUpperCase() || 'U';

  const toggleTheme = () => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
  };

  return (
    <aside
      aria-label="Navegação principal"
      className="orbit-navigation-surface fixed inset-y-0 left-0 z-40 hidden w-[var(--app-sidebar-current-width)] flex-col border-r border-[var(--border)] lg:flex"
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
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--primary)] text-[var(--on-primary)]">
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
        <p className={collapsed ? 'sr-only' : 'px-3 pb-2 text-sm font-semibold uppercase tracking-[0.14em] text-[var(--text-subtle)]'}>
          Navegação
        </p>

        <div className="space-y-1">
          {navigation.map((item) => {
            const active = item.isActive(pathname);
            const Icon = item.icon;

            return (
              <Link
                key={item.key}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                title={collapsed ? item.label : undefined}
                className={`
                  flex min-h-11 items-center rounded-[var(--radius-md)] border py-2.5
                  text-base font-medium transition-[background-color,border-color,color] duration-150
                  focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]
                  ${collapsed ? 'justify-center px-0' : 'gap-3 px-3'}
                  ${
                    active
                      ? 'border-[var(--primary)]/45 bg-[var(--primary-subtle)] text-[var(--foreground)]'
                      : 'border-transparent text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]'
                  }
                `}
              >
                <Icon
                  className={`h-5 w-5 shrink-0 ${active ? 'text-[var(--primary)]' : 'text-[var(--text-subtle)]'}`}
                  aria-hidden="true"
                />
                <span className={collapsed ? 'sr-only' : 'truncate'}>{item.label}</span>
              </Link>
            );
          })}
        </div>
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

          <button
            type="button"
            onClick={() => void logout()}
            aria-label="Sair da conta"
            title="Sair"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-md)] text-[var(--expense)] transition-colors hover:bg-[var(--danger-subtle)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]"
          >
            <FaSignOutAlt aria-hidden="true" />
          </button>
        </div>
      </div>
    </aside>
  );
}
