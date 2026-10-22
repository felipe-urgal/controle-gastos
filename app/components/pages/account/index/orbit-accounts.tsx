'use client';

import { pageTitleClassName } from '@/app/components/base-pages/page-title';
import { wrappableMoney } from '@/app/lib/currency/wrappable-money';
import { useMediaQuery } from '@/app/hooks/use-media-query';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import {
  FaChevronLeft,
  FaChevronRight,
  FaExternalLinkAlt,
  FaList,
  FaPen,
  FaPlus,
  FaSearch,
} from 'react-icons/fa';

import { PageEmpty, PageLoading } from '@/app/components/feedback';
import { AccountsOverview } from '@/app/components/pages/account/index/accounts-overview';
import { ProtectedRoute } from '@/app/components/layout';
import { Pagination } from '@/app/components/navigation';
import { Button, Chip, ChipRow, IconButton, IconRenderer, Input } from '@/app/components/ui';
import { useAuth } from '@/app/context';
import { useAccounts } from '@/app/hooks/accounts/account-index';
import {
  getAccountPrimaryValue,
  latestAccountTransaction,
  sortAccountTransactions,
} from '@/app/lib/accounts/account-presentation';
import { typeConfig } from '@/app/lib/constants/account.constants';
import { formatCurrency } from '@/app/lib/currency/format-currency';
import type {
  AccountListSummary,
  AccountModel,
  AccountRecentTransaction,
  AccountType,
} from '@/app/types/account';

type AccountFilter = 'all' | AccountType;

const orbitActionTokens =
  '[--focus:var(--orbit-focus)] [--on-primary:var(--orbit-on-primary)] [--primary-hover:var(--orbit-primary-hover)] [--primary-subtle:var(--orbit-primary-subtle)] [--primary:var(--orbit-primary)]';

const typeLabels: Record<AccountType, string> = {
  CREDIT_DEBIT: typeConfig.CREDIT_DEBIT.label,
  INVESTMENT: typeConfig.INVESTMENT.label,
  CREDIT_CARD: typeConfig.CREDIT_CARD.label,
};

function money(amount: number, currency: string, showValues: boolean) {
  return showValues ? wrappableMoney(formatCurrency(amount, currency)) : '••••';
}

function transactionMoney(
  transaction: AccountRecentTransaction | null,
  currency: string,
  showValues: boolean,
) {
  if (!transaction) return '—';
  if (!showValues) return '••••';
  return `${transaction.type === 'INCOME' ? '+' : '-'}${formatCurrency(Number(transaction.amount ?? 0), currency)}`;
}


function MobileAccountsCenter({
  accounts,
  loading,
  showValues,
  summary,
}: {
  accounts: AccountModel[];
  loading: boolean;
  showValues: boolean;
  summary?: AccountListSummary;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedAccount =
    accounts.find((account) => account.id === selectedId) ?? accounts[0] ?? null;
  const selectedIndex = selectedAccount
    ? accounts.findIndex((account) => account.id === selectedAccount.id)
    : -1;
  const otherAccounts = selectedAccount
    ? accounts.filter((account) => account.id !== selectedAccount.id)
    : [];

  function moveSelection(offset: number) {
    if (accounts.length < 2 || selectedIndex < 0) return;
    const nextIndex = (selectedIndex + offset + accounts.length) % accounts.length;
    setSelectedId(accounts[nextIndex].id);
  }

  return (
    <div className="space-y-[22px] pb-3">
      <header className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className={pageTitleClassName}>
            Contas
          </h1>
          <p className="mt-2 text-base text-[var(--text-muted)]">
            Seu dinheiro em um só lugar.
          </p>
        </div>

        <Link
          href="/contas/nova"
          aria-label="Nova conta"
          className="grid h-[52px] w-[52px] shrink-0 place-items-center rounded-full bg-[var(--orbit-primary)] text-[22px] text-white shadow-[0_12px_28px_color-mix(in_srgb,var(--orbit-primary)_28%,transparent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]"
        >
          <FaPlus aria-hidden="true" />
        </Link>
      </header>

      <AccountsOverview
        summary={summary}
        loading={loading}
        showValues={showValues}
        ariaLabel="Resumo das contas no mobile"
      />

      <section aria-labelledby="mobile-accounts-title">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2
            id="mobile-accounts-title"
            className="text-[25px] font-extrabold tracking-tight text-[var(--foreground)]"
          >
            Minhas contas
          </h2>
          {!loading && accounts.length > 0 && (
            <span className="text-sm text-[var(--text-muted)]">
              {selectedIndex + 1} de {accounts.length}
            </span>
          )}
        </div>

        {loading ? (
          <div className="h-[310px] animate-pulse rounded-[26px] border border-[var(--border)] bg-[var(--surface)]" />
        ) : !selectedAccount ? (
          <div className="rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-4">
            <PageEmpty title="Nenhuma conta encontrada" />
            <Link
              href="/contas/nova"
              className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-[11px] bg-[var(--orbit-primary)] px-4 text-sm font-semibold text-white"
            >
              <FaPlus aria-hidden="true" />
              Criar primeira conta
            </Link>
          </div>
        ) : (
          <>
            <div className="relative -mx-4 overflow-hidden px-7 py-0.5">
              {accounts.length > 1 && (
                <>
                  <div
                    className="pointer-events-none absolute inset-y-5 -left-7 w-16 rounded-[24px] border border-[var(--orbit-primary)]/30 bg-[linear-gradient(145deg,color-mix(in_srgb,var(--orbit-primary)_20%,var(--surface))_0%,var(--surface)_100%)] opacity-60"
                    aria-hidden="true"
                  />
                  <div
                    className="pointer-events-none absolute inset-y-5 -right-7 w-16 rounded-[24px] border border-[var(--orbit-primary)]/30 bg-[linear-gradient(215deg,color-mix(in_srgb,var(--orbit-primary)_20%,var(--surface))_0%,var(--surface)_100%)] opacity-60"
                    aria-hidden="true"
                  />
                  <div className="absolute left-1 top-1/2 z-20 -translate-y-1/2">
                    <IconButton
                      label="Conta anterior"
                      icon={<FaChevronLeft />}
                      onClick={() => moveSelection(-1)}
                      className="rounded-full border border-[var(--orbit-primary)]/45 bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] text-[var(--foreground)] shadow-[var(--shadow-surface)] backdrop-blur"
                    />
                  </div>
                  <div className="absolute right-1 top-1/2 z-20 -translate-y-1/2">
                    <IconButton
                      label="Próxima conta"
                      icon={<FaChevronRight />}
                      onClick={() => moveSelection(1)}
                      className="rounded-full border border-[var(--orbit-primary)]/45 bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] text-[var(--foreground)] shadow-[var(--shadow-surface)] backdrop-blur"
                    />
                  </div>
                </>
              )}

              <article className="relative z-10 rounded-[26px] border border-[var(--orbit-primary)] bg-[linear-gradient(145deg,color-mix(in_srgb,var(--orbit-primary)_52%,var(--surface))_0%,color-mix(in_srgb,var(--orbit-primary)_30%,black)_48%,color-mix(in_srgb,var(--surface)_40%,black)_100%)] p-5 shadow-[0_20px_44px_color-mix(in_srgb,var(--orbit-primary)_22%,transparent)]">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-4">
                    <span
                      className="grid h-[64px] w-[64px] shrink-0 place-items-center rounded-[17px] text-2xl text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,.14)]"
                      style={{ backgroundColor: selectedAccount.color || 'var(--text-muted)' }}
                      aria-hidden="true"
                    >
                      <IconRenderer iconName={selectedAccount.icon || 'wallet'} size={27} />
                    </span>
                    <div className="min-w-0">
                      <h3 className="line-clamp-2 break-words text-[23px] font-extrabold text-white">
                        {selectedAccount.name}
                      </h3>
                      <p className="mt-0.5 truncate text-base text-white/70">
                        {typeLabels[selectedAccount.type]}
                      </p>
                      <span
                        className={`mt-2 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${
                          selectedAccount.isActive
                            ? 'border-[var(--income)]/35 bg-[color-mix(in_srgb,var(--income)_14%,transparent)] text-[var(--income)]'
                            : 'border-white/15 bg-white/5 text-white/60'
                        }`}
                      >
                        <span
                          className={`h-2 w-2 rounded-full ${
                            selectedAccount.isActive
                              ? 'bg-[var(--income)]'
                              : 'bg-white/35'
                          }`}
                          aria-hidden="true"
                        />
                        {selectedAccount.isActive ? 'Ativa' : 'Inativa'}
                      </span>
                    </div>
                  </div>

                </div>

                <strong
                  className={`mt-6 block break-words text-[37px] font-extrabold leading-none tracking-tight min-[360px]:text-[39px] ${
                    getAccountPrimaryValue(selectedAccount) < 0 ? 'text-[var(--expense)]' : 'text-white'
                  }`}
                >
                  <span className="money">{money(
                    getAccountPrimaryValue(selectedAccount),
                    selectedAccount.currency,
                    showValues,
                  )}</span>
                </strong>

                <nav
                  className="mt-6 grid grid-cols-3 gap-2"
                  aria-label={`Ações da conta ${selectedAccount.name}`}
                >
                  <Link
                    href={`/transacoes?accountId=${encodeURIComponent(selectedAccount.id)}`}
                    className="inline-flex min-h-[50px] items-center justify-center gap-2 rounded-[14px] border border-white/15 bg-black/10 px-3 text-sm font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]"
                  >
                    <FaList aria-hidden="true" />
                    Transações
                  </Link>
                  <Link
                    href={`/contas/alterar/${selectedAccount.id}`}
                    className="inline-flex min-h-[50px] items-center justify-center gap-2 rounded-[14px] border border-[var(--orbit-primary)]/55 bg-[var(--orbit-primary)]/18 px-3 text-sm font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]"
                  >
                    <FaPen aria-hidden="true" />
                    Editar
                  </Link>
                  <Link
                    href={`/contas/show/${selectedAccount.id}`}
                    className="inline-flex min-h-[50px] items-center justify-center gap-2 rounded-[14px] border border-white/15 bg-black/10 px-2 text-sm font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]"
                  >
                    <FaExternalLinkAlt aria-hidden="true" />
                    Detalhes
                  </Link>
                </nav>
              </article>
            </div>

            {accounts.length > 1 && (
              <div
                className="mt-1 flex max-w-full justify-start overflow-x-auto [scrollbar-width:none] sm:justify-center [&::-webkit-scrollbar]:hidden"
                aria-label="Posição da conta selecionada"
              >
                {accounts.map((account) => (
                  <button
                    key={account.id}
                    type="button"
                    onClick={() => setSelectedId(account.id)}
                    aria-label={`Selecionar conta ${account.name}`}
                    aria-pressed={account.id === selectedAccount.id}
                    className="grid h-11 w-11 shrink-0 place-items-center"
                  >
                    <span
                      className={`block h-2.5 w-2.5 rounded-full transition-colors ${
                        account.id === selectedAccount.id
                          ? 'bg-[var(--orbit-primary)]'
                          : 'bg-[var(--border-strong)]'
                      }`}
                      aria-hidden="true"
                    />
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </section>

      {!loading && otherAccounts.length > 0 && (
        <section aria-labelledby="mobile-other-accounts-title">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2
              id="mobile-other-accounts-title"
              className="text-xl font-extrabold tracking-tight text-[var(--foreground)]"
            >
              Outras contas
            </h2>
            <span className="text-sm text-[var(--text-muted)]">
              {otherAccounts.length} {otherAccounts.length === 1 ? 'conta' : 'contas'}
            </span>
          </div>

          <div className="space-y-2.5">
            {otherAccounts.map((account) => (
              <button
                key={account.id}
                type="button"
                onClick={() => setSelectedId(account.id)}
                aria-label={`Destacar conta ${account.name}`}
                className="flex min-h-[78px] w-full items-center gap-3 rounded-[17px] border border-[var(--border)] bg-[var(--surface)] p-3 text-left transition-colors hover:bg-[var(--surface-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]"
              >
                <span
                  className="grid h-12 w-12 shrink-0 place-items-center rounded-[13px] text-white"
                  style={{ backgroundColor: account.color || 'var(--text-muted)' }}
                  aria-hidden="true"
                >
                  <IconRenderer iconName={account.icon || 'wallet'} size={21} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 break-words text-base font-bold">{account.name}</p>
                  <p className="mt-0.5 truncate text-sm text-[var(--text-muted)]">
                    {typeLabels[account.type]}
                  </p>
                </div>
                <strong
                  className={`shrink-0 text-right text-base font-bold ${
                    getAccountPrimaryValue(account) < 0 ? 'text-[var(--expense)]' : 'text-[var(--foreground)]'
                  }`}
                >
                  <span className="money">{money(getAccountPrimaryValue(account), account.currency, showValues)}</span>
                </strong>
                <FaChevronRight
                  className="shrink-0 text-[var(--text-muted)]"
                  aria-hidden="true"
                />
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

export default function OrbitAccounts() {
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const { user } = useAuth();
  const showValues = user?.showValues !== false;
  const {
    loading,
    error,
    accounts,
    page,
    setPage,
    pageSize,
    setPageSize,
    total,
    totalPages,
    hasPagination,
    summary,
    refetch,
    filters,
    setFilters,
  } = useAccounts();

  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);

  const selectedAccount =
    accounts.find((account) => account.id === selectedAccountId) ?? accounts[0] ?? null;

  const accountSummary = summary as AccountListSummary | undefined;
  const grouped = useMemo(
    () =>
      [
        {
          key: 'credit-debit',
          title: 'Bancos e carteiras',
          items: accounts.filter((account) => account.type === 'CREDIT_DEBIT'),
        },
        {
          key: 'investment',
          title: 'Investimentos',
          items: accounts.filter((account) => account.type === 'INVESTMENT'),
        },
        {
          key: 'credit-card',
          title: 'Cartões de crédito',
          items: accounts.filter((account) => account.type === 'CREDIT_CARD'),
        },
      ].filter((group) => group.items.length > 0),
    [accounts],
  );

  const accountFilter = (filters.type ?? '') as '' | AccountType;
  const filterOptions: Array<{
    value: AccountFilter;
    queryValue: '' | AccountType;
    label: string;
    count: number;
  }> = [
    { value: 'all', queryValue: '', label: 'Todas', count: accountSummary?.totalCount ?? total ?? 0 },
    {
      value: 'CREDIT_DEBIT',
      queryValue: 'CREDIT_DEBIT',
      label: 'Bancos e carteiras',
      count: accountSummary?.typeCounts.CREDIT_DEBIT ?? 0,
    },
    {
      value: 'INVESTMENT',
      queryValue: 'INVESTMENT',
      label: 'Investimentos',
      count: accountSummary?.typeCounts.INVESTMENT ?? 0,
    },
    {
      value: 'CREDIT_CARD',
      queryValue: 'CREDIT_CARD',
      label: 'Cartões',
      count: accountSummary?.typeCounts.CREDIT_CARD ?? 0,
    },
  ];

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
      : null;

  function selectAccount(account: AccountModel) {
    setSelectedAccountId(account.id);
  }

  return (
    <ProtectedRoute>
      {error && (
        <div
          role="alert"
          className="mb-4 flex flex-col gap-3 rounded-[14px] border border-[var(--danger)]/35 bg-[var(--danger-subtle)] p-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <strong className="text-sm text-[var(--expense)]">Não foi possível carregar as contas</strong>
            <p className="mt-1 text-sm text-[var(--text-muted)]">{error}</p>
          </div>
          <Button
            variant="outline"
            onClick={() => void refetch()}
            disabled={loading}
            className={orbitActionTokens}
          >
            Tentar novamente
          </Button>
        </div>
      )}
      {(!error || accounts.length > 0) && (
        <>
      {!isDesktop && (
      <div>
        <MobileAccountsCenter
          accounts={accounts}
          loading={loading}
          showValues={showValues}
          summary={summary as AccountListSummary | undefined}
        />
        {pagination && (
          <div className="mt-4 rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-3">
            <Pagination {...pagination} loading={loading} />
          </div>
        )}
      </div>
      )}

      {isDesktop && (
      <div>
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className={pageTitleClassName}>
            Contas
          </h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Gerencie seu portfólio de contas com clareza e controle.
          </p>
        </div>

        <div className="hidden flex-wrap gap-2 sm:flex">
          <Button
            variant="outline"
            icon={<FaSearch />}
            onClick={() => document.getElementById('accounts-search')?.focus()}
            className={orbitActionTokens}
          >
            Buscar
          </Button>
          <Button
            as="a"
            href="/contas/nova"
            icon={<FaPlus />}
            className={orbitActionTokens}
          >
            Nova conta
          </Button>
        </div>
      </header>

      <div className="mt-[22px]">
        <AccountsOverview
          summary={accountSummary}
          loading={loading}
          showValues={showValues}
          ariaLabel="Resumo das contas"
        />
      </div>

      <section
        className={`my-[18px] flex flex-col gap-2.5 sm:flex-row sm:items-center ${orbitActionTokens}`}
        aria-label="Buscar e filtrar contas"
      >
        <div className="min-w-0 flex-1">
          <Input
            id="accounts-search"
            value={filters.search ?? ''}
            onChange={(event) =>
              setFilters((previous) => ({ ...previous, search: event.target.value }))
            }
            placeholder="Buscar contas..."
            aria-label="Buscar contas"
            icon={<FaSearch />}
            disabled={loading}
          />
        </div>

        <ChipRow label="Tipos de conta">
          {filterOptions.map((option) => (
            <Chip
              key={option.value}
              selected={accountFilter === option.queryValue}
              onClick={() => setFilters((previous) => ({ ...previous, type: option.queryValue }))}
            >
              {option.label} · {option.count}
            </Chip>
          ))}
        </ChipRow>
      </section>

      <div className="grid min-w-0 items-start gap-4 grid-cols-[minmax(520px,1.2fr)_minmax(390px,.9fr)]">
        <section
          className={`overflow-hidden rounded-[18px] border border-[var(--border)] bg-[var(--surface)] ${orbitActionTokens}`}
          aria-label="Portfólio de contas"
        >
          {loading ? (
            <div className="p-4">
              <PageLoading type="list" />
            </div>
          ) : accounts.length === 0 ? (
            <div className="p-4">
              <PageEmpty title="Nenhuma conta encontrada" />
            </div>
          ) : (
            grouped.map((group) => (
              <section key={group.key} aria-label={group.title}>
                <h2 className="px-[18px] pb-2 pt-4 text-sm font-bold text-[var(--text-muted)]">
                  {group.title}
                </h2>
                {group.items.map((account) => (
                  <AccountRow
                    key={account.id}
                    account={account}
                    selected={account.id === selectedAccount?.id}
                    showValues={showValues}
                    onSelect={selectAccount}
                  />
                ))}
              </section>
            ))
          )}

          {pagination && (
            <div className="border-t border-[var(--border)] p-3">
              <Pagination {...pagination} loading={loading} />
            </div>
          )}
        </section>

        {selectedAccount && (
          <>
            <aside
              className={`sticky top-[18px] block max-h-[calc(100vh-36px)] overflow-y-auto rounded-[18px] border border-[var(--border)] bg-[var(--surface)] ${orbitActionTokens}`}
              aria-label={`Detalhe da conta ${selectedAccount.name}`}
            >
              <AccountDetail account={selectedAccount} showValues={showValues} />
            </aside>
          </>
        )}
      </div>

      </div>
      )}
        </>
      )}
    </ProtectedRoute>
  );
}

function AccountRow({
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
  const latest = latestAccountTransaction(account);
  const displayedValue =
    account.type === 'CREDIT_CARD'
      ? account.creditLimit ?? 0
      : getAccountPrimaryValue(account);
  const valueLabel =
    account.type === 'INVESTMENT'
      ? 'Patrimônio'
      : account.type === 'CREDIT_CARD'
        ? 'Limite'
        : 'Disponível';

  return (
    <button
      type="button"
      onClick={() => onSelect(account)}
      aria-pressed={selected}
      className={`grid min-h-[68px] w-full grid-cols-[minmax(0,1fr)_105px_20px] items-center gap-2 border-t border-[var(--border)] px-3.5 py-3 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--focus)] sm:grid-cols-[minmax(0,1fr)_150px_100px_34px] sm:gap-3.5 sm:px-[18px] ${
        selected
          ? 'bg-[var(--orbit-primary-subtle)] shadow-[inset_3px_0_0_var(--orbit-primary)]'
          : 'hover:bg-[var(--surface-hover)]'
      }`}
    >
      <div className="flex min-w-0 items-center gap-3">
        <span
          className="grid h-[38px] w-[38px] shrink-0 place-items-center rounded-[11px] text-white"
          style={{ backgroundColor: account.color || 'var(--text-muted)' }}
          aria-hidden="true"
        >
          <IconRenderer iconName={account.icon || 'wallet'} size={18} />
        </span>
        <div className="min-w-0">
          <p className="line-clamp-2 break-words text-sm font-bold sm:text-base">{account.name}</p>
          <p className="mt-0.5 truncate text-xs text-[var(--text-muted)]">
            {typeLabels[account.type]} · {account.currency}
          </p>
        </div>
      </div>

      <div className="text-right sm:text-left">
        <p
          className={`truncate text-sm font-bold sm:text-base ${
            account.type === 'CREDIT_CARD'
              ? 'text-[var(--foreground)]'
              : displayedValue < 0
                ? 'text-[var(--expense)]'
                : 'text-[var(--income)]'
          }`}
        >
          <span className="money">{money(displayedValue, account.currency, showValues)}</span>
        </p>
        <small className="text-xs text-[var(--text-muted)]">
          {valueLabel}
        </small>
      </div>

      <div className="hidden min-w-0 sm:block">
        <small className="text-xs text-[var(--text-muted)]">
          {latest ? 'Recente' : 'Sem atividade'}
        </small>
        <p
          className={`truncate text-xs font-semibold ${
            latest?.type === 'INCOME'
              ? 'text-[var(--income)]'
              : latest
                ? 'text-[var(--expense)]'
                : 'text-[var(--text-muted)]'
          }`}
        >
          {latest ? transactionMoney(latest, account.currency, showValues) : '—'}
        </p>
      </div>

      <FaChevronRight className="justify-self-end text-[var(--text-muted)]" aria-hidden="true" />
    </button>
  );
}

function AccountDetail({ account, showValues }: { account: AccountModel; showValues: boolean }) {
  const recent = sortAccountTransactions(account.transactions).slice(0, 6);
  const latest = recent[0] ?? null;
  const displayedValue =
    account.type === 'CREDIT_CARD'
      ? account.creditLimit ?? 0
      : getAccountPrimaryValue(account);
  const valueLabel =
    account.type === 'INVESTMENT'
      ? 'VALOR DA POSIÇÃO'
      : account.type === 'CREDIT_CARD'
        ? 'LIMITE TOTAL'
        : 'SALDO DISPONÍVEL';

  return (
    <div className="p-4 sm:p-5">
      <header className="flex items-start justify-between gap-3 ">
        <div className="flex min-w-0 items-center gap-3">
          <span
            className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] text-white"
            style={{ backgroundColor: account.color || 'var(--text-muted)' }}
            aria-hidden="true"
          >
            <IconRenderer iconName={account.icon || 'wallet'} size={20} />
          </span>
          <div className="min-w-0">
            <h2 className="truncate text-xl font-bold sm:text-[22px]">{account.name}</h2>
            <p className="mt-0.5 truncate text-xs text-[var(--text-muted)]">
              {typeLabels[account.type]} · {account.currency}
            </p>
          </div>
        </div>

        <span
          className={`inline-flex rounded-full border px-2 py-1 text-xs font-semibold ${
            account.isActive
              ? 'border-[var(--income)]/35 bg-[color-mix(in_srgb,var(--income)_12%,transparent)] text-[var(--income)]'
              : 'border-[var(--border)] text-[var(--text-muted)]'
          }`}
        >
          {account.isActive ? 'Ativa' : 'Inativa'}
        </span>
      </header>

      <section
        className="my-[18px] grid gap-3 sm:grid-cols-[1.3fr_.9fr]"
        aria-label="Saldo e atividade da conta"
      >
        <article className="rounded-[14px] border border-[var(--border)] bg-[var(--surface-raised)] p-[15px]">
          <p className="text-xs text-[var(--text-muted)]">{valueLabel}</p>
          <strong
            className={`mt-2 block break-words text-[27px] font-extrabold sm:text-[31px] ${
              account.type === 'CREDIT_CARD'
              ? 'text-[var(--foreground)]'
              : displayedValue < 0
                ? 'text-[var(--expense)]'
                : 'text-[var(--income)]'
            }`}
          >
            <span className="money">{money(getAccountPrimaryValue(account), account.currency, showValues)}</span>
          </strong>
          <small className="mt-1 block text-xs text-[var(--text-muted)]">
            {account.type === 'CREDIT_CARD'
              ? 'Consulte faturas para valores em aberto e limite utilizado'
              : account.type === 'INVESTMENT'
                ? 'Valor atual das posições da conta'
                : 'Derivado de movimentações concluídas'}
          </small>
        </article>

        <article className="rounded-[14px] border border-[var(--border)] bg-[var(--surface-raised)] p-[15px]">
          <p className="text-xs text-[var(--text-muted)]">ATIVIDADE RECENTE</p>
          <strong
            className={`mt-2 block text-xl font-bold ${
              latest?.type === 'INCOME'
                ? 'text-[var(--income)]'
                : latest
                  ? 'text-[var(--expense)]'
                  : ''
            }`}
          >
            {latest ? transactionMoney(latest, account.currency, showValues) : '—'}
          </strong>
          <small className="mt-1 block truncate text-xs text-[var(--text-muted)]">
            {latest?.description ?? 'Nenhuma movimentação'}
          </small>
        </article>
      </section>

      <nav className="grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label="Ações da conta">
        <Link
          href={`/contas/alterar/${account.id}`}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[10px] border border-[var(--orbit-primary)]/40 bg-[var(--orbit-primary-subtle)] px-2 text-sm font-semibold text-[var(--orbit-primary)]"
        >
          <FaPen aria-hidden="true" /> Editar
        </Link>
        <Link
          href={`/transacoes?accountId=${encodeURIComponent(account.id)}`}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[10px] border border-[var(--border)] bg-[var(--surface-raised)] px-2 text-sm font-semibold"
        >
          <FaList aria-hidden="true" /> Transações
        </Link>
        <Link
          href="/transacoes/nova"
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[10px] border border-[var(--border)] bg-[var(--surface-raised)] px-2 text-sm font-semibold"
        >
          <FaPlus aria-hidden="true" /> Lançar
        </Link>
        <Link
          href={`/contas/show/${account.id}`}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[10px] border border-[var(--border)] bg-[var(--surface-raised)] px-2 text-sm font-semibold"
        >
          <FaExternalLinkAlt aria-hidden="true" /> {account.type === 'CREDIT_CARD' ? 'Faturas' : 'Mais'}
        </Link>
      </nav>

      <section
        className="mt-[18px] rounded-[14px] border border-[var(--border)] bg-[var(--surface-raised)] p-[15px]"
        aria-labelledby="account-recent-title"
      >
        <div className="flex items-center justify-between gap-3">
          <p id="account-recent-title" className="text-xs text-[var(--text-muted)]">
            ÚLTIMAS TRANSAÇÕES
          </p>
          <Link
            href={`/transacoes?accountId=${encodeURIComponent(account.id)}`}
            className="rounded-[8px] border border-[var(--border)] px-2 py-1.5 text-xs font-semibold"
          >
            Ver todas
          </Link>
        </div>

        {recent.length === 0 ? (
          <p className="mt-3 text-sm text-[var(--text-muted)]">Nenhuma transação vinculada.</p>
        ) : (
          <div className="mt-2 divide-y divide-[var(--border)]">
            {recent.slice(0, 4).map((transaction) => (
              <Link
                key={transaction.id}
                href={`/transacoes/show/${transaction.id}`}
                className="flex items-center justify-between gap-3 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">
                    {transaction.description || 'Sem descrição'}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-[var(--text-muted)]">
                    {transaction.category?.name ?? 'Sem categoria'}
                  </p>
                </div>
                <strong
                  className={`shrink-0 text-sm ${
                    transaction.type === 'INCOME'
                      ? 'text-[var(--income)]'
                      : 'text-[var(--expense)]'
                  }`}
                >
                  {transactionMoney(transaction, account.currency, showValues)}
                </strong>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
