'use client';

import { pageTitleClassName } from '@/app/components/base-pages/page-title';
import { wrappableMoney } from '@/app/lib/currency/wrappable-money';
import Link from 'next/link';
import { useMemo } from 'react';
import { FaChevronRight, FaPlus, FaSearch } from 'react-icons/fa';

import { PageEmpty, PageLoading } from '@/app/components/feedback';
import { AccountsOverview } from '@/app/components/pages/account/index/accounts-overview';
import { ProtectedRoute } from '@/app/components/layout';
import { Pagination } from '@/app/components/navigation';
import { Button, Chip, ChipRow, IconRenderer, Input } from '@/app/components/ui';
import { useAuth } from '@/app/context';
import { useAccounts } from '@/app/hooks/accounts/account-index';
import {
  creditCardRowSummary,
  getAccountPrimaryValue,
  latestAccountTransaction,
} from '@/app/lib/accounts/account-presentation';
import { typeConfig } from '@/app/lib/constants/account.constants';
import { formatCurrency } from '@/app/lib/currency/format-currency';
import type {
  AccountListSummary,
  AccountModel,
  AccountRecentTransaction,
  AccountType,
} from '@/app/types/account';

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


function groupAccounts(accounts: AccountModel[], summary: AccountListSummary | undefined) {
  return [
    {
      key: 'credit-debit',
      title: 'Bancos e carteiras',
      items: accounts.filter((account) => account.type === 'CREDIT_DEBIT'),
      total: groupTotal(summary?.bankBalancesByCurrency),
      totalLabel: '',
    },
    {
      key: 'credit-card',
      title: 'Cartões de crédito',
      items: accounts.filter((account) => account.type === 'CREDIT_CARD'),
      total: groupTotal(summary?.openStatementsByCurrency),
      totalLabel: 'em fatura',
    },
    {
      key: 'investment',
      title: 'Investimentos',
      items: accounts.filter((account) => account.type === 'INVESTMENT'),
      total: groupTotal(summary?.investmentBalancesByCurrency),
      totalLabel: '',
    },
  ].filter((group) => group.items.length > 0);
}

/** Subtotal do grupo só quando há uma moeda: somar moedas diferentes seria um número sem sentido. */
function groupTotal(items: Array<{ currency: string; value: number }> | undefined) {
  return items && items.length === 1 && items[0].value !== 0 ? items[0] : null;
}

/** A busca e os filtros só compensam com uma lista longa; com filtro ativo continuam visíveis para poder limpá-lo. */
const FILTERS_MIN_ACCOUNTS = 6;

export default function OrbitAccounts() {
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

  const accountSummary = summary as AccountListSummary | undefined;
  const grouped = useMemo(() => groupAccounts(accounts, accountSummary), [accounts, accountSummary]);

  const accountFilter = (filters.type ?? '') as '' | AccountType;
  const totalCount = accountSummary?.totalCount ?? total ?? 0;
  const filtering = Boolean(filters.search) || accountFilter !== '';
  const showFilters = totalCount > FILTERS_MIN_ACCOUNTS || filtering;
  const filterOptions: Array<{ queryValue: '' | AccountType; label: string; count: number }> = [
    { queryValue: '', label: 'Todas', count: totalCount },
    { queryValue: 'CREDIT_DEBIT', label: 'Bancos e carteiras', count: accountSummary?.typeCounts.CREDIT_DEBIT ?? 0 },
    { queryValue: 'INVESTMENT', label: 'Investimentos', count: accountSummary?.typeCounts.INVESTMENT ?? 0 },
    { queryValue: 'CREDIT_CARD', label: 'Cartões', count: accountSummary?.typeCounts.CREDIT_CARD ?? 0 },
  ];

  const pagination =
    hasPagination && totalPages && totalPages > 1
      ? { page, pageSize, total, totalPages, onPageChange: setPage, onPageSizeChange: setPageSize }
      : null;

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
          <Button variant="outline" onClick={() => void refetch()} disabled={loading} className={orbitActionTokens}>
            Tentar novamente
          </Button>
        </div>
      )}

      {(!error || accounts.length > 0) && (
        <div className="space-y-[18px] pb-3">
          <header className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className={pageTitleClassName}>Contas</h1>
              <p className="mt-1 text-sm text-[var(--text-muted)] sm:text-base">Seu dinheiro em um só lugar.</p>
            </div>
            <div className="hidden sm:block">
              <Button as="a" href="/contas/nova" icon={<FaPlus />} className={orbitActionTokens}>
                Nova conta
              </Button>
            </div>
            <Link
              href="/contas/nova"
              aria-label="Nova conta"
              className="grid h-[52px] w-[52px] shrink-0 place-items-center rounded-full bg-[var(--orbit-primary)] text-[22px] text-white shadow-[0_12px_28px_color-mix(in_srgb,var(--orbit-primary)_28%,transparent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)] sm:hidden"
            >
              <FaPlus aria-hidden="true" />
            </Link>
          </header>

          <AccountsOverview summary={accountSummary} loading={loading} showValues={showValues} ariaLabel="Resumo das contas" />

          {showFilters && (
            <section
              className={`flex flex-col gap-2.5 sm:flex-row sm:items-center ${orbitActionTokens}`}
              aria-label="Buscar e filtrar contas"
            >
              <div className="min-w-0 flex-1">
                <Input
                  id="accounts-search"
                  value={filters.search ?? ''}
                  onChange={(event) => setFilters((previous) => ({ ...previous, search: event.target.value }))}
                  placeholder="Buscar contas..."
                  aria-label="Buscar contas"
                  icon={<FaSearch />}
                  disabled={loading}
                />
              </div>
              <ChipRow label="Tipos de conta">
                {filterOptions.map((option) => (
                  <Chip
                    key={option.queryValue || 'all'}
                    selected={accountFilter === option.queryValue}
                    onClick={() => setFilters((previous) => ({ ...previous, type: option.queryValue }))}
                  >
                    {option.label} · {option.count}
                  </Chip>
                ))}
              </ChipRow>
            </section>
          )}

          <section
            className={`overflow-hidden rounded-[18px] border border-[var(--border)] bg-[var(--surface)] ${orbitActionTokens}`}
            aria-label="Minhas contas"
          >
            {loading ? (
              <div className="p-4">
                <PageLoading type="list" />
              </div>
            ) : accounts.length === 0 ? (
              <div className="p-4">
                <PageEmpty title="Nenhuma conta encontrada" />
                {!filtering && (
                  <Link
                    href="/contas/nova"
                    className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-[11px] bg-[var(--orbit-primary)] px-4 text-sm font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)] sm:w-auto"
                  >
                    <FaPlus aria-hidden="true" />
                    Criar primeira conta
                  </Link>
                )}
              </div>
            ) : (
              grouped.map((group) => (
                <section key={group.key} aria-label={group.title}>
                  <h2 className="flex items-baseline justify-between gap-3 px-3.5 pb-2 pt-4 text-sm font-bold text-[var(--text-muted)] sm:px-[18px]">
                    {group.title}
                    {group.total && (
                      <span className="money text-xs font-medium">
                        {money(group.total.value, group.total.currency, showValues)}
                        {group.totalLabel ? ` ${group.totalLabel}` : ''}
                      </span>
                    )}
                  </h2>
                  {group.items.map((account) => (
                    <AccountRow key={account.id} account={account} showValues={showValues} />
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
        </div>
      )}
    </ProtectedRoute>
  );
}

function dueShortLabel(date: { month: number; day: number }) {
  return `${String(date.day).padStart(2, '0')}/${String(date.month).padStart(2, '0')}`;
}

const rowMeterTone = { ok: 'bg-[var(--orbit-primary)]', near: 'bg-[var(--warning)]', over: 'bg-[var(--expense)]' } as const;

function AccountRow({
  account,
  showValues,
}: {
  account: AccountModel;
  showValues: boolean;
}) {
  const latest = latestAccountTransaction(account);
  const card = creditCardRowSummary(account);
  const displayedValue = card ? card.statementAmount ?? 0 : getAccountPrimaryValue(account);
  const valueLabel = card
    ? card.statementDueDate
      ? `Fatura · vence ${dueShortLabel(card.statementDueDate)}`
      : 'Sem fatura aberta'
    : account.type === 'INVESTMENT'
      ? 'Patrimônio'
      : 'Disponível';
  const negative = account.type === 'CREDIT_DEBIT' && account.balance < 0;
  const flag = !account.isActive ? 'Inativa' : card && card.overdueCount > 0 ? 'Fatura vencida' : negative ? 'Negativa' : null;
  const flagClass = flag === 'Inativa' ? 'text-[var(--text-muted)]' : 'text-[var(--expense)]';

  const rowClass = `grid min-h-[68px] w-full grid-cols-[minmax(0,1fr)_minmax(105px,auto)_20px] items-center gap-2 border-t border-[var(--border)] px-3.5 py-3 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--focus)] sm:grid-cols-[minmax(0,1fr)_minmax(120px,auto)_minmax(70px,.5fr)_20px] hover:bg-[var(--surface-hover)]`;
  const content = (
    <>
      <div className="flex min-w-0 items-center gap-3">
        <span
          className="grid h-[38px] w-[38px] shrink-0 place-items-center rounded-[11px] text-white"
          style={{ backgroundColor: account.color || 'var(--text-muted)' }}
          aria-hidden="true"
        >
          <IconRenderer iconName={account.icon || 'wallet'} size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 break-words text-sm font-bold sm:text-base">
            {account.name}
            {flag && <span className={`ml-2 align-middle text-xs font-semibold ${flagClass}`}>{flag}</span>}
          </p>
          {card ? (
            <>
              <p className="mt-0.5 truncate text-xs text-[var(--text-muted)]">
                <span className="money">{money(card.usedLimit, account.currency, showValues)}</span>
                {card.creditLimit !== null && (
                  <>
                    {' '}de <span className="money">{money(card.creditLimit, account.currency, showValues)}</span>
                  </>
                )}{' '}
                usados
              </p>
              {card.usedPercent !== null && (
                <div
                  className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[var(--surface-subtle)]"
                  role="img"
                  aria-label={`${card.usedPercent}% do limite usado`}
                >
                  <span className={`block h-full rounded-full ${rowMeterTone[card.tone]}`} style={{ width: `${Math.min(100, card.usedPercent)}%` }} />
                </div>
              )}
            </>
          ) : (
            <p className="mt-0.5 truncate text-xs text-[var(--text-muted)]">
              {typeLabels[account.type]} · {account.currency}
            </p>
          )}
        </div>
      </div>
      <div className="text-right sm:text-left">
        <p
          className={`truncate text-sm font-bold sm:text-base ${
            card || account.type === 'CREDIT_CARD'
              ? 'text-[var(--foreground)]'
              : displayedValue < 0
                ? 'text-[var(--expense)]'
                : 'text-[var(--income)]'
          }`}
        >
          <span className="money">{card && card.statementAmount === null ? '—' : money(displayedValue, account.currency, showValues)}</span>
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
          <span className="money">{latest ? transactionMoney(latest, account.currency, showValues) : '—'}</span>
        </p>
      </div>
      <FaChevronRight className="justify-self-end text-[var(--text-muted)]" aria-hidden="true" />
    </>
  );

  return (
    <Link href={`/contas/show/${encodeURIComponent(account.id)}`} className={rowClass}>
      {content}
    </Link>
  );
}
