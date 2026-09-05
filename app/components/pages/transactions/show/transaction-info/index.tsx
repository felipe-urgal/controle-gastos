'use client';

import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  FaArrowDown,
  FaArrowUp,
  FaCalendarAlt,
  FaLayerGroup,
  FaTag,
  FaWallet,
} from 'react-icons/fa';

import { IconRenderer } from '@/app/components/ui';
import { useAuth } from '@/app/context';
import { statusConfig } from '@/app/lib/constants/transaction.constants';
import { formatCurrency } from '@/app/lib/currency/format-currency';
import { TransactionInfoProps } from '@/app/lib/interface/transaction.interface';
import { formatPtBrLogicalDate } from '@/app/lib/transactions/monthly-recurrence';

export default function TransactionInfo({
  transaction,
  isDeleting = false,
}: TransactionInfoProps) {
  const { user } = useAuth();
  const showValues = user?.showValues !== false;
  const transactionDate = new Date(transaction.year, transaction.month - 1, transaction.day);
  const isIncome = transaction.type === 'INCOME';
  const status =
    statusConfig[transaction.status as keyof typeof statusConfig] || statusConfig.COMPLETED;
  const isInstallment = transaction.series?.type === 'INSTALLMENT';
  const amount = showValues
    ? formatCurrency(transaction.amount, transaction.account.currency)
    : '••••';

  return (
    <div
      className={`grid gap-4 transition-opacity duration-150 lg:grid-cols-[minmax(0,1.35fr)_minmax(300px,0.65fr)] lg:items-start ${
        isDeleting ? 'pointer-events-none opacity-50' : ''
      }`}
    >
      <div className="space-y-4">
        <section className="ds-panel overflow-hidden" aria-labelledby="transaction-detail-heading">
          <div className="p-5 sm:p-6">
            <div className="flex items-start gap-4">
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

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`inline-flex rounded-full border px-2.5 py-1 text-sm font-semibold ${status.color}`}>
                    {status.label}
                  </span>
                  <span className={`text-sm font-semibold ${isIncome ? 'text-[var(--income)]' : 'text-[var(--expense)]'}`}>
                    {isIncome ? 'Receita' : 'Despesa'}
                  </span>
                  {isInstallment && transaction.seriesIndex && (
                    <span className="inline-flex rounded-full border border-[var(--border-strong)] bg-[var(--surface-subtle)] px-2.5 py-1 text-sm font-semibold text-[var(--text-muted)]">
                      Parcela {transaction.seriesIndex}/{transaction.series?.occurrenceCount}
                    </span>
                  )}
                </div>

                <h2
                  id="transaction-detail-heading"
                  className="mt-3 break-words text-2xl font-bold tracking-tight text-[var(--foreground)]"
                >
                  {transaction.description || 'Sem descrição'}
                </h2>
                <p className="mt-1 text-sm text-[var(--text-muted)]">
                  {format(transactionDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </p>
              </div>
            </div>

            <div className="mt-6 rounded-[var(--radius-lg)] bg-[var(--surface-subtle)] p-5">
              <p className="text-sm font-medium text-[var(--text-muted)]">Valor do lançamento</p>
              <p
                className={`mt-1 break-words text-3xl font-bold tracking-tight ${
                  isIncome ? 'text-[var(--income)]' : 'text-[var(--expense)]'
                }`}
              >
                {isIncome ? '+' : '-'}{amount}
              </p>
              {!showValues && (
                <p className="mt-2 text-xs text-[var(--text-subtle)]">Valores ocultos pelas suas preferências.</p>
              )}
            </div>
          </div>

          {transaction.series && (
            <div className="border-t border-[var(--border)] p-5 sm:p-6">
              <div className="flex items-start gap-3 rounded-[var(--radius-lg)] border border-[var(--orbit-primary)]/25 bg-[var(--primary-subtle)] p-4">
                <FaLayerGroup className="mt-0.5 shrink-0 text-[var(--orbit-primary)]" aria-hidden="true" />
                <div>
                  <p className="font-semibold text-[var(--foreground)]">
                    {isInstallment
                      ? `Parcela ${transaction.seriesIndex ?? '?'} de ${transaction.series.occurrenceCount}`
                      : 'Ocorrência de uma série'}
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-[var(--text-muted)]">
                    {isInstallment && transaction.series.description ? (
                      <>
                        “{transaction.series.description}” · {formatPtBrLogicalDate(transaction.series.start)} até{' '}
                        {formatPtBrLogicalDate(transaction.series.end)}. Editar altera somente esta parcela.
                      </>
                    ) : (
                      <>
                        {transaction.series.occurrenceCount} ocorrências · {formatPtBrLogicalDate(transaction.series.start)} até{' '}
                        {formatPtBrLogicalDate(transaction.series.end)}. Editar altera somente esta ocorrência.
                      </>
                    )}
                  </p>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>

      <aside className="ds-panel p-5 lg:sticky lg:top-4" aria-labelledby="transaction-context-heading">
        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--orbit-primary)]">Contexto</p>
        <h3 id="transaction-context-heading" className="mt-1 text-lg font-semibold text-[var(--foreground)]">
          Sobre este lançamento
        </h3>

        <dl className="mt-5 space-y-4">
          <InfoRow icon={<FaCalendarAlt />} label="Data da transação">
            {format(transactionDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </InfoRow>

          {transaction.account && (
            <InfoRow icon={<FaWallet />} label="Conta">
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
                <span className="break-words">{transaction.account.name} · {transaction.account.currency}</span>
              </span>
            </InfoRow>
          )}

          {transaction.category && (
            <InfoRow icon={<FaTag />} label="Categoria">
              <span className="inline-flex min-w-0 items-center gap-2">
                <span aria-hidden="true">
                  <IconRenderer
                    iconName={transaction.category.icon || 'tag'}
                    size={16}
                    color={transaction.category.color}
                  />
                </span>
                <span className="break-words">{transaction.category.name}</span>
              </span>
            </InfoRow>
          )}

          <InfoRow icon={<FaCalendarAlt />} label="Criada em">
            {format(new Date(transaction.createdAt), 'dd/MM/yyyy HH:mm')}
          </InfoRow>
        </dl>

        <div className="mt-5 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-subtle)] p-3 text-sm leading-relaxed text-[var(--text-muted)]">
          O status financeiro e a categoria exibidos aqui vêm do lançamento persistido. Esta tela não recalcula nem altera valores ao abrir.
        </div>
      </aside>
    </div>
  );
}

function InfoRow({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-b border-[var(--border)] pb-4 last:border-0 last:pb-0">
      <dt className="flex items-center gap-2 text-sm font-medium text-[var(--text-muted)]">
        <span className="text-[var(--text-subtle)]" aria-hidden="true">{icon}</span>
        {label}
      </dt>
      <dd className="mt-1.5 min-w-0 text-sm font-semibold text-[var(--foreground)]">{children}</dd>
    </div>
  );
}
