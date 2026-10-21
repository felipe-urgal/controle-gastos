'use client';

import { ModalShell } from '@/app/components/overlays/modal-shell';
import Link from 'next/link';
import { Input } from '@/app/components/ui';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import {
  FaDownload,
  FaFileImport,
  FaPlus,
  FaSearch,
} from 'react-icons/fa';

import {
  getAppNavigation,
  mobileMoreNavigationGroups,
  type AppNavigationItem,
} from '@/app/components/layout/app-navigation';

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
  const pathname = usePathname();
  const [query, setQuery] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);
  const navigation = getAppNavigation();
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
    searchRef.current?.focus();
  }, []);

  return (
    <ModalShell
      title="Mais opções"
      description="Acesse todas as áreas do aplicativo."
      closeLabel="Fechar menu"
      maxWidthClass="max-w-2xl"
      onClose={onClose}
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

    <div className="mt-5">
      <Input
        ref={searchRef}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        aria-label="Filtrar funcionalidades"
        placeholder="Buscar uma funcionalidade"
        icon={<FaSearch />}
        autoComplete="off"
        type="search"
        enterKeyHint="search"
      />
    </div>

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
    </ModalShell>
  );
}
