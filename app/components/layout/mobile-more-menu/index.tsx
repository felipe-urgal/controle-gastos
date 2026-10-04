'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import {
  FaDownload,
  FaFileImport,
  FaPlus,
  FaSearch,
  FaTimes,
} from 'react-icons/fa';

import {
  getAppNavigation,
  mobileMoreNavigationGroups,
  type AppNavigationItem,
} from '@/app/components/layout/app-navigation';
import { useAuth } from '@/app/context';

const quickActions = [
  {
    label: 'Nova transação',
    description: 'Registrar uma receita ou despesa',
    href: '/transacoes/nova',
    icon: FaPlus,
  },
  {
    label: 'Importar transações',
    description: 'Importar arquivo CSV ou OFX',
    href: '/transacoes/importar',
    icon: FaFileImport,
  },
] as const;

export default function MobileMoreMenu({
  onClose,
  onInstallApp,
}: {
  onClose: () => void;
  onInstallApp?: () => Promise<void>;
}) {
  const { user } = useAuth();
  const pathname = usePathname();
  const [query, setQuery] = useState('');
  const dialogRef = useRef<HTMLElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const navigation = getAppNavigation(user?.id);
  const normalizedQuery = query.trim().toLocaleLowerCase('pt-BR');

  const groups = mobileMoreNavigationGroups
    .map((group) => ({
      ...group,
      items: group.keys
        .map((key) => navigation.find((item) => item.key === key))
        .filter((item): item is AppNavigationItem => item !== undefined)
        .filter(
          (item) =>
            normalizedQuery.length === 0 ||
            item.label.toLocaleLowerCase('pt-BR').includes(normalizedQuery),
        ),
    }))
    .filter((group) => group.items.length > 0);

  useEffect(() => {
    restoreFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const frame = requestAnimationFrame(() => searchRef.current?.focus());
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== 'Tab' || !dialogRef.current) return;

      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a[href], input:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      );

      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    }

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      cancelAnimationFrame(frame);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
      restoreFocusRef.current?.focus();
      restoreFocusRef.current = null;
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end bg-black/45 backdrop-blur-[2px] lg:hidden"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) onClose();
      }}
    >
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="mobile-more-title"
        className="flex max-h-[min(92dvh,760px)] w-full flex-col overflow-hidden rounded-t-[22px] border border-b-0 border-[var(--border)] bg-[var(--background)] shadow-2xl"
        style={{
          paddingLeft: 'env(safe-area-inset-left)',
          paddingRight: 'env(safe-area-inset-right)',
        }}
      >
        <header className="flex items-center gap-3 border-b border-[var(--border)] px-4 py-3">
          <div className="min-w-0 flex-1">
            <h2 id="mobile-more-title" className="text-lg font-bold text-[var(--foreground)]">
              Mais opções
            </h2>
            <p className="mt-0.5 text-xs text-[var(--text-muted)]">
              Acesse todas as áreas do aplicativo.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar menu"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-md)] text-[var(--text-muted)] hover:bg-[var(--surface-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]"
          >
            <FaTimes aria-hidden="true" />
          </button>
        </header>

        <div
          className="overflow-y-auto px-4 pt-4"
          style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}
        >
          <section aria-labelledby="mobile-more-quick-actions">
            <h3
              id="mobile-more-quick-actions"
              className="mb-2 text-xs font-bold uppercase tracking-[0.12em] text-[var(--text-subtle)]"
            >
              Ações rápidas
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {quickActions.map((action) => {
                const Icon = action.icon;
                return (
                  <Link
                    key={action.href}
                    href={action.href}
                    onClick={onClose}
                    className="flex min-h-[76px] flex-col justify-center rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-3 transition-colors hover:border-[var(--primary)]/35 hover:bg-[var(--surface-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]"
                  >
                    <Icon className="mb-2 text-[var(--primary)]" aria-hidden="true" />
                    <strong className="text-sm text-[var(--foreground)]">{action.label}</strong>
                    <span className="mt-0.5 text-xs leading-snug text-[var(--text-muted)]">
                      {action.description}
                    </span>
                  </Link>
                );
              })}
            </div>
          </section>

          <label className="mt-5 flex min-h-12 items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] px-3 focus-within:border-[var(--primary)]/55 focus-within:ring-2 focus-within:ring-[var(--primary)]/15">
            <FaSearch className="shrink-0 text-[var(--text-subtle)]" aria-hidden="true" />
            <span className="sr-only">Filtrar funcionalidades</span>
            <input
              ref={searchRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              aria-label="Filtrar funcionalidades"
              placeholder="Buscar uma funcionalidade"
              className="min-w-0 flex-1 bg-transparent text-base text-[var(--foreground)] outline-none placeholder:text-[var(--text-subtle)]"
              autoComplete="off"
            />
          </label>

          <nav className="mt-5 space-y-5" aria-label="Todas as funcionalidades">
            {groups.map((group) => (
              <section key={group.label}>
                <h3 className="mb-2 text-xs font-bold uppercase tracking-[0.12em] text-[var(--text-subtle)]">
                  {group.label}
                </h3>
                <div className="grid gap-2 sm:grid-cols-2">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const active = item.isActive(pathname);

                    return (
                      <Link
                        key={item.key}
                        href={item.href}
                        onClick={onClose}
                        aria-current={active ? 'page' : undefined}
                        className={
                          'flex min-h-12 items-center gap-3 rounded-[var(--radius-md)] border px-3 py-2.5 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)] ' +
                          (active
                            ? 'border-[var(--primary)]/45 bg-[var(--primary-subtle)] text-[var(--foreground)]'
                            : 'border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)] hover:border-[var(--primary)]/30 hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]')
                        }
                      >
                        <Icon
                          className={active ? 'text-[var(--primary)]' : 'text-[var(--text-subtle)]'}
                          aria-hidden="true"
                        />
                        <span className="truncate">{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </section>
            ))}
          </nav>

          {groups.length === 0 && (
            <p className="py-8 text-center text-sm text-[var(--text-muted)]">
              Nenhuma funcionalidade encontrada.
            </p>
          )}

          {onInstallApp && (
            <section className="mt-5 border-t border-[var(--border)] pt-4">
              <button
                type="button"
                onClick={() => void onInstallApp()}
                className="flex min-h-12 w-full items-center gap-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-left text-sm font-semibold text-[var(--text-muted)] transition-colors hover:border-[var(--primary)]/30 hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]"
              >
                <FaDownload className="text-[var(--primary)]" aria-hidden="true" />
                <span>
                  <strong className="block text-[var(--foreground)]">Instalar aplicativo</strong>
                  <span className="mt-0.5 block text-xs font-normal text-[var(--text-muted)]">
                    Adicionar o Controle de Gastos à tela inicial.
                  </span>
                </span>
              </button>
            </section>
          )}
        </div>
      </section>
    </div>
  );
}
