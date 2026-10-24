'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FaFilter, FaMoon, FaPlus, FaSearch, FaSignOutAlt, FaSun, FaWallet } from 'react-icons/fa';
import { IconButton } from '@/app/components/ui';

import { getAppNavigation } from '@/app/components/layout/app-navigation';
import OfflinePendingBadge from '@/app/components/pwa/offline-pending-badge';
import { useAuth, useTheme } from '@/app/context';

export default function MobileTopbar({
  onOpenGlobalSearch,
}: {
  onOpenGlobalSearch?: () => void;
}) {
  const pathname = usePathname();
  const { logout, user } = useAuth();
  const { resolvedTheme, setTheme } = useTheme();
  const profileHref = '/usuario';
  const profileActive = getAppNavigation()
    .find((item) => item.key === 'profile')
    ?.isActive(pathname);
  const initial = user?.name?.trim().charAt(0).toUpperCase() || 'U';
  const transactionsListActive = pathname === '/transacoes';
  const transactionComposeActive =
    pathname === '/transacoes/nova' || pathname.startsWith('/transacoes/alterar/');
  const transactionShowActive = pathname.startsWith('/transacoes/show/');
  const accountComposeActive =
    pathname === '/contas/nova' || pathname.startsWith('/contas/alterar/');
  const accountShowActive = pathname.startsWith('/contas/show/');
  const categoryComposeActive =
    pathname === '/categorias/nova' || pathname.startsWith('/categorias/alterar/');
  const categoryShowActive = pathname.startsWith('/categorias/show/');

  if (
    transactionComposeActive ||
    transactionShowActive ||
    accountComposeActive ||
    accountShowActive ||
    categoryComposeActive ||
    categoryShowActive
  ) {
    return (
      <div
        aria-hidden="true"
        className="lg:hidden"
        style={{ height: 'env(safe-area-inset-top)' }}
      />
    );
  }

  return (
    <header
      className="orbit-navigation-surface sticky top-0 z-[var(--z-header)] border-b border-[var(--border)] lg:hidden"
      style={{
        paddingTop: 'env(safe-area-inset-top)',
        paddingLeft: 'env(safe-area-inset-left)',
        paddingRight: 'env(safe-area-inset-right)',
      }}
    >
      <div className="flex min-h-[var(--app-mobile-topbar-height)] items-center gap-1.5 px-3 min-[360px]:gap-2 min-[360px]:px-4">
        <Link
          href="/transacoes"
          aria-label="Controle de Gastos"
          className="mr-auto flex min-h-11 min-w-11 items-center gap-2.5 rounded-[var(--radius-md)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--primary)] text-[var(--on-primary)]">
            <FaWallet aria-hidden="true" />
          </span>
          <span
            className={`truncate font-bold tracking-tight text-[var(--foreground)] ${
              transactionsListActive ? 'text-sm min-[360px]:text-base' : 'text-base max-[359px]:sr-only'
            }`}
          >
            Controle de Gastos
          </span>
        </Link>

        <OfflinePendingBadge />

        {transactionsListActive && (
          <div className="flex items-center gap-1 sm:hidden">
            <IconButton
              label="Buscar e filtrar transações"
              title="Buscar e filtrar"
              icon={<FaFilter />}
              onClick={() => window.dispatchEvent(new CustomEvent('transactions:open-filters'))}
            />
            <Link
              href="/transacoes/nova"
              aria-label="Nova transação"
              title="Nova transação"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--primary)] text-[var(--on-primary)] transition-colors hover:bg-[var(--primary-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]"
            >
              <FaPlus aria-hidden="true" />
            </Link>
          </div>
        )}

        <IconButton
          label="Abrir busca global"
          title="Busca global"
          icon={<FaSearch />}
          onClick={onOpenGlobalSearch}
        />

        <div className={transactionsListActive ? 'hidden sm:block' : undefined}>
          <IconButton
            label={resolvedTheme === 'dark' ? 'Usar tema claro' : 'Usar tema escuro'}
            title={resolvedTheme === 'dark' ? 'Tema claro' : 'Tema escuro'}
            icon={resolvedTheme === 'dark' ? <FaSun /> : <FaMoon />}
            onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
          />
        </div>

        <Link
          href={profileHref}
          aria-label="Abrir perfil"
          aria-current={profileActive ? 'page' : undefined}
          title="Perfil"
          className={`${transactionsListActive ? 'hidden sm:flex' : 'flex'} h-11 w-11 shrink-0 items-center justify-center rounded-full border text-sm font-bold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)] ${
            profileActive
              ? 'border-[var(--primary)]/40 bg-[var(--primary-subtle)] text-[var(--primary)]'
              : 'border-[var(--border)] bg-[var(--orbit-navigation-raised)] text-[var(--text-muted)] hover:border-[var(--primary)]/30 hover:text-[var(--foreground)]'
          }`}
        >
          <span aria-hidden="true">{initial}</span>
        </Link>

        <div className={transactionsListActive ? 'hidden sm:block' : undefined}>
          <IconButton
            label="Sair da conta"
            title="Sair"
            tone="danger"
            icon={<FaSignOutAlt />}
            onClick={() => void logout()}
          />
        </div>
      </div>
    </header>
  );
}
