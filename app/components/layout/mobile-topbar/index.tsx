'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FaMoon, FaSignOutAlt, FaSun, FaWallet } from 'react-icons/fa';

import { useAuth, useTheme } from '@/app/context';
import { getAppNavigation } from '@/app/components/layout/app-navigation';

export default function MobileTopbar() {
  const pathname = usePathname();
  const { logout, user } = useAuth();
  const { resolvedTheme, setTheme } = useTheme();
  const profileHref = user?.id ? `/usuario/show/${user.id}` : '/usuario';
  const profileActive = getAppNavigation(user?.id)
    .find((item) => item.key === 'profile')
    ?.isActive(pathname);
  const initial = user?.name?.trim().charAt(0).toUpperCase() || 'U';

  return (
    <header
      className="orbit-navigation-surface sticky top-0 z-40 border-b border-[var(--border)] lg:hidden"
      style={{
        paddingTop: 'env(safe-area-inset-top)',
        paddingLeft: 'env(safe-area-inset-left)',
        paddingRight: 'env(safe-area-inset-right)',
      }}
    >
      <div className="flex min-h-[var(--app-mobile-topbar-height)] items-center gap-1.5 px-3 min-[390px]:gap-2 min-[390px]:px-4">
        <Link
          href="/transacoes"
          aria-label="Controle de Gastos"
          className="mr-auto flex min-h-11 min-w-11 items-center gap-2.5 rounded-[var(--radius-md)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--primary)] text-[var(--on-primary)]">
            <FaWallet aria-hidden="true" />
          </span>
          <span className="truncate text-base font-bold tracking-tight text-[var(--foreground)] max-[389px]:sr-only">
            Controle de Gastos
          </span>
        </Link>

        <button
          type="button"
          onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
          aria-label={resolvedTheme === 'dark' ? 'Usar tema claro' : 'Usar tema escuro'}
          title={resolvedTheme === 'dark' ? 'Tema claro' : 'Tema escuro'}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-md)] text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]"
        >
          {resolvedTheme === 'dark' ? <FaSun aria-hidden="true" /> : <FaMoon aria-hidden="true" />}
        </button>

        <Link
          href={profileHref}
          aria-label="Abrir perfil"
          aria-current={profileActive ? 'page' : undefined}
          title="Perfil"
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border text-sm font-bold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)] ${
            profileActive
              ? 'border-[var(--primary)]/40 bg-[var(--primary-subtle)] text-[var(--primary)]'
              : 'border-[var(--border)] bg-[var(--orbit-navigation-raised)] text-[var(--text-muted)] hover:border-[var(--primary)]/30 hover:text-[var(--foreground)]'
          }`}
        >
          <span aria-hidden="true">{initial}</span>
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
    </header>
  );
}
