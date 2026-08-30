'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  FaMoon,
  FaSignOutAlt,
  FaSun,
  FaWallet,
} from 'react-icons/fa';

import { useAuth, useTheme } from '@/app/context';
import { getAppNavigation } from '@/app/components/layout/app-navigation';

export default function AppSidebar() {
  const pathname = usePathname();
  const { logout, user } = useAuth();
  const { resolvedTheme, setTheme } = useTheme();
  const navigation = getAppNavigation(user?.id);
  const profileHref = user?.id ? `/usuario/show/${user.id}` : '/usuario';
  const initial = user?.name?.trim().charAt(0).toUpperCase() || 'U';

  const toggleTheme = () => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
  };

  return (
    <aside
      aria-label="Navegação principal"
      className="fixed inset-y-0 left-0 z-40 hidden w-[264px] flex-col border-r border-[var(--border)] bg-[var(--surface)] lg:flex"
    >
      <div className="flex h-[76px] items-center border-b border-[var(--border)] px-5">
        <Link
          href="/transacoes"
          className="flex min-w-0 items-center gap-3 rounded-[var(--radius-md)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--focus)]"
          aria-label="Controle de Gastos"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--primary)] text-[var(--on-primary)]">
            <FaWallet aria-hidden="true" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-base font-bold tracking-tight text-[var(--foreground)]">
              Controle de Gastos
            </span>
            <span className="mt-0.5 block text-sm text-[var(--text-muted)]">
              Finanças pessoais
            </span>
          </span>
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-5" aria-label="Seções do aplicativo">
        <p className="px-3 pb-2 text-sm font-semibold uppercase tracking-[0.14em] text-[var(--text-subtle)]">
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
                className={`
                  relative flex min-h-11 items-center gap-3 rounded-[var(--radius-md)] border px-3 py-2.5
                  text-base font-medium transition-[background-color,border-color,color] duration-150
                  focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]
                  ${
                    active
                      ? 'border-[var(--primary)]/35 bg-[var(--primary-subtle)] text-[var(--foreground)]'
                      : 'border-transparent text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]'
                  }
                `}
              >
                {active && (
                  <span
                    className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-[var(--primary)]"
                    aria-hidden="true"
                  />
                )}
                <Icon
                  className={`h-5 w-5 shrink-0 ${active ? 'text-[var(--primary)]' : 'text-[var(--text-subtle)]'}`}
                  aria-hidden="true"
                />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      <div className="border-t border-[var(--border)] p-3">
        <button
          type="button"
          onClick={toggleTheme}
          className="mb-2 flex min-h-11 w-full items-center gap-3 rounded-[var(--radius-md)] px-3 py-2.5 text-left text-base font-medium text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]"
          aria-label={resolvedTheme === 'dark' ? 'Usar tema claro' : 'Usar tema escuro'}
        >
          {resolvedTheme === 'dark' ? (
            <FaSun className="h-5 w-5 text-[var(--text-subtle)]" aria-hidden="true" />
          ) : (
            <FaMoon className="h-5 w-5 text-[var(--text-subtle)]" aria-hidden="true" />
          )}
          <span>{resolvedTheme === 'dark' ? 'Tema claro' : 'Tema escuro'}</span>
        </button>

        <div className="flex items-center gap-2 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-raised)] p-2">
          <Link
            href={profileHref}
            className="flex min-w-0 flex-1 items-center gap-3 rounded-[var(--radius-md)] p-1.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]"
          >
            <span
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--primary-subtle)] text-base font-bold text-[var(--primary)]"
              aria-hidden="true"
            >
              {initial}
            </span>
            <span className="min-w-0">
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
