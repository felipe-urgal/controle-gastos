'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FaEllipsisH } from 'react-icons/fa';

import {
  getAppNavigation,
  mobileBottomNavigationKeys,
} from '@/app/components/layout/app-navigation';

const itemBase =
  'relative flex min-h-[52px] min-w-0 flex-col items-center justify-center gap-0.5 rounded-full px-2 py-1.5 text-xs transition-colors duration-150 ' +
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)] ';

function itemTone(active: boolean) {
  return active
    ? 'bg-[var(--primary-subtle)] font-semibold text-[var(--primary)]'
    : 'font-medium text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]';
}

/** Barra inferior flutuante (pílula): Início, Transações, Contas e Mais. */
export default function BottomNav({
  onOpenMore,
  moreOpen = false,
}: {
  onOpenMore: () => void;
  moreOpen?: boolean;
}) {
  const pathname = usePathname();
  const allNavigation = getAppNavigation();
  const navigation = allNavigation.filter((item) =>
    mobileBottomNavigationKeys.includes(item.key as (typeof mobileBottomNavigationKeys)[number]),
  );
  const moreActive = allNavigation.some(
    (item) =>
      !mobileBottomNavigationKeys.includes(item.key as (typeof mobileBottomNavigationKeys)[number]) &&
      item.isActive(pathname),
  );

  return (
    <nav
      aria-label="Navegação principal"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[var(--z-nav)] lg:hidden"
      style={{
        paddingBottom: 'calc(env(safe-area-inset-bottom) + 0.75rem)',
        paddingLeft: 'max(0.75rem, env(safe-area-inset-left))',
        paddingRight: 'max(0.75rem, env(safe-area-inset-right))',
      }}
    >
      <div className="pointer-events-auto mx-auto grid max-w-sm grid-cols-4 gap-1 rounded-full border border-[var(--border)] bg-[color-mix(in_srgb,var(--surface)_90%,transparent)] p-1.5 shadow-[var(--shadow-elevated)] backdrop-blur-xl">
        {navigation.map((item) => {
          const active = item.isActive(pathname);
          const Icon = item.icon;
          const label = item.key === 'dashboard' ? 'Início' : item.label;

          return (
            <Link
              key={item.key}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              aria-label={label}
              className={itemBase + itemTone(active)}
            >
              <Icon className="h-5 w-5" aria-hidden="true" />
              <span className="max-w-full truncate max-[359px]:sr-only">{label}</span>
            </Link>
          );
        })}

        <button
          type="button"
          onClick={onOpenMore}
          aria-label="Mais"
          aria-haspopup="dialog"
          aria-expanded={moreOpen}
          className={itemBase + itemTone(moreActive || moreOpen)}
        >
          <FaEllipsisH className="h-5 w-5" aria-hidden="true" />
          <span className="max-w-full truncate max-[359px]:sr-only">Mais</span>
        </button>
      </div>
    </nav>
  );
}
