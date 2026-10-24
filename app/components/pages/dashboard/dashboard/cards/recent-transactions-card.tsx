'use client';

import { SectionMessage } from '@/app/components/pages/dashboard/dashboard/cards/section-message';
import Link from 'next/link';
import { IconRenderer } from '@/app/components/ui';
import { formatCurrency } from '@/app/lib/currency/format-currency';
import { DashboardRecentTransaction } from '@/app/types/dashboard';
import { FaExchangeAlt } from 'react-icons/fa';
import { transactionDateLabel } from '@/app/components/pages/dashboard/dashboard/dashboard-helpers';

export function RecentTransactionsCard({
  items,
  loading,
  error,
  showValues,
  currency,
  onRetry,
}: {
  items: DashboardRecentTransaction[];
  loading: boolean;
  error: string;
  showValues: boolean;
  currency: string;
  onRetry?: () => void;
}) {
  return (
    <article className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-[14px]">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold">Últimas transações</h2>
        <Link href="/transacoes" className="inline-flex min-h-11 items-center px-2 -mx-2 text-sm font-semibold text-[var(--primary)]">Ver todas</Link>
      </div>

      <div className="mt-2 divide-y divide-[var(--border)]">
        {loading ? (
          <div className="space-y-2 py-2" role="status" aria-label="Carregando transações recentes">
            {[1, 2, 3, 4].map((item) => <div key={item} className="h-[38px] animate-pulse rounded-lg bg-[var(--skeleton)]" />)}
          </div>
        ) : error ? (
          <SectionMessage tone="error" className="py-5" onRetry={onRetry} retryLabel="Tentar novamente: transações recentes">{error}</SectionMessage>
        ) : items.length === 0 ? (
          <SectionMessage tone="empty" className="py-5">Nenhuma transação realizada neste mês.</SectionMessage>
        ) : (
          items.map((transaction) => {
            const isIncome = transaction.type === 'INCOME';
            const isTransfer = transaction.kind === 'TRANSFER';
            const isCardPayment = transaction.kind === 'CARD_PAYMENT';
            const tone = isTransfer || isCardPayment ? 'text-[var(--primary)]' : isIncome ? 'text-[var(--income)]' : 'text-[var(--expense)]';

            return (
              <Link key={transaction.id} href={`/transacoes/show/${transaction.id}`} className="grid min-h-11 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-1.5">
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-white ${isTransfer ? 'bg-[var(--primary)]' : isIncome ? 'bg-[var(--income)]' : ''}`}
                    style={!isTransfer && !isIncome && transaction.category ? { backgroundColor: transaction.category.color } : undefined}
                  >
                    {isTransfer || isCardPayment ? <FaExchangeAlt size={12} aria-hidden="true" /> : <IconRenderer iconName={transaction.category?.icon || (isIncome ? 'income-up' : 'tag')} size={12} />}
                  </span>
                  <span className="min-w-0">
                    <strong className="block truncate text-sm">{transaction.description}</strong>
                    <span className="mt-0.5 block truncate text-xs text-[var(--text-muted)]">
                      {transactionDateLabel(transaction)}
                      {' · '}
                      {isTransfer && transaction.counterpartAccount
                        ? `${transaction.account.name} → ${transaction.counterpartAccount.name}`
                        : `${transaction.account.name}${isCardPayment ? ' · Pagamento de fatura' : ''}`}
                    </span>
                  </span>
                </div>
                <strong className={`money shrink-0 text-sm ${tone}`}>
                  {showValues ? `${isIncome ? '+' : isTransfer || isCardPayment ? '' : '-'} ${formatCurrency(transaction.amount, currency)}` : '••••'}
                </strong>
              </Link>
            );
          })
        )}
      </div>
    </article>
  );
}
