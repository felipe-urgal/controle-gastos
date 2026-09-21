'use client';

import { format } from 'date-fns';
import Link from 'next/link';
import { useState } from 'react';
import {
  FaArrowDown,
  FaArrowLeft,
  FaArrowUp,
  FaCalendarAlt,
  FaChevronRight,
  FaClock,
  FaEllipsisV,
  FaExchangeAlt,
  FaPen,
  FaTrash,
} from 'react-icons/fa';
import { MdShowChart } from 'react-icons/md';

import ReconciliationPanel from '@/app/components/pages/account/show/reconciliation-panel';
import { IconRenderer } from '@/app/components/ui';
import { useAuth } from '@/app/context';
import { formatCurrency } from '@/app/lib/currency/format-currency';
import {
  getTransferCounterpartLabel,
  isTransferTransaction,
} from '@/app/lib/transactions/transaction-presentation';
import type { AccountModel } from '@/app/types/account';

type MobileTab = 'overview' | 'transactions' | 'reconciliation';

interface MobileAccountShowProps {
  account: AccountModel;
  typeLabels: Record<string, string>;
  backUrl: string;
  editUrl: string;
  isDeleting: boolean;
  onDeleteRequest: () => void;
  onReconciliationChange?: () => Promise<void> | void;
}

export default function MobileAccountShow({
  account,
  typeLabels,
  backUrl,
  editUrl,
  isDeleting,
  onDeleteRequest,
  onReconciliationChange,
}: MobileAccountShowProps) {
  const { user } = useAuth();
  const showValues = user?.showValues !== false;
  const [tab, setTab] = useState<MobileTab>('overview');
  const [menuOpen, setMenuOpen] = useState(false);
  const recentTransactions = account.transactions ?? [];
  const balance = showValues
    ? formatCurrency(account.balance, account.currency)
    : '••••';

  return (
    <div
      className={`mx-auto w-full max-w-[430px] pb-5 transition-opacity duration-150 ${
        isDeleting ? 'pointer-events-none opacity-50' : ''
      }`}
    >
      <header className="relative grid grid-cols-[44px_minmax(0,1fr)_44px] items-center gap-2 pb-5">
        <Link
          href={backUrl}
          aria-label="Voltar para contas"
          className="grid h-11 w-11 place-items-center rounded-full text-lg text-[var(--foreground)] transition-colors hover:bg-[var(--surface-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]"
        >
          <FaArrowLeft aria-hidden="true" />
        </Link>

        <h1 className="truncate text-center text-[24px] font-extrabold tracking-tight text-[var(--foreground)]">
          {account.name}
        </h1>

        <div className="relative">
          <button
            type="button"
            aria-label="Mais ações"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((current) => !current)}
            className="grid h-11 w-11 place-items-center rounded-full text-lg text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]"
          >
            <FaEllipsisV aria-hidden="true" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-12 z-30 w-48 overflow-hidden rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-1.5 shadow-[var(--shadow-elevated)]">
              <Link
                href={editUrl}
                onClick={() => setMenuOpen(false)}
                className="flex min-h-11 items-center gap-3 rounded-[10px] px-3 text-sm font-semibold text-[var(--foreground)] transition-colors hover:bg-[var(--surface-hover)]"
              >
                <FaPen className="text-[var(--orbit-primary)]" aria-hidden="true" />
                Editar conta
              </Link>
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onDeleteRequest();
                }}
                className="flex min-h-11 w-full items-center gap-3 rounded-[10px] px-3 text-left text-sm font-semibold text-[var(--expense)] transition-colors hover:bg-[var(--danger-subtle)]"
              >
                <FaTrash aria-hidden="true" />
                Excluir conta
              </button>
            </div>
          )}
        </div>
      </header>

      <section
        className="relative overflow-hidden rounded-[26px] border border-[var(--orbit-primary)] bg-[linear-gradient(145deg,color-mix(in_srgb,var(--orbit-primary)_42%,var(--surface))_0%,color-mix(in_srgb,#312e81_40%,var(--surface))_54%,color-mix(in_srgb,#111827_90%,var(--surface))_100%)] p-5 shadow-[0_20px_44px_color-mix(in_srgb,var(--orbit-primary)_20%,transparent)]"
        aria-label="Resumo da conta"
      >
        <MdShowChart
          className="pointer-events-none absolute -right-8 top-[78px] -rotate-6 text-[176px] text-[var(--orbit-primary)] opacity-50"
          aria-hidden="true"
        />

        <div className="relative z-[1] flex items-start gap-4">
          <span
            className="grid h-[72px] w-[72px] shrink-0 place-items-center rounded-[19px] text-2xl text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,.14)]"
            style={{ backgroundColor: account.color || '#7C3AED' }}
            aria-hidden="true"
          >
            <IconRenderer iconName={account.icon || 'wallet'} size={30} />
          </span>

          <div className="min-w-0 flex-1">
            <h2 className="truncate text-[23px] font-extrabold text-white">
              {account.name}
            </h2>
            <p className="mt-0.5 truncate text-[16px] text-white/70">
              {typeLabels[account.type]}
            </p>
            <span
              className={`mt-2 inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-bold ${
                account.isActive
                  ? 'border-[var(--income)]/30 bg-[color-mix(in_srgb,var(--income)_14%,transparent)] text-[var(--income)]'
                  : 'border-white/15 bg-white/5 text-white/65'
              }`}
            >
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  account.isActive ? 'bg-[var(--income)]' : 'bg-white/35'
                }`}
                aria-hidden="true"
              />
              {account.isActive ? 'Ativa' : 'Inativa'}
            </span>
          </div>
        </div>

        <strong
          className={`relative z-[1] mt-6 block break-words text-[38px] font-extrabold leading-none tracking-tight min-[390px]:text-[40px] ${
            account.balance < 0 ? 'text-[var(--expense)]' : 'text-white'
          }`}
        >
          {balance}
        </strong>
        <p className="relative z-[1] mt-2 text-[17px] font-semibold text-white/70">
          {account.currency}
        </p>
      </section>

      <nav
        className="mt-6 grid grid-cols-3 border-b border-[var(--border)]"
        aria-label="Seções da conta"
      >
        {[
          { key: 'overview' as const, label: 'Visão geral' },
          { key: 'transactions' as const, label: 'Transações' },
          { key: 'reconciliation' as const, label: 'Reconciliação' },
        ].map((item) => {
          const active = tab === item.key;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => setTab(item.key)}
              aria-pressed={active}
              className={`relative min-h-[60px] px-1 text-[14px] font-bold transition-colors min-[390px]:text-[15px] ${
                active
                  ? 'text-[var(--orbit-primary)]'
                  : 'text-[var(--text-muted)]'
              }`}
            >
              {item.label}
              {active && (
                <span
                  className="absolute inset-x-0 -bottom-px h-[3px] rounded-full bg-[var(--orbit-primary)]"
                  aria-hidden="true"
                />
              )}
            </button>
          );
        })}
      </nav>

      {tab === 'overview' && (
        <div className="mt-8 space-y-8">
          <section aria-labelledby="mobile-account-activity">
            <h2
              id="mobile-account-activity"
              className="text-[25px] font-extrabold tracking-tight text-[var(--foreground)] min-[390px]:text-[26px]"
            >
              Atividade recente
            </h2>

            <div className="mt-4 overflow-hidden rounded-[18px] border border-[var(--border-strong)] bg-[var(--surface)]">
              {recentTransactions.length === 0 ? (
                <div className="px-5 py-7 text-center">
                  <p className="text-base font-bold text-[var(--foreground)]">
                    Nenhuma transação registrada
                  </p>
                  <p className="mt-1 text-sm text-[var(--text-muted)]">
                    As movimentações desta conta aparecerão aqui.
                  </p>
                </div>
              ) : (
                recentTransactions.slice(0, 3).map((transaction: any, index: number) => (
                  <MobileTransactionRow
                    key={transaction.id}
                    transaction={transaction}
                    currency={account.currency}
                    showValues={showValues}
                    bordered={index > 0}
                  />
                ))
              )}

              <Link
                href={`/transacoes?accountId=${encodeURIComponent(account.id)}`}
                className="flex min-h-[62px] items-center justify-between border-t border-[var(--border)] px-4 text-[16px] font-bold text-[var(--orbit-primary)]"
              >
                Ver todas
                <FaChevronRight aria-hidden="true" />
              </Link>
            </div>
          </section>

          <section aria-labelledby="mobile-account-about">
            <h2
              id="mobile-account-about"
              className="text-[26px] font-extrabold tracking-tight text-[var(--foreground)]"
            >
              Sobre a conta
            </h2>

            <dl className="mt-4 overflow-hidden rounded-[18px] border border-[var(--border-strong)] bg-[var(--surface)]">
              <div className="flex min-h-[76px] items-center gap-3 px-4">
                <FaCalendarAlt
                  className="shrink-0 text-lg text-[var(--text-muted)]"
                  aria-hidden="true"
                />
                <dt className="text-[16px] text-[var(--text-muted)]">Criada em</dt>
                <dd className="ml-auto text-[16px] font-semibold text-[var(--foreground)]">
                  {format(new Date(account.createdAt), 'dd/MM/yyyy')}
                </dd>
              </div>
              <div className="mx-4 border-t border-[var(--border)]" />
              <div className="flex min-h-[72px] items-center gap-3 px-4">
                <FaClock
                  className="shrink-0 text-lg text-[var(--text-muted)]"
                  aria-hidden="true"
                />
                <dt className="text-[16px] text-[var(--text-muted)]">Atualizada</dt>
                <dd className="ml-auto text-[16px] font-semibold text-[var(--foreground)]">
                  {format(new Date(account.updatedAt), 'dd/MM/yyyy')}
                </dd>
              </div>
            </dl>
          </section>

          <Link
            href={editUrl}
            className="flex min-h-[62px] w-full items-center justify-center gap-3 rounded-full bg-[linear-gradient(90deg,#7c3aed_0%,#8b5cf6_52%,#7c3aed_100%)] px-5 text-[18px] font-extrabold text-white shadow-[0_16px_36px_rgba(124,58,237,.32)]"
          >
            <FaPen aria-hidden="true" />
            Editar conta
          </Link>
        </div>
      )}

      {tab === 'transactions' && (
        <section className="mt-7" aria-labelledby="mobile-account-transactions">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <h2
                id="mobile-account-transactions"
                className="text-[26px] font-extrabold tracking-tight text-[var(--foreground)]"
              >
                Transações
              </h2>
              <p className="mt-1 text-sm text-[var(--text-muted)]">
                Movimentações recentes desta conta.
              </p>
            </div>
          </div>

          <div className="overflow-hidden rounded-[18px] border border-[var(--border)] bg-[var(--surface)]">
            {recentTransactions.length === 0 ? (
              <div className="px-5 py-8 text-center">
                <p className="font-bold text-[var(--foreground)]">
                  Nenhuma transação registrada
                </p>
              </div>
            ) : (
              recentTransactions.map((transaction: any, index: number) => (
                <MobileTransactionRow
                  key={transaction.id}
                  transaction={transaction}
                  currency={account.currency}
                  showValues={showValues}
                  bordered={index > 0}
                />
              ))
            )}
          </div>

          <Link
            href={`/transacoes?accountId=${encodeURIComponent(account.id)}`}
            className="mt-4 flex min-h-[54px] items-center justify-center gap-2 rounded-full border border-[var(--orbit-primary)] bg-[var(--orbit-primary-subtle)] px-4 text-base font-bold text-[var(--orbit-primary)]"
          >
            Ver todas as transações
            <FaChevronRight aria-hidden="true" />
          </Link>
        </section>
      )}

      {tab === 'reconciliation' && (
        <div className="mt-7">
          <ReconciliationPanel
            account={account}
            onChanged={onReconciliationChange}
          />
        </div>
      )}
    </div>
  );
}

function MobileTransactionRow({
  transaction,
  currency,
  showValues,
  bordered,
}: {
  transaction: any;
  currency: string;
  showValues: boolean;
  bordered: boolean;
}) {
  const isIncome = transaction.type === 'INCOME';
  const isTransfer = isTransferTransaction(transaction);
  const amount = showValues
    ? formatCurrency(transaction.amount, currency)
    : '••••';
  const tone = isIncome
    ? 'text-[var(--income)]'
    : 'text-[var(--expense)]';
  const iconTone = isTransfer
    ? 'bg-[var(--orbit-primary-subtle)] text-[var(--orbit-primary)]'
    : isIncome
      ? 'bg-[var(--primary-subtle)] text-[var(--income)]'
      : 'bg-[var(--danger-subtle)] text-[var(--expense)]';

  return (
    <Link
      href={`/transacoes/show/${transaction.id}`}
      className={`grid min-h-[100px] grid-cols-[52px_minmax(0,1fr)_auto] items-center gap-3 px-4 transition-colors hover:bg-[var(--surface-hover)] ${
        bordered ? 'border-t border-[var(--border)]' : ''
      }`}
      aria-label={`Abrir transação ${transaction.description || 'sem descrição'}`}
    >
      <span
        className={`grid h-[48px] w-[48px] place-items-center rounded-[14px] text-lg ${iconTone}`}
        aria-hidden="true"
      >
        {isTransfer ? (
          <FaExchangeAlt />
        ) : isIncome ? (
          <FaArrowUp />
        ) : (
          <FaArrowDown />
        )}
      </span>

      <div className="min-w-0">
        <p className="truncate text-[16px] font-bold text-[var(--foreground)]">
          {transaction.description || 'Sem descrição'}
        </p>
        <p className="mt-1 truncate text-[13px] text-[var(--text-muted)]">
          {format(
            new Date(transaction.year, transaction.month - 1, transaction.day),
            'dd/MM/yyyy',
          )}
        </p>
        <p className="mt-0.5 truncate text-[13px] text-[var(--text-muted)]">
          {isTransfer
            ? getTransferCounterpartLabel(transaction)
            : transaction.category?.name || (isIncome ? 'Receita' : 'Despesa')}
        </p>
      </div>

      <div className="flex items-center gap-2">
        <strong className={`whitespace-nowrap text-[15px] font-extrabold min-[390px]:text-[16px] ${tone}`}>
          {isIncome ? '+' : '-'}{amount}
        </strong>
        <FaChevronRight
          className="shrink-0 text-sm text-[var(--text-muted)]"
          aria-hidden="true"
        />
      </div>
    </Link>
  );
}
