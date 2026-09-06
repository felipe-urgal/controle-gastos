'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  FaChevronRight,
  FaExternalLinkAlt,
  FaList,
  FaPen,
  FaPlus,
  FaSearch,
  FaTimes,
} from 'react-icons/fa';

import { PageEmpty, PageLoading } from '@/app/components/feedback';
import { ProtectedRoute } from '@/app/components/layout';
import { Pagination } from '@/app/components/navigation';
import { Button, IconRenderer, Input } from '@/app/components/ui';
import { useAuth } from '@/app/context';
import { useAccounts } from '@/app/hooks/accounts/account-index';
import { typeConfig } from '@/app/lib/constants/account.constants';
import { formatCurrency } from '@/app/lib/currency/format-currency';
import type { AccountModel, AccountType } from '@/app/types/account';

type AccountFilter = 'all' | 'CREDIT_DEBIT' | 'INVESTMENT';

const typeLabels: Record<AccountType, string> = {
  CREDIT_DEBIT: typeConfig.CREDIT_DEBIT.label,
  INVESTMENT: typeConfig.INVESTMENT.label,
};

function transactionDateKey(transaction: any) {
  if (transaction?.year && transaction?.month && transaction?.day) {
    return transaction.year * 10000 + transaction.month * 100 + transaction.day;
  }
  const parsed = Date.parse(transaction?.updatedAt ?? transaction?.createdAt ?? '');
  return Number.isNaN(parsed) ? 0 : parsed;
}

function sortedTransactions(account: AccountModel) {
  return [...(account.transactions ?? [])].sort(
    (left, right) => transactionDateKey(right) - transactionDateKey(left),
  );
}

function latestTransaction(account: AccountModel) {
  return sortedTransactions(account)[0] ?? null;
}

function money(amount: number, currency: string, showValues: boolean) {
  return showValues ? formatCurrency(amount, currency) : '••••';
}

function transactionMoney(transaction: any, currency: string, showValues: boolean) {
  if (!transaction) return '—';
  if (!showValues) return '••••';
  return `${transaction.type === 'INCOME' ? '+' : '-'}${formatCurrency(Number(transaction.amount ?? 0), currency)}`;
}

export default function OrbitAccounts() {
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
  const closeRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const selectedAccount =
    accounts.find((account) => account.id === selectedAccountId) ?? accounts[0] ?? null;

  useEffect(() => {
    if (!mobileDetailOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const frame = window.requestAnimationFrame(() => closeRef.current?.focus());
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

  const balancesByCurrency = useMemo(() => {
    const totals = new Map<string, number>();
    accounts.forEach((account) => {
      totals.set(account.currency, (totals.get(account.currency) ?? 0) + account.balance);
    });
    return [...totals.entries()];
  }, [accounts]);

  const activeCount = accounts.filter((account) => account.isActive).length;
  const negativeAccounts = accounts.filter((account) => account.balance < 0);
  const latestActivity = useMemo(() => {
    return accounts
      .map((account) => ({ account, transaction: latestTransaction(account) }))
      .filter((entry) => entry.transaction)
      .sort((left, right) => transactionDateKey(right.transaction) - transactionDateKey(left.transaction))[0] ?? null;
  }, [accounts]);

  const grouped = useMemo(() => [
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
  ].filter((group) => group.items.length > 0), [accounts]);

  const accountFilter = (filters.type ?? '') as '' | AccountType;
  const filterOptions: Array<{ value: AccountFilter; queryValue: '' | AccountType; label: string; count: number }> = [
    { value: 'all', queryValue: '', label: 'Todas', count: accounts.length },
    { value: 'CREDIT_DEBIT', queryValue: 'CREDIT_DEBIT', label: 'Bancos e carteiras', count: accounts.filter((account) => account.type === 'CREDIT_DEBIT').length },
    { value: 'INVESTMENT', queryValue: 'INVESTMENT', label: 'Investimentos', count: accounts.filter((account) => account.type === 'INVESTMENT').length },
  ];

  const pagination = hasPagination && totalPages && totalPages > 1
    ? { page, pageSize, total, totalPages, onPageChange: setPage, onPageSizeChange: setPageSize }
    : null;

  function selectAccount(account: AccountModel) {
    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setSelectedAccountId(account.id);
    if (window.matchMedia('(max-width: 899px)').matches) setMobileDetailOpen(true);
  }

  return (
    <ProtectedRoute>
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)] sm:text-[30px]">Contas</h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">Gerencie seu portfólio de contas com clareza e controle.</p>
        </div>
        <div className="hidden flex-wrap gap-2 sm:flex">
          <Button variant="outline" icon={<FaSearch />} onClick={() => document.getElementById('accounts-search')?.focus()}>Buscar</Button>
          <Button as="a" href="/contas/nova" icon={<FaPlus />}>Nova conta</Button>
        </div>
      </header>

      <AccountSummary
        balancesByCurrency={balancesByCurrency}
        activeCount={activeCount}
        totalCount={accounts.length}
        negativeAccounts={negativeAccounts}
        latestActivity={latestActivity}
        showValues={showValues}
        loading={loading}
      />

      <section className="my-[18px] flex flex-col gap-2.5 sm:flex-row sm:items-center" aria-label="Buscar e filtrar contas">
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
        <div className="flex max-w-full gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="group" aria-label="Tipos de conta">
          {filterOptions.map((option) => {
            const active = accountFilter === option.queryValue;
            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={active}
                onClick={() => setFilters((previous) => ({ ...previous, type: option.queryValue }))}
                className={`min-h-10 shrink-0 rounded-[10px] border px-3 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)] ${active ? 'border-[var(--orbit-primary)] bg-[var(--primary-subtle)] text-[var(--orbit-primary)]' : 'border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)] hover:text-[var(--foreground)]'}`}
              >
                {option.label} · {option.count}
              </button>
            );
          })}
        </div>
      </section>

      <div className="grid min-w-0 items-start gap-4 min-[900px]:grid-cols-[minmax(520px,1.2fr)_minmax(390px,.9fr)]">
        <section className="overflow-hidden rounded-[18px] border border-[var(--border)] bg-[var(--surface)]" aria-label="Portfólio de contas">
          {loading ? (
            <div className="p-4"><PageLoading type="list" /></div>
          ) : accounts.length === 0 ? (
            <div className="p-4"><PageEmpty title="Nenhuma conta encontrada" /></div>
          ) : (
            grouped.map((group) => (
              <section key={group.key} aria-label={group.title}>
                <h2 className="px-[18px] pb-2 pt-4 text-sm font-bold text-[var(--text-muted)]">{group.title}</h2>
                {group.items.map((account) => (
                  <AccountRow key={account.id} account={account} selected={account.id === selectedAccount?.id} showValues={showValues} onSelect={selectAccount} />
                ))}
              </section>
            ))
          )}
          {pagination && <div className="border-t border-[var(--border)] p-3"><Pagination {...pagination} loading={loading} /></div>}
        </section>

        {selectedAccount && (
          <>
            {mobileDetailOpen && <button type="button" className="fixed inset-0 z-40 bg-[var(--overlay)] min-[900px]:hidden" onClick={() => setMobileDetailOpen(false)} aria-label="Fechar detalhe da conta" tabIndex={-1} />}
            <aside
              className={`${mobileDetailOpen ? 'fixed inset-x-0 bottom-0 z-50 max-h-[78dvh] overflow-y-auto rounded-t-[20px] border border-[var(--border-strong)] bg-[var(--background)] shadow-[var(--shadow-surface)]' : 'hidden'} min-[900px]:sticky min-[900px]:top-[18px] min-[900px]:block min-[900px]:max-h-[calc(100vh-36px)] min-[900px]:overflow-y-auto min-[900px]:rounded-[18px] min-[900px]:border min-[900px]:border-[var(--border)] min-[900px]:bg-[var(--surface)]`}
              aria-label={`Detalhe da conta ${selectedAccount.name}`}
            >
              <div className="mx-auto mt-2 h-1 w-12 rounded-full bg-[var(--border-strong)] min-[900px]:hidden" aria-hidden="true" />
              <button ref={closeRef} type="button" onClick={() => setMobileDetailOpen(false)} aria-label="Fechar detalhe" className="absolute right-3 top-3 z-10 grid h-11 w-11 place-items-center rounded-[10px] text-[var(--text-muted)] hover:bg-[var(--surface-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)] min-[900px]:hidden"><FaTimes aria-hidden="true" /></button>
              <AccountDetail account={selectedAccount} showValues={showValues} />
            </aside>
          </>
        )}
      </div>

      <Link href="/contas/nova" aria-label="Nova conta" className="fixed right-[18px] z-30 grid h-[54px] w-[54px] place-items-center rounded-full bg-[var(--orbit-primary)] text-2xl text-white shadow-[var(--shadow-surface)] sm:hidden" style={{ bottom: 'calc(var(--app-mobile-bottom-nav-height) + env(safe-area-inset-bottom) + 1rem)' }}><FaPlus aria-hidden="true" /></Link>
    </ProtectedRoute>
  );
}

function AccountSummary({ balancesByCurrency, activeCount, totalCount, negativeAccounts, latestActivity, showValues, loading }: { balancesByCurrency: Array<[string, number]>; activeCount: number; totalCount: number; negativeAccounts: AccountModel[]; latestActivity: { account: AccountModel; transaction: any } | null; showValues: boolean; loading: boolean }) {
  const metric = 'rounded-[16px] border border-[var(--border)] bg-[var(--surface)] p-4 sm:px-[18px] sm:py-[17px]';
  return (
    <section className="mt-[22px] grid grid-cols-2 gap-2 lg:grid-cols-[1.35fr_.8fr_.8fr_1fr] lg:gap-3" aria-label="Resumo das contas">
      <article className={`${metric} col-span-2 lg:col-span-1`}>
        <p className="text-xs text-[var(--text-muted)]">SALDOS POR MOEDA</p>
        {loading ? <div className="mt-2 h-8 animate-pulse rounded bg-[var(--skeleton)]" /> : balancesByCurrency.length === 0 ? <strong className="mt-2 block text-2xl">—</strong> : balancesByCurrency.map(([currency, value]) => <strong key={currency} className={`mt-2 mr-3 inline-block text-xl font-bold sm:text-2xl ${value < 0 ? 'text-[var(--expense)]' : 'text-[var(--income)]'}`}>{money(value, currency, showValues)}</strong>)}
        <small className="mt-1 block text-xs text-[var(--text-muted)]">Sem conversão entre moedas</small>
      </article>
      <article className={metric}><p className="text-xs text-[var(--text-muted)]">CONTAS ATIVAS</p><strong className="mt-2 block text-2xl font-bold">{loading ? '—' : activeCount}</strong><small className="text-xs text-[var(--text-muted)]">de {totalCount} no recorte</small></article>
      <article className={metric}><p className="text-xs text-[var(--text-muted)]">SALDO NEGATIVO</p><strong className={`mt-2 block text-2xl font-bold ${negativeAccounts.length ? 'text-[var(--expense)]' : ''}`}>{loading ? '—' : negativeAccounts.length}</strong><small className="text-xs text-[var(--text-muted)]">{negativeAccounts.length === 1 ? '1 conta' : `${negativeAccounts.length} contas`}</small></article>
      <article className={`${metric} hidden lg:block`}><p className="text-xs text-[var(--text-muted)]">ÚLTIMA ATIVIDADE</p><strong className={`mt-2 block truncate text-xl font-bold ${latestActivity?.transaction?.type === 'INCOME' ? 'text-[var(--income)]' : latestActivity ? 'text-[var(--expense)]' : ''}`}>{latestActivity ? transactionMoney(latestActivity.transaction, latestActivity.account.currency, showValues) : '—'}</strong><small className="block truncate text-xs text-[var(--text-muted)]">{latestActivity?.transaction?.description ?? 'Nenhuma movimentação'}</small></article>
    </section>
  );
}

function AccountRow({ account, selected, showValues, onSelect }: { account: AccountModel; selected: boolean; showValues: boolean; onSelect: (account: AccountModel) => void }) {
  const latest = latestTransaction(account);
  return (
    <button type="button" onClick={() => onSelect(account)} aria-pressed={selected} className={`grid min-h-[68px] w-full grid-cols-[minmax(0,1fr)_105px_20px] items-center gap-2 border-t border-[var(--border)] px-3.5 py-3 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--focus)] sm:grid-cols-[minmax(0,1fr)_150px_100px_34px] sm:gap-3.5 sm:px-[18px] ${selected ? 'bg-[var(--primary-subtle)] shadow-[inset_3px_0_0_var(--orbit-primary)]' : 'hover:bg-[var(--surface-hover)]'}`}>
      <div className="flex min-w-0 items-center gap-3"><span className="grid h-[38px] w-[38px] shrink-0 place-items-center rounded-[11px] text-white" style={{ backgroundColor: account.color || '#64748B' }} aria-hidden="true"><IconRenderer iconName={account.icon || 'wallet'} size={18} /></span><div className="min-w-0"><p className="truncate text-sm font-bold sm:text-base">{account.name}</p><p className="mt-0.5 truncate text-xs text-[var(--text-muted)]">{typeLabels[account.type]} · {account.currency}</p></div></div>
      <div className="text-right sm:text-left"><p className={`truncate text-sm font-bold sm:text-base ${account.balance < 0 ? 'text-[var(--expense)]' : 'text-[var(--income)]'}`}>{money(account.balance, account.currency, showValues)}</p><small className="text-[11px] text-[var(--text-muted)]">{account.type === 'INVESTMENT' ? 'Patrimônio' : 'Disponível'}</small></div>
      <div className="hidden min-w-0 sm:block"><small className="text-xs text-[var(--text-muted)]">{latest ? 'Recente' : 'Sem atividade'}</small><p className={`truncate text-xs font-semibold ${latest?.type === 'INCOME' ? 'text-[var(--income)]' : latest ? 'text-[var(--expense)]' : 'text-[var(--text-muted)]'}`}>{latest ? transactionMoney(latest, account.currency, showValues) : '—'}</p></div>
      <FaChevronRight className="justify-self-end text-[var(--text-muted)]" aria-hidden="true" />
    </button>
  );
}

function AccountDetail({ account, showValues }: { account: AccountModel; showValues: boolean }) {
  const recent = sortedTransactions(account).slice(0, 6);
  const latest = recent[0] ?? null;
  const maxAmount = Math.max(1, ...recent.map((transaction) => Math.abs(Number(transaction.amount ?? 0))));
  return (
    <div className="p-4 sm:p-5">
      <header className="flex items-start justify-between gap-3 pr-10 min-[900px]:pr-0"><div className="flex min-w-0 items-center gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] text-white" style={{ backgroundColor: account.color || '#64748B' }} aria-hidden="true"><IconRenderer iconName={account.icon || 'wallet'} size={20} /></span><div className="min-w-0"><h2 className="truncate text-xl font-bold sm:text-[22px]">{account.name}</h2><p className="mt-0.5 truncate text-xs text-[var(--text-muted)]">{typeLabels[account.type]} · {account.currency}</p></div></div><span className={`hidden rounded-full border px-2 py-1 text-xs font-semibold min-[900px]:inline-flex ${account.isActive ? 'border-[var(--income)]/35 bg-[var(--primary-subtle)] text-[var(--income)]' : 'border-[var(--border)] text-[var(--text-muted)]'}`}>{account.isActive ? 'Ativa' : 'Inativa'}</span></header>

      <section className="my-[18px] grid gap-3 sm:grid-cols-[1.3fr_.9fr]" aria-label="Saldo e atividade da conta">
        <article className="rounded-[14px] border border-[var(--border)] bg-[var(--surface-raised)] p-[15px]"><p className="text-xs text-[var(--text-muted)]">SALDO DISPONÍVEL</p><strong className={`mt-2 block break-words text-[27px] font-extrabold sm:text-[31px] ${account.balance < 0 ? 'text-[var(--expense)]' : 'text-[var(--income)]'}`}>{money(account.balance, account.currency, showValues)}</strong><small className="mt-1 block text-xs text-[var(--text-muted)]">Derivado de movimentações concluídas</small></article>
        <article className="rounded-[14px] border border-[var(--border)] bg-[var(--surface-raised)] p-[15px]"><p className="text-xs text-[var(--text-muted)]">ATIVIDADE RECENTE</p><strong className={`mt-2 block text-xl font-bold ${latest?.type === 'INCOME' ? 'text-[var(--income)]' : latest ? 'text-[var(--expense)]' : ''}`}>{latest ? transactionMoney(latest, account.currency, showValues) : '—'}</strong><small className="mt-1 block truncate text-xs text-[var(--text-muted)]">{latest?.description ?? 'Nenhuma movimentação'}</small></article>
      </section>

      <nav className="grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label="Ações da conta">
        <Link href={`/contas/alterar/${account.id}`} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[10px] border border-[var(--orbit-primary)]/40 bg-[var(--primary-subtle)] px-2 text-sm font-semibold text-[var(--orbit-primary)]"><FaPen aria-hidden="true" /> Editar</Link>
        <Link href={`/transacoes?accountId=${encodeURIComponent(account.id)}`} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[10px] border border-[var(--border)] bg-[var(--surface-raised)] px-2 text-sm font-semibold"><FaList aria-hidden="true" /> Transações</Link>
        <Link href="/transacoes/nova" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[10px] border border-[var(--border)] bg-[var(--surface-raised)] px-2 text-sm font-semibold"><FaPlus aria-hidden="true" /> Lançar</Link>
        <Link href={`/contas/show/${account.id}`} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[10px] border border-[var(--border)] bg-[var(--surface-raised)] px-2 text-sm font-semibold"><FaExternalLinkAlt aria-hidden="true" /> Mais</Link>
      </nav>

      <section className="mt-[18px] rounded-[14px] border border-[var(--border)] bg-[var(--surface-raised)] p-[15px]" aria-label="Volume das últimas movimentações">
        <p className="text-xs text-[var(--text-muted)]">VOLUME DAS ÚLTIMAS MOVIMENTAÇÕES</p>
        {recent.length === 0 ? <p className="mt-4 text-sm text-[var(--text-muted)]">Sem dados recentes.</p> : <div className="mt-3 flex h-[120px] items-end gap-1.5 border-b border-l border-[var(--border)] px-2 pt-2" aria-hidden="true">{[...recent].reverse().map((transaction, index) => <span key={transaction.id ?? index} className={`min-w-2 flex-1 rounded-t ${transaction.type === 'INCOME' ? 'bg-[var(--income)]' : 'bg-[var(--expense)]'}`} style={{ height: `${Math.max(8, (Math.abs(Number(transaction.amount ?? 0)) / maxAmount) * 100)}%` }} />)}</div>}
      </section>

      <section className="mt-3 rounded-[14px] border border-[var(--border)] bg-[var(--surface-raised)] p-[15px]" aria-labelledby="account-recent-title"><div className="flex items-center justify-between gap-3"><p id="account-recent-title" className="text-xs text-[var(--text-muted)]">ÚLTIMAS TRANSAÇÕES</p><Link href={`/transacoes?accountId=${encodeURIComponent(account.id)}`} className="rounded-[8px] border border-[var(--border)] px-2 py-1.5 text-xs font-semibold">Ver todas</Link></div>{recent.length === 0 ? <p className="mt-3 text-sm text-[var(--text-muted)]">Nenhuma transação vinculada.</p> : <div className="mt-2 divide-y divide-[var(--border)]">{recent.slice(0, 4).map((transaction) => <Link key={transaction.id} href={`/transacoes/show/${transaction.id}`} className="flex items-center justify-between gap-3 py-3"><div className="min-w-0"><p className="truncate text-sm font-semibold">{transaction.description || 'Sem descrição'}</p><p className="mt-0.5 truncate text-xs text-[var(--text-muted)]">{transaction.category?.name ?? 'Sem categoria'}</p></div><strong className={`shrink-0 text-sm ${transaction.type === 'INCOME' ? 'text-[var(--income)]' : 'text-[var(--expense)]'}`}>{transactionMoney(transaction, account.currency, showValues)}</strong></Link>)}</div>}</section>
    </div>
  );
}
