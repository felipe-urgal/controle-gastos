'use client';

import { ModalShell } from '@/app/components/overlays/modal-shell';
import Link from 'next/link';
import { Input } from '@/app/components/ui';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import {
  FaDownload,
  FaSearch,
} from 'react-icons/fa';

import {
  getAppNavigation,
  mobileMoreExtraKeys,
  mobileMoreNavigationGroups,
  type AppNavigationItem,
} from '@/app/components/layout/app-navigation';

export default function MobileMoreMenu({
  onClose,
  onInstallApp,
}: {
  onClose: () => void;
  onInstallApp?: () => Promise<void>;
}) {
  const pathname = usePathname();
  const [query, setQuery] = useState('');
  const navigation = getAppNavigation();
  const normalizedQuery = query.trim().toLocaleLowerCase('pt-BR');

  const groups = mobileMoreNavigationGroups
    .map((group, index) => ({
      ...group,
      // O Calendário, fora da barra inferior, abre o primeiro grupo.
      items: [...(index === 0 ? mobileMoreExtraKeys : []), ...group.keys]
        .map((key) => navigation.find((item) => item.key === key))
        .filter((item): item is AppNavigationItem => item !== undefined)
        .filter(
          (item) =>
            normalizedQuery.length === 0 ||
            item.label.toLocaleLowerCase('pt-BR').includes(normalizedQuery),
        ),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <ModalShell
      title="Mais opções"
      description="Acesse todas as áreas do aplicativo."
      closeLabel="Fechar menu"
      maxWidthClass="max-w-2xl"
      variant="fullscreen-sheet"
      onClose={onClose}
    >
    <div>
      <Input
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

    <nav className="mt-5 space-y-4" aria-label="Todas as funcionalidades">
      {groups.map((group) => {
        const groupActive = group.items.some((item) => item.isActive(pathname));

        return (
          <section key={group.label}>
            <h3
              className={
                'mb-2 flex items-center gap-2 px-1 text-xs font-bold uppercase tracking-[0.12em] ' +
                (groupActive ? 'text-[var(--primary)]' : 'text-[var(--text-subtle)]')
              }
            >
              <span
                aria-hidden="true"
                className={'h-1.5 w-1.5 rounded-full ' + (groupActive ? 'bg-[var(--primary)]' : 'bg-[var(--border)]')}
              />
              {group.label}
            </h3>
            <div
              className={
                'ml-[7px] grid grid-cols-1 gap-1.5 border-l pl-3 sm:grid-cols-2 ' +
                (groupActive ? 'border-[var(--primary)]/40' : 'border-[var(--border)]')
              }
            >
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
                      'flex min-h-12 items-center gap-3 rounded-[var(--radius-md)] px-3 py-2.5 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)] ' +
                      (active
                        ? 'bg-[var(--primary-subtle)] text-[var(--foreground)]'
                        : 'bg-[var(--surface)] text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]')
                    }
                  >
                    <Icon
                      className={'shrink-0 ' + (active ? 'text-[var(--primary)]' : 'text-[var(--text-subtle)]')}
                      aria-hidden="true"
                    />
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </section>
        );
      })}
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
