'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { useAuth } from '@/app/context';
import {
  getAppNavigation,
  mobilePrimaryNavigationKeys,
} from '@/app/components/layout/app-navigation';

export default function BottomNav() {
  const pathname = usePathname();
  const { user } = useAuth();
  const navigation = getAppNavigation(user?.id).filter((item) =>
    mobilePrimaryNavigationKeys.includes(
      item.key as (typeof mobilePrimaryNavigationKeys)[number],
    ),
  );

  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-[var(--border)] bg-[var(--surface)] lg:hidden"
      style={{
        paddingBottom: 'env(safe-area-inset-bottom)',
        paddingLeft: 'env(safe-area-inset-left)',
        paddingRight: 'env(safe-area-inset-right)',
      }}
    >
      <div className="mx-auto grid min-h-[var(--app-mobile-bottom-nav-height)] max-w-xl grid-cols-5 px-1 sm:px-2">
        {navigation.map((item) => {
          const active = item.isActive(pathname);
          const Icon = item.icon;

          return (
            <Link
              key={item.key}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={`
                relative flex min-h-11 min-w-0 flex-col items-center justify-center gap-1 rounded-[var(--radius-md)] px-1 py-2
                text-sm transition-colors duration-150
                focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--focus)]
                ${active ? 'font-semibold text-[var(--foreground)]' : 'font-medium text-[var(--text-muted)]'}
              `}
            >
              <span
                className={`flex h-8 min-w-9 items-center justify-center rounded-full px-1.5 transition-colors duration-150 ${
                  active ? 'bg-[var(--primary-subtle)] text-[var(--primary)]' : 'text-[var(--text-subtle)]'
                }`}
                aria-hidden="true"
              >
                <Icon className="h-[18px] w-[18px]" />
              </span>
              <span className="max-w-full truncate max-[339px]:sr-only">{item.label}</span>
              {active && (
                <span
                  className="absolute bottom-0 h-0.5 w-8 rounded-full bg-[var(--primary)]"
                  aria-hidden="true"
                />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
