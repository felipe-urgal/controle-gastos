'use client';

import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  FaArrowDown,
  FaArrowUp,
  FaCalendarAlt,
  FaInfoCircle,
  FaLayerGroup,
  FaTag,
  FaWallet,
} from 'react-icons/fa';

import { IconRenderer } from '@/app/components/ui';
import { statusConfig } from '@/app/lib/constants/transaction.constants';
import { formatCurrency } from '@/app/lib/currency/format-currency';
import { TransactionInfoProps } from '@/app/lib/interface/transaction.interface';
import { formatPtBrLogicalDate } from '@/app/lib/transactions/monthly-recurrence';

export default function TransactionInfo({
  transaction,
  isDeleting = false,
}: TransactionInfoProps) {
  const transactionDate = new Date(transaction.year, transaction.month - 1, transaction.day);
  const isIncome = transaction.type === 'INCOME';
  const status =
    statusConfig[transaction.status as keyof typeof statusConfig] || statusConfig.COMPLETED;

  return (
    <div
      className={`space-y-4 transition-opacity duration-150 ${
        isDeleting ? 'pointer-events-none opacity-50' : ''
      }`}
    >
      <section className="ds-panel p-5 sm:p-6" aria-labelledby="transaction-detail-heading">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <span
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-[var(--radius-md)] ${
                isIncome
                  ? 'bg-[var(--primary-subtle)] text-[var(--income)]'
                  : 'bg-[var(--danger-subtle)] text-[var(--expense)]'
              }`}
              aria-hidden="true"
            >
              {isIncome ? <FaArrowUp /> : <FaArrowDown />}
            </span>

            <div className="min-w-0">
              <span className={`inline-flex rounded-full border px-2.5 py-1 text-sm font-semibold ${status.color}`}>
                {status.label}
              </span>
              <h2
                id="transaction-detail-heading"
                className="mt-3 text-2xl font-bold tracking-tight text-[var(--foreground)]"
              >
                {transaction.description || 'Sem descrição'}
              </h2>
              <p className="mt-1 text-sm text-[var(--text-muted)]">
                {format(transactionDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </p>
            </div>
          </div>

          <div className="sm:text-right">
            <p className="text-sm font-medium text-[var(--text-muted)]">Valor</p>
            <p
              className={`mt-1 text-3xl font-bold tracking-tight ${
                isIncome ? 'text-[var(--income)]' : 'text-[var(--expense)]'
              }`}
            >
              {isIncome ? '+' : '-'}
              {formatCurrency(transaction.amount, transaction.account.currency)}
            </p>
          </div>
        </div>

        {transaction.series && (
          <div className="mt-6 flex items-start gap-3 rounded-[var(--radius-lg)] border border-[var(--primary)]/30 bg-[var(--primary-subtle)] p-4">
            <FaLayerGroup className="mt-0.5 shrink-0 text-[var(--primary)]" aria-hidden="true" />
            <div>
              <p className="text-base font-semibold text-[var(--foreground)]">Parte de uma série mensal</p>
              <p className="mt-1 text-sm leading-relaxed text-[var(--text-muted)]">
                {transaction.series.occurrenceCount} ocorrências, de{' '}
                {formatPtBrLogicalDate(transaction.series.start)} até{' '}
                {formatPtBrLogicalDate(transaction.series.end)}. Editar esta transação altera somente esta ocorrência.
              </p>
            </div>
          </div>
        )}
      </section>

      <section className="ds-panel p-5 sm:p-6" aria-labelledby="transaction-information-heading">
        <div className="flex items-center gap-2">
          <FaInfoCircle className="text-[var(--primary)]" aria-hidden="true" />
          <h3 id="transaction-information-heading" className="text-xl font-semibold text-[var(--foreground)]">
            Informações
          </h3>
        </div>

        <dl className="mt-5 grid gap-3 md:grid-cols-2">
          <InfoItem icon={<FaCalendarAlt />} label="Data da transação">
            {format(transactionDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </InfoItem>

          <InfoItem icon={<FaCalendarAlt />} label="Criada em">
            {format(new Date(transaction.createdAt), 'dd/MM/yyyy HH:mm')}
          </InfoItem>

          {transaction.category && (
            <InfoItem icon={<FaTag />} label="Categoria">
              <span className="inline-flex min-w-0 items-center gap-2">
                <span aria-hidden="true">
                  <IconRenderer
                    iconName={transaction.category.icon || 'tag'}
                    size={16}
                    color={transaction.category.color}
                  />
                </span>
                <span className="truncate">{transaction.category.name}</span>
              </span>
            </InfoItem>
          )}

          {transaction.account && (
            <InfoItem icon={<FaWallet />} label="Conta">
              <span className="inline-flex min-w-0 items-center gap-2">
                <span
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
                  style={{ backgroundColor: transaction.account.color ?? 'var(--surface-subtle)' }}
                  aria-hidden="true"
                >
                  <IconRenderer
                    iconName={transaction.account.icon || 'wallet'}
                    size={13}
                    className="text-white"
                  />
                </span>
                <span className="truncate">{transaction.account.name}</span>
              </span>
            </InfoItem>
          )}
        </dl>
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
      <dd className="mt-2 min-w-0 text-base font-semibold text-[var(--foreground)]">{children}</dd>
    </div>
  );
}
