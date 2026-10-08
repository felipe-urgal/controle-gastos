'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  FaSearch,
  FaTimes,
  FaMoneyBillWave,
  FaWallet,
  FaTags,
  FaMagic,
  FaPlus,
  FaFileImport,
} from 'react-icons/fa';

import { getAppNavigation } from '@/app/components/layout/app-navigation';
import { globalSearchService } from '@/app/services/global-search-service';
import type {
  GlobalSearchData,
  GlobalSearchResultType,
} from '@/app/types/global-search';

const groupLabels: Record<GlobalSearchResultType, string> = {
  TRANSACTION: 'Transações',
  ACCOUNT: 'Contas',
  CATEGORY: 'Categorias',
  IMPORT_RULE: 'Regras de importação',
  MERCHANT: 'Estabelecimentos',
  TAG: 'Tags',
  DEBT: 'Dívidas',
  TEMPLATE: 'Modelos',
  GOAL: 'Metas',
};

const resultIcons = {
  TRANSACTION: FaMoneyBillWave,
  ACCOUNT: FaWallet,
  CATEGORY: FaTags,
  IMPORT_RULE: FaMagic,
  MERCHANT: FaWallet,
  TAG: FaTags,
  DEBT: FaMoneyBillWave,
  TEMPLATE: FaMagic,
  GOAL: FaWallet,
} satisfies Record<GlobalSearchResultType, typeof FaSearch>;

const quickActions = [
  {
    id: 'new-transaction',
    title: 'Nova transação',
    subtitle: 'Registrar uma receita ou despesa',
    href: '/transacoes/nova',
    icon: FaPlus,
    keywords: 'lançamento receita despesa',
  },
  {
    id: 'import-transactions',
    title: 'Importar transações',
    subtitle: 'Importar arquivo CSV ou OFX',
    href: '/transacoes/importar',
    icon: FaFileImport,
    keywords: 'csv ofx arquivo importação',
  },
] as const;

export default function GlobalSearchDialog({
  onClose,
}: {
  onClose: () => void;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const [query, setQuery] = useState('');
  const [data, setData] = useState<GlobalSearchData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeIndex, setActiveIndex] = useState(-1);

  const normalizedQuery = query.trim().toLocaleLowerCase('pt-BR');
  const filteredQuickActions = useMemo(
    () =>
      quickActions.filter((item) => {
        if (!normalizedQuery) return true;
        return (
          item.title.toLocaleLowerCase('pt-BR').includes(normalizedQuery) ||
          item.subtitle.toLocaleLowerCase('pt-BR').includes(normalizedQuery) ||
          item.keywords.toLocaleLowerCase('pt-BR').includes(normalizedQuery)
        );
      }),
    [normalizedQuery],
  );
  const filteredNavigation = useMemo(
    () =>
      getAppNavigation().filter((item) => {
        if (!normalizedQuery) return true;
        return (
          item.label.toLocaleLowerCase('pt-BR').includes(normalizedQuery) ||
          item.key.toLocaleLowerCase('pt-BR').includes(normalizedQuery) ||
          item.keywords?.toLocaleLowerCase('pt-BR').includes(normalizedQuery)
        );
      }),
    [normalizedQuery],
  );
  const hasLocalResults =
    filteredQuickActions.length > 0 || filteredNavigation.length > 0;
  const serverResults = useMemo(
    () => data?.groups.flatMap((group) => group.items) ?? [],
    [data],
  );
  const flatResults = useMemo(
    () => [
      ...filteredQuickActions.map((item) => ({
        resultKey: 'action-' + item.id,
        href: item.href,
      })),
      ...filteredNavigation.map((item) => ({
        resultKey: 'navigation-' + item.key,
        href: item.href,
      })),
      ...serverResults.map((item) => ({
        resultKey: 'server-' + item.type + '-' + item.id,
        href: item.href,
      })),
    ],
    [filteredNavigation, filteredQuickActions, serverResults],
  );

  useEffect(() => {
    restoreFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const frame = requestAnimationFrame(() => inputRef.current?.focus());

    return () => {
      cancelAnimationFrame(frame);
      restoreFocusRef.current?.focus();
      restoreFocusRef.current = null;
    };
  }, []);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) return;

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setLoading(true);
      setError('');

      void globalSearchService
        .search(trimmed, controller.signal)
        .then((response) => {
          setData(response.data);
          setActiveIndex(hasLocalResults || response.data.total > 0 ? 0 : -1);
        })
        .catch((requestError) => {
          if (controller.signal.aborted) return;
          setData(null);
          setActiveIndex(-1);
          setError(
            requestError instanceof Error
              ? requestError.message
              : 'Não foi possível realizar a busca',
          );
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, 250);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [hasLocalResults, query]);

  function activate(result: { href: string }) {
    onClose();
    router.push(result.href);
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
      return;
    }

    if (flatResults.length === 0) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((current) => (current + 1) % flatResults.length);
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((current) =>
        current <= 0 ? flatResults.length - 1 : current - 1,
      );
      return;
    }

    if (event.key === 'Enter' && activeIndex >= 0) {
      event.preventDefault();
      const result = flatResults[activeIndex];
      if (result) activate(result);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[80] flex items-start justify-center bg-black/45 px-3 pt-[max(5rem,env(safe-area-inset-top))] backdrop-blur-[2px] sm:px-4 sm:pt-[12vh]"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="global-search-title"
        className="w-full max-w-2xl overflow-hidden rounded-[18px] border border-[var(--border)] bg-[var(--surface)] shadow-2xl"
      >
        <header className="flex items-center gap-3 border-b border-[var(--border)] p-3 sm:p-4">
          <FaSearch className="shrink-0 text-[var(--text-muted)]" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <h2 id="global-search-title" className="sr-only">
              Busca global
            </h2>
            <input
              ref={inputRef}
              value={query}
              onChange={(event) => {
                const nextQuery = event.target.value;
                const nextNormalizedQuery = nextQuery
                  .trim()
                  .toLocaleLowerCase('pt-BR');
                const nextHasQuickAction = quickActions.some(
                  (item) =>
                    !nextNormalizedQuery ||
                    item.title
                      .toLocaleLowerCase('pt-BR')
                      .includes(nextNormalizedQuery) ||
                    item.subtitle
                      .toLocaleLowerCase('pt-BR')
                      .includes(nextNormalizedQuery) ||
                    item.keywords
                      .toLocaleLowerCase('pt-BR')
                      .includes(nextNormalizedQuery),
                );
                const nextHasNavigation = getAppNavigation().some(
                  (item) =>
                    !nextNormalizedQuery ||
                    item.label
                      .toLocaleLowerCase('pt-BR')
                      .includes(nextNormalizedQuery) ||
                    item.key
                      .toLocaleLowerCase('pt-BR')
                      .includes(nextNormalizedQuery) ||
                    item.keywords?.toLocaleLowerCase('pt-BR').includes(nextNormalizedQuery),
                );

                setQuery(nextQuery);
                setData(null);
                setError('');
                setActiveIndex(nextHasQuickAction || nextHasNavigation ? 0 : -1);
                setLoading(nextQuery.trim().length >= 2);
              }}
              onKeyDown={onKeyDown}
              aria-label="Buscar em páginas, transações, contas, categorias e regras"
              aria-controls="global-search-results"
              aria-activedescendant={
                activeIndex >= 0 ? `global-search-result-${activeIndex}` : undefined
              }
              placeholder="Buscar páginas, ações, transações e mais"
              className="w-full bg-transparent text-base text-[var(--foreground)] outline-none placeholder:text-[var(--text-subtle)] sm:text-lg"
              autoComplete="off"
            />
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar busca global"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-md)] text-[var(--text-muted)] hover:bg-[var(--surface-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]"
          >
            <FaTimes aria-hidden="true" />
          </button>
        </header>

        <div
          id="global-search-results"
          className="max-h-[min(68vh,560px)] overflow-y-auto p-3 sm:p-4"
          role="listbox"
          aria-label="Resultados da busca global"
        >
          <div className="space-y-4">
            {filteredQuickActions.length > 0 && (
              <section aria-labelledby="global-search-quick-actions">
                <h3
                  id="global-search-quick-actions"
                  className="mb-1.5 px-2 text-xs font-bold uppercase tracking-[0.09em] text-[var(--text-subtle)]"
                >
                  Ações rápidas
                </h3>
                <div className="space-y-1">
                  {filteredQuickActions.map((result) => {
                    const index = flatResults.findIndex(
                      (item) => item.resultKey === 'action-' + result.id,
                    );
                    const Icon = result.icon;
                    const active = index === activeIndex;

                    return (
                      <button
                        key={result.id}
                        id={'global-search-result-' + index}
                        type="button"
                        role="option"
                        aria-selected={active}
                        onMouseEnter={() => setActiveIndex(index)}
                        onClick={() => activate(result)}
                        className={
                          'flex min-h-14 w-full items-center gap-3 rounded-[12px] px-3 py-2 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)] ' +
                          (active
                            ? 'bg-[var(--primary-subtle)]'
                            : 'hover:bg-[var(--surface-hover)]')
                        }
                      >
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[var(--surface-raised)] text-[var(--primary)]">
                          <Icon aria-hidden="true" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <strong className="block truncate text-sm text-[var(--foreground)]">
                            {result.title}
                          </strong>
                          <span className="mt-0.5 block truncate text-xs text-[var(--text-muted)]">
                            {result.subtitle}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>
            )}

            {filteredNavigation.length > 0 && (
              <section aria-labelledby="global-search-navigation">
                <h3
                  id="global-search-navigation"
                  className="mb-1.5 px-2 text-xs font-bold uppercase tracking-[0.09em] text-[var(--text-subtle)]"
                >
                  Ir para
                </h3>
                <div className="space-y-1">
                  {filteredNavigation.map((result) => {
                    const index = flatResults.findIndex(
                      (item) => item.resultKey === 'navigation-' + result.key,
                    );
                    const Icon = result.icon;
                    const active = index === activeIndex;

                    return (
                      <button
                        key={result.key}
                        id={'global-search-result-' + index}
                        type="button"
                        role="option"
                        aria-selected={active}
                        onMouseEnter={() => setActiveIndex(index)}
                        onClick={() => activate(result)}
                        className={
                          'flex min-h-14 w-full items-center gap-3 rounded-[12px] px-3 py-2 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)] ' +
                          (active
                            ? 'bg-[var(--primary-subtle)]'
                            : 'hover:bg-[var(--surface-hover)]')
                        }
                      >
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[var(--surface-raised)] text-[var(--text-muted)]">
                          <Icon aria-hidden="true" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <strong className="block truncate text-sm text-[var(--foreground)]">
                            {result.label}
                          </strong>
                          <span className="mt-0.5 block truncate text-xs text-[var(--text-muted)]">
                            Abrir funcionalidade
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>
            )}

            {query.trim().length >= 2 && loading && (
              <p role="status" className="py-4 text-center text-sm text-[var(--text-muted)]">
                Buscando dados…
              </p>
            )}

            {query.trim().length >= 2 && !loading && error && (
              <p
                role="alert"
                className="rounded-[12px] bg-[var(--danger-subtle)] p-3 text-sm text-[var(--expense)]"
              >
                {error}
              </p>
            )}

            {query.trim().length >= 2 &&
              !loading &&
              !error &&
              data?.groups.map((group) => (
                <section key={group.type} aria-labelledby={'global-search-group-' + group.type}>
                  <h3
                    id={'global-search-group-' + group.type}
                    className="mb-1.5 px-2 text-xs font-bold uppercase tracking-[0.09em] text-[var(--text-subtle)]"
                  >
                    {groupLabels[group.type]}
                  </h3>
                  <div className="space-y-1">
                    {group.items.map((result) => {
                      const index = flatResults.findIndex(
                        (item) =>
                          item.resultKey ===
                          'server-' + result.type + '-' + result.id,
                      );
                      const Icon = resultIcons[result.type];
                      const active = index === activeIndex;

                      return (
                        <button
                          key={result.type + '-' + result.id}
                          id={'global-search-result-' + index}
                          type="button"
                          role="option"
                          aria-selected={active}
                          onMouseEnter={() => setActiveIndex(index)}
                          onClick={() => activate(result)}
                          className={
                            'flex min-h-14 w-full items-center gap-3 rounded-[12px] px-3 py-2 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)] ' +
                            (active
                              ? 'bg-[var(--primary-subtle)]'
                              : 'hover:bg-[var(--surface-hover)]')
                          }
                        >
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[var(--surface-raised)] text-[var(--text-muted)]">
                            <Icon aria-hidden="true" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <strong className="block truncate text-sm text-[var(--foreground)]">
                              {result.title}
                            </strong>
                            {result.subtitle && (
                              <span className="mt-0.5 block truncate text-xs text-[var(--text-muted)]">
                                {result.subtitle}
                              </span>
                            )}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </section>
              ))}

            {query.trim().length === 1 &&
              filteredQuickActions.length === 0 &&
              filteredNavigation.length === 0 && (
                <p className="py-8 text-center text-sm text-[var(--text-muted)]">
                  Digite mais um caractere para buscar também nos seus dados.
                </p>
              )}

            {query.trim().length >= 2 &&
              !loading &&
              !error &&
              (data?.total ?? 0) === 0 &&
              filteredQuickActions.length === 0 &&
              filteredNavigation.length === 0 && (
                <p className="py-8 text-center text-sm text-[var(--text-muted)]">
                  Nenhum resultado encontrado.
                </p>
              )}
          </div>
        </div>

        <footer className="hidden border-t border-[var(--border)] px-4 py-2 text-xs text-[var(--text-subtle)] sm:flex sm:justify-between">
          <span>↑ ↓ navegar · Enter abrir · Esc fechar</span>
          <span>Ctrl/Cmd + K</span>
        </footer>
      </section>
    </div>
  );
}
