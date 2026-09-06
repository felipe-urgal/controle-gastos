'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { FaChevronRight, FaPlus, FaSearch, FaTimes } from 'react-icons/fa';

import { PageEmpty, PageLoading } from '@/app/components/feedback';
import { ProtectedRoute } from '@/app/components/layout';
import { Pagination } from '@/app/components/navigation';
import { AccountInfo } from '@/app/components/pages/account';
import { Button, IconRenderer, Input } from '@/app/components/ui';
import { useAuth } from '@/app/context';
import { useAccounts } from '@/app/hooks/accounts/account-index';
import { typeConfig } from '@/app/lib/constants/account.constants';
import { formatCurrency } from '@/app/lib/currency/format-currency';
import type { AccountModel, AccountType } from '@/app/types/account';

const accountTypeFilters: { value: '' | AccountType; label: string }[] = [
  { value: '', label: 'Todas' },
  { value: 'CREDIT_DEBIT', label: 'Contas correntes' },
  { value: 'INVESTMENT', label: 'Investimentos' },
];

const typeLabels: Record<string, string> = {
  CREDIT_DEBIT: typeConfig.CREDIT_DEBIT.label,
  INVESTMENT: typeConfig.INVESTMENT.label,
};

export default function Index() {
  const { user } = useAuth();
  const showValues = user?.showValues !== false;
  const {
    loading,
    accounts,
    page,
    setPage,
    pageSize,
    setPageSize,
    total,
    totalPages,
    hasPagination,
    filters,
    setFilters,
  } = useAccounts();

  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);
  const detailCloseRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (accounts.length === 0) {
      setSelectedAccountId(null);
      return;
    }

    if (!selectedAccountId || !accounts.some((account) => account.id === selectedAccountId)) {
      setSelectedAccountId(accounts[0].id);
    }
  }, [accounts, selectedAccountId]);

  useEffect(() => {
    if (!mobileDetailOpen) return;
    const media = window.matchMedia('(max-width: 1023px)');
    if (!media.matches) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const frame = window.requestAnimationFrame(() => detailCloseRef.current?.focus());

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      setMobileDetailOpen(false);
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      window.requestAnimationFrame(() => previousFocusRef.current?.focus());
    };
  }, [mobileDetailOpen]);

  const selectedAccount = useMemo(
    () => accounts.find((account) => account.id === selectedAccountId) ?? accounts[0] ?? null,
    [accounts, selectedAccountId],
  );

  const pagination =
    hasPagination && totalPages && totalPages > 1
      ? {
          page,
          pageSize,
          total,
          totalPages,
          onPageChange: setPage,
          onPageSizeChange: setPageSize,
        }
      : undefined;

  function handleSelectAccount(account: AccountModel) {
    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setSelectedAccountId(account.id);
    setMobileDetailOpen(true);
  }

  return (
    <ProtectedRoute>
      <header className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--orbit-primary)]">
            Portfólio de contas
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-[var(--foreground)]">Contas</h1>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-[var(--text-muted)]">
            Saldo atual e contexto da conta primeiro. Cada moeda permanece isolada e o saldo continua derivado das movimentações concluídas.
          </p>
        </div>

        <Button as="a" href="/contas/nova" icon={<FaPlus />} disabled={loading}>
          Nova conta
        </Button>
      </header>

      <section className="mb-4" aria-label="Buscar e filtrar contas">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="w-full lg:max-w-md">
            <Input
              value={filters.search ?? ''}
              onChange={(event) =>
                setFilters((previous) => ({
                  ...previous,
                  search: event.target.value,
                }))
              }
              placeholder="Buscar contas..."
              aria-label="Buscar contas"
              icon={<FaSearch />}
              disabled={loading}
            />
          </div>

          <div
            className="flex max-w-full gap-1 overflow-x-auto rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] p-1"
            role="group"
            aria-label="Filtrar por tipo de conta"
          >
            {accountTypeFilters.map((option) => {
              const active = (filters.type ?? '') === option.value;
              return (
                <button
                  key={option.value || 'all'}
                  type="button"
                  aria-pressed={active}
                  onClick={() =>
                    setFilters((previous) => ({
                      ...previous,
                      type: option.value,
                    }))
                  }
                  className={`min-h-10 whitespace-nowrap rounded-[var(--radius-sm)] px-3 py-2 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)] ${
                    active
                      ? 'bg-[var(--primary-subtle)] text-[var(--orbit-primary)]'
                      : 'text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]'
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>

        {!loading && typeof total === 'number' && (
          <p className="mt-2 text-sm text-[var(--text-muted)]" role="status">
            {total} {total === 1 ? 'conta encontrada' : 'contas encontradas'}
          </p>
        )}
      </section>

      <div className="grid min-w-0 items-start gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(420px,1.1fr)]">
        <section className="ds-panel min-w-0 overflow-hidden" aria-labelledby="accounts-list-title">
          <div className="border-b border-[var(--border)] px-4 py-3 sm:px-5">
            <h2 id="accounts-list-title" className="text-lg font-semibold text-[var(--foreground)]">
              Contas do portfólio
            </h2>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Selecione uma conta para manter o detalhe ao lado sem perder o restante do portfólio.
            </p>
          </div>

          {loading ? (
            <div className="p-4">
              <PageLoading type="list" />
            </div>
          ) : accounts.length === 0 ? (
            <div className="p-4">
              <PageEmpty title="Nenhuma conta encontrada" />
            </div>
          ) : (
            <div className="divide-y divide-[var(--border)]">
              {accounts.map((account) => (
                <AccountPortfolioRow
                  key={account.id}
                  account={account}
                  selected={account.id === selectedAccount?.id}
                  showValues={showValues}
                  onSelect={handleSelectAccount}
                />
              ))}
            </div>
          )}

          {pagination && (
            <div className="border-t border-[var(--border)] p-3 sm:p-4">
              <Pagination
                page={pagination.page}
                pageSize={pagination.pageSize}
                total={pagination.total}
                totalPages={pagination.totalPages}
                onPageChange={pagination.onPageChange}
                onPageSizeChange={pagination.onPageSizeChange}
                loading={loading}
              />
            </div>
          )}
        </section>

        {selectedAccount && (
          <>
            {mobileDetailOpen && (
              <button
                type="button"
                className="fixed inset-0 z-40 bg-[var(--overlay)] lg:hidden"
                onClick={() => setMobileDetailOpen(false)}
                aria-label="Fechar detalhe da conta"
                tabIndex={-1}
              />
            )}

            <aside
              className={`${
                mobileDetailOpen
                  ? 'fixed inset-x-0 bottom-0 z-50 max-h-[86dvh] overflow-y-auto rounded-t-[var(--radius-xl)] border border-[var(--border-strong)] bg-[var(--background)] p-3 shadow-[var(--shadow-surface)]'
                  : 'hidden'
              } lg:sticky lg:top-4 lg:block lg:max-h-none lg:overflow-visible lg:rounded-none lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none`}
              aria-label={`Detalhe da conta ${selectedAccount.name}`}
            >
              <div className="mb-2 flex items-center justify-between gap-3 px-1 lg:hidden">
                <p className="text-sm font-semibold uppercase tracking-[0.12em] text-[var(--orbit-primary)]">
                  Detalhe da conta
                </p>
                <button
                  ref={detailCloseRef}
                  type="button"
                  onClick={() => setMobileDetailOpen(false)}
                  aria-label="Fechar detalhe"
                  className="flex h-11 w-11 items-center justify-center rounded-[var(--radius-md)] text-[var(--text-muted)] hover:bg-[var(--surface-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]"
                >
                  <FaTimes aria-hidden="true" />
                </button>
              </div>

              <AccountInfo account={selectedAccount} isDeleting={false} typeLabels={typeLabels} />
            </aside>
          </>
        )}
      </div>
    </ProtectedRoute>
  );
}

function AccountPortfolioRow({
  account,
  selected,
  showValues,
  onSelect,
}: {
  account: AccountModel;
  selected: boolean;
  showValues: boolean;
  onSelect: (account: AccountModel) => void;
}) {
  const balance = showValues ? formatCurrency(account.balance, account.currency) : '••••';

  return (
    <button
      type="button"
      onClick={() => onSelect(account)}
      aria-pressed={selected}
      className={`grid w-full min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-4 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--focus)] sm:px-5 ${
        selected
          ? 'bg-[var(--primary-subtle)] shadow-[inset_3px_0_0_var(--orbit-primary)]'
          : 'hover:bg-[var(--surface-hover)]'
      }`}
    >
      <div className="flex min-w-0 items-center gap-3">
        <span
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-md)] text-white"
          style={{ backgroundColor: account.color || '#64748B' }}
          aria-hidden="true"
        >
          <IconRenderer iconName={account.icon || 'wallet'} size={18} />
        </span>
        <div className="min-w-0">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <span className="truncate text-base font-semibold text-[var(--foreground)]">{account.name}</span>
            {!account.isActive && (
              <span className="rounded-full border border-[var(--border-strong)] px-2 py-0.5 text-sm font-semibold text-[var(--text-muted)]">
                Inativa
              </span>
            )}
          </div>
          <p className="mt-0.5 truncate text-sm text-[var(--text-muted)]">
            {typeLabels[account.type]} · {account.currency}
          </p>
        </div>
      </div>

      <div className="flex min-w-0 items-center gap-2">
        <div className="min-w-0 text-right">
          <p
            className={`break-words text-base font-bold ${
              account.balance < 0 ? 'text-[var(--expense)]' : 'text-[var(--foreground)]'
            }`}
          >
            {balance}
          </p>
          <p className="text-sm text-[var(--text-muted)]">Saldo atual</p>
        </div>
        <FaChevronRight className="shrink-0 text-[var(--text-subtle)]" aria-hidden="true" />
      </div>
    </button>
  );
}
