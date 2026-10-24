'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FaEllipsisH } from 'react-icons/fa';

import { getAppNavigation, type AppNavigationItem } from '@/app/components/layout/app-navigation';

const itemBase =
  'relative flex min-h-[52px] min-w-0 flex-col items-center justify-center gap-0.5 rounded-full px-2 py-1.5 text-xs transition-colors duration-150 ' +
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)] ';

function itemTone(active: boolean) {
  return active
    ? 'bg-[var(--primary-subtle)] font-semibold text-[var(--primary)]'
    : 'font-medium text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]';
}

/** Barra inferior flutuante (pílula): Início, Transações, um terceiro item (Contas por padrão) e Mais. */
export default function BottomNav({
  keys,
  onOpenMore,
  moreOpen = false,
}: {
  /** Itens da barra, em ordem (o último é o que o usuário abriu pelo "Mais"). */
  keys: AppNavigationItem['key'][];
  onOpenMore: () => void;
  moreOpen?: boolean;
}) {
  const pathname = usePathname();
  const allNavigation = getAppNavigation();
  const navigation = keys
    .map((key) => allNavigation.find((item) => item.key === key))
    .filter((item): item is AppNavigationItem => item !== undefined);
  const moreActive = allNavigation.some((item) => !keys.includes(item.key) && item.isActive(pathname));

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
      <div
        className={
          'pointer-events-auto mx-auto grid max-w-sm grid-cols-4 gap-1 border border-[var(--border)] p-1.5 backdrop-blur-xl transition-[border-radius,background-color,box-shadow,border-color] duration-200 ease-out ' +
          // Com o "Mais" aberto a pílula vira a base do painel: topo reto, mesma cor, sem sombra própria.
          (moreOpen
            ? 'rounded-t-none rounded-b-[2.0625rem] border-t-transparent bg-[var(--surface)] shadow-none'
            : 'rounded-[2.0625rem] bg-[color-mix(in_srgb,var(--surface)_90%,transparent)] shadow-[var(--shadow-elevated)]')
        }
      >
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
