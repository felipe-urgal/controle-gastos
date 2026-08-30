'use client';

import { format } from 'date-fns';
import Link from 'next/link';
import {
  FaArrowDown,
  FaArrowUp,
  FaCalendarAlt,
  FaTag,
  FaWallet,
} from 'react-icons/fa';

import { IconRenderer } from '@/app/components/ui';
import { statusConfig } from '@/app/lib/constants/transaction.constants';
import { formatCurrency } from '@/app/lib/currency/format-currency';
import { AccountInfoProps } from '@/app/lib/interface/accounts.interface';

export default function AccountInfo({
  account,
  isDeleting,
  typeLabels,
}: AccountInfoProps) {
  return (
    <div
      className={`space-y-4 transition-opacity duration-150 ${
        isDeleting ? 'pointer-events-none opacity-50' : ''
      }`}
    >
      <section className="ds-panel p-5 sm:p-6" aria-labelledby="account-detail-heading">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <span
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[var(--radius-md)] text-white"
              style={{ backgroundColor: account.color || '#64748B' }}
              aria-hidden="true"
            >
              <IconRenderer iconName={account.icon || 'wallet'} size={20} />
            </span>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-[var(--border-strong)] bg-[var(--surface-subtle)] px-2.5 py-1 text-sm font-semibold text-[var(--text-muted)]">
                  {typeLabels[account.type]}
                </span>
                <span
                  className={`rounded-full border px-2.5 py-1 text-sm font-semibold ${
                    account.isActive
                      ? 'border-[var(--primary)]/35 bg-[var(--primary-subtle)] text-[var(--income)]'
                      : 'border-[var(--border-strong)] bg-[var(--surface-subtle)] text-[var(--text-muted)]'
                  }`}
                >
                  {account.isActive ? 'Ativa' : 'Inativa'}
                </span>
              </div>

              <h2
                id="account-detail-heading"
                className="mt-3 text-2xl font-bold tracking-tight text-[var(--foreground)]"
              >
                {account.name}
              </h2>

              {account.description && (
                <p className="mt-2 max-w-2xl text-base leading-relaxed text-[var(--text-muted)]">
                  {account.description}
                </p>
              )}
            </div>
          </div>

          <div className="sm:min-w-[220px] sm:text-right">
            <p className="text-sm font-medium text-[var(--text-muted)]">Saldo atual</p>
            <p className="mt-1 text-3xl font-bold tracking-tight text-[var(--foreground)]">
              {formatCurrency(account.balance, account.currency)}
            </p>
            <p className="mt-1 text-sm font-semibold text-[var(--text-muted)]">{account.currency}</p>
            <p className="mt-2 text-sm leading-relaxed text-[var(--text-subtle)]">
              Calculado somente com transações concluídas.
            </p>
          </div>
        </div>

        <dl className="mt-6 grid gap-3 md:grid-cols-2">
          <InfoItem icon={<FaCalendarAlt />} label="Criada em">
            {format(new Date(account.createdAt), 'dd/MM/yyyy')}
          </InfoItem>
          <InfoItem icon={<FaCalendarAlt />} label="Última atualização">
            {format(new Date(account.updatedAt), 'dd/MM/yyyy')}
          </InfoItem>
        </dl>
      </section>

      <section className="ds-panel overflow-hidden" aria-labelledby="account-transactions-heading">
        <div className="border-b border-[var(--border)] px-5 py-4 sm:px-6">
          <h3 id="account-transactions-heading" className="text-xl font-semibold text-[var(--foreground)]">
            Transações recentes
          </h3>
          <p className="mt-1 text-sm leading-relaxed text-[var(--text-muted)]">
            {account.transactions.length === 0
              ? 'Nenhuma movimentação vinculada a esta conta.'
              : `Últimos ${account.transactions.length} lançamento${account.transactions.length === 1 ? '' : 's'}, independentemente do status.`}
          </p>
        </div>

        {account.transactions.length === 0 ? (
          <div className="p-6 text-center sm:p-8">
            <FaWallet className="mx-auto h-6 w-6 text-[var(--text-subtle)]" aria-hidden="true" />
            <p className="mt-3 text-base font-semibold text-[var(--foreground)]">
              Nenhuma transação registrada
            </p>
            <p className="mx-auto mt-1 max-w-lg text-sm leading-relaxed text-[var(--text-muted)]">
              Quando houver uma movimentação nesta conta, ela aparecerá aqui.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {account.transactions.map((transaction: any) => {
              const isIncome = transaction.type === 'INCOME';
              const status =
                statusConfig[transaction.status as keyof typeof statusConfig] ||
                statusConfig.COMPLETED;

              return (
                <Link
                  key={transaction.id}
                  href={`/transacoes/show/${transaction.id}`}
                  className="grid min-w-0 gap-3 px-5 py-4 transition-colors hover:bg-[var(--surface-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--focus)] sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-6"
                  aria-label={`Abrir transação ${transaction.description || 'sem descrição'}`}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-md)] ${
                        isIncome
                          ? 'bg-[var(--primary-subtle)] text-[var(--income)]'
                          : 'bg-[var(--danger-subtle)] text-[var(--expense)]'
                      }`}
                      aria-hidden="true"
                    >
                      {isIncome ? <FaArrowUp /> : <FaArrowDown />}
                    </span>

                    <div className="min-w-0">
                      <div className="flex min-w-0 flex-wrap items-center gap-2">
                        <p className="truncate text-base font-semibold text-[var(--foreground)]">
                          {transaction.description || 'Sem descrição'}
                        </p>
                        <span className={`shrink-0 rounded-full border px-2 py-0.5 text-sm font-semibold ${status.color}`}>
                          {status.label}
                        </span>
                      </div>
                      <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-sm text-[var(--text-muted)]">
                        <span>
                          {format(
                            new Date(transaction.year, transaction.month - 1, transaction.day),
                            'dd/MM/yyyy',
                          )}
                        </span>
                        {transaction.category && (
                          <>
                            <span aria-hidden="true">•</span>
                            <span className="inline-flex min-w-0 items-center gap-1.5">
                              <FaTag aria-hidden="true" />
                              <span className="truncate">{transaction.category.name}</span>
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <p
                    className={`whitespace-nowrap text-lg font-bold tracking-tight sm:text-right ${
                      isIncome ? 'text-[var(--income)]' : 'text-[var(--expense)]'
                    }`}
                  >
                    {isIncome ? '+' : '-'}
                    {formatCurrency(transaction.amount, account.currency)}
                  </p>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function InfoItem({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-raised)] p-4">
      <dt className="flex items-center gap-2 text-sm font-medium text-[var(--text-muted)]">
        <span className="text-[var(--text-subtle)]" aria-hidden="true">
          {icon}
        </span>
        {label}
      </dt>
      <dd className="mt-2 text-base font-semibold text-[var(--foreground)]">{children}</dd>
    </div>
  );
}
