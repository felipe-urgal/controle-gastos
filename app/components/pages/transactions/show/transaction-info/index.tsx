'use client';

import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { FaArrowDown, FaArrowUp, FaCreditCard, FaExchangeAlt, FaLayerGroup } from 'react-icons/fa';

import { IconRenderer } from '@/app/components/ui';
import { useAuth } from '@/app/context';
import { statusConfig } from '@/app/lib/constants/transaction.constants';
import { formatCurrency } from '@/app/lib/currency/format-currency';
import { TransactionInfoProps } from '@/app/lib/interface/transaction.interface';
import { formatPtBrLogicalDate } from '@/app/lib/transactions/monthly-recurrence';
import {
  getTransferDirectionLabel,
  isTransferTransaction,
} from '@/app/lib/transactions/transaction-presentation';
import type { ReconciliationStatus, TransactionAccountDTO } from '@/app/types/transaction';

const RECONCILIATION_LABEL: Record<ReconciliationStatus, string> = {
  UNCLEARED: 'Não compensada',
  CLEARED: 'Compensada',
  RECONCILED: 'Conciliada',
};

const cardClassName = 'rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)]';
const linkClassName =
  'font-semibold text-[var(--orbit-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]';

export default function TransactionInfo({
  transaction,
  isDeleting = false,
}: TransactionInfoProps) {
  const { user } = useAuth();
  const showValues = user?.showValues !== false;
  const transactionDate = new Date(transaction.year, transaction.month - 1, transaction.day);
  const longDate = format(transactionDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  const isIncome = transaction.type === 'INCOME';
  const isTransfer = isTransferTransaction(transaction);
  const isCardPayment = transaction.kind === 'CARD_PAYMENT';
  const isNormal = !isTransfer && !isCardPayment;
  const status =
    statusConfig[transaction.status as keyof typeof statusConfig] || statusConfig.COMPLETED;
  const isInstallment = transaction.series?.type === 'INSTALLMENT';
  const currency = transaction.account.currency;
  const money = (cents: number) => (showValues ? formatCurrency(cents, currency) : '••••');
  const allocations = transaction.allocations ?? [];
  const kindLabel = isTransfer
    ? getTransferDirectionLabel(transaction)
    : isCardPayment
      ? 'Pagamento de fatura'
      : isIncome
        ? 'Receita'
        : 'Despesa';
  const amountTone = !isNormal
    ? 'text-[var(--orbit-primary)]'
    : isIncome
      ? 'text-[var(--income)]'
      : 'text-[var(--expense)]';
  const iconTone = !isNormal
    ? 'bg-[var(--orbit-primary-subtle)] text-[var(--orbit-primary)]'
    : isIncome
      ? 'bg-[var(--primary-subtle)] text-[var(--income)]'
      : 'bg-[var(--danger-subtle)] text-[var(--expense)]';

  return (
    <div className={`w-full space-y-4 pb-5 transition-opacity duration-150 ${isDeleting ? 'pointer-events-none opacity-50' : ''}`}>
      <section
        aria-labelledby="transaction-detail-heading"
        className="grid gap-5 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-surface)] sm:p-5"
      >
        <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3.5">
          <span className={`grid h-12 w-12 place-items-center rounded-[var(--radius-lg)] text-lg ${iconTone}`} aria-hidden="true">
            {isTransfer ? <FaExchangeAlt /> : isCardPayment ? <FaCreditCard /> : isIncome ? <FaArrowUp /> : <FaArrowDown />}
          </span>
          <div className="min-w-0">
            <h2 id="transaction-detail-heading" className="break-words text-xl font-bold tracking-tight">
              {transaction.description || 'Sem descrição'}
            </h2>
            <p className="text-sm text-[var(--text-muted)]">
              <span className={`mr-2 rounded-full border px-2 py-0.5 text-xs font-semibold ${status.color}`}>{status.label}</span>
              {longDate}
              {isInstallment && transaction.seriesIndex
                ? ` · Parcela ${transaction.seriesIndex}/${transaction.series?.occurrenceCount}`
                : ''}
            </p>
          </div>
        </div>

        <div>
          <p className="text-sm font-semibold text-[var(--text-muted)]">{kindLabel}</p>
          <strong className={`money mt-1 block break-words text-4xl font-semibold leading-none tracking-[-0.035em] sm:text-5xl ${amountTone}`}>
            {isNormal ? (isIncome ? '+' : '−') : ''}
            {money(transaction.amount)}
          </strong>
          {!showValues && (
            <p className="mt-2 text-xs text-[var(--text-subtle)]">Valores ocultos pelas suas preferências.</p>
          )}
        </div>
      </section>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          {allocations.length > 1 && (
            <section className={cardClassName} aria-labelledby="transaction-allocations-heading">
              <div className="flex flex-wrap items-baseline justify-between gap-2 px-4 pb-2 pt-4 sm:px-5">
                <h2 id="transaction-allocations-heading" className="text-base font-bold">Divisão por categoria</h2>
                <p className="text-xs text-[var(--text-muted)]">{allocations.length} categorias</p>
              </div>
              <ul className="divide-y divide-[var(--border)] border-t border-[var(--border)]">
                {allocations.map((allocation) => (
                  <li key={allocation.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-2.5 sm:px-5">
                    <span className="inline-flex min-w-0 items-center gap-2 text-sm font-semibold">
                      <IconRenderer iconName={allocation.category.icon || 'tag'} size={16} color={allocation.category.color} />
                      <span className="break-words">{allocation.category.name}</span>
                    </span>
                    <span className="money text-sm font-semibold">{money(allocation.amount)}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {transaction.series && (
            <section className={`${cardClassName} p-4 sm:p-5`} aria-labelledby="transaction-series-heading">
              <div className="flex items-start gap-3">
                <FaLayerGroup className="mt-1 shrink-0 text-[var(--orbit-primary)]" aria-hidden="true" />
                <div>
                  <h2 id="transaction-series-heading" className="text-base font-bold">
                    {isInstallment
                      ? `Parcela ${transaction.seriesIndex ?? '?'} de ${transaction.series.occurrenceCount}`
                      : 'Ocorrência de uma série'}
                  </h2>
                  <p className="mt-1 text-sm leading-relaxed text-[var(--text-muted)]">
                    {isInstallment && transaction.series.description ? `“${transaction.series.description}” · ` : `${transaction.series.occurrenceCount} ocorrências · `}
                    {formatPtBrLogicalDate(transaction.series.start)} até {formatPtBrLogicalDate(transaction.series.end)}.
                    Editar altera somente {isInstallment ? 'esta parcela' : 'esta ocorrência'}.
                  </p>
                </div>
              </div>
            </section>
          )}

          <p className={`${cardClassName} p-4 text-sm leading-relaxed text-[var(--text-muted)] sm:p-5`}>
            {isTransfer
              ? 'Esta é uma perna de uma transferência ligada. A contraparte é somente leitura aqui e alterações da operação usam o fluxo dedicado de transferências.'
              : isCardPayment
                ? 'Este lançamento foi criado pelo fluxo de pagamento da fatura e é somente leitura no CRUD comum de transações.'
                : 'O status financeiro e a categoria exibidos aqui vêm do lançamento persistido. Esta tela não recalcula nem altera valores ao abrir.'}
          </p>
        </div>

        <section className={cardClassName} aria-labelledby="transaction-context-heading">
          <h2 id="transaction-context-heading" className="px-4 pb-2 pt-4 text-base font-bold sm:px-5">Sobre este lançamento</h2>
          <dl className="grid gap-3 px-4 pb-4 text-sm sm:px-5">
            <Row label="Data">{longDate}</Row>

            <Row label="Conta">
              <AccountLabel account={transaction.account} href={`/contas/show/${transaction.account.id}`} />
            </Row>

            {isTransfer && (
              <Row label="Conta contraparte">
                {transaction.counterpartAccount ? (
                  <AccountLabel account={transaction.counterpartAccount} href={`/contas/show/${transaction.counterpartAccount.id}`} />
                ) : (
                  'Contraparte indisponível'
                )}
              </Row>
            )}

            {isNormal && transaction.merchant && (
              <Row label="Estabelecimento">
                <Link href={`/estabelecimentos/show/${transaction.merchant.id}`} className={linkClassName}>
                  {transaction.merchant.name}
                </Link>
                {!transaction.merchant.isActive ? ' · inativo' : ''}
              </Row>
            )}

            {isNormal && transaction.category && (
              <Row label="Categoria">
                <Link href={`/categorias/show/${transaction.category.id}`} className={`${linkClassName} inline-flex min-w-0 items-center gap-2`}>
                  <IconRenderer iconName={transaction.category.icon || 'tag'} size={16} color={transaction.category.color} />
                  <span className="break-words">{transaction.category.name}</span>
                </Link>
              </Row>
            )}

            {transaction.tags?.length ? (
              <Row label="Tags">
                <span className="flex flex-wrap justify-end gap-1.5">
                  {transaction.tags.map((tag) => (
                    <span key={tag.id} className="rounded-full bg-[var(--surface-subtle)] px-2 py-0.5 text-xs">#{tag.name}</span>
                  ))}
                </span>
              </Row>
            ) : null}

            <Row label="Conciliação">{RECONCILIATION_LABEL[transaction.reconciliationStatus] ?? '—'}</Row>
            {transaction.importSource && <Row label="Origem">Importada de {transaction.importSource}</Row>}
            <Row label="Criada em">{format(new Date(transaction.createdAt), 'dd/MM/yyyy HH:mm')}</Row>
            <Row label="Atualizada em">{format(new Date(transaction.updatedAt), 'dd/MM/yyyy HH:mm')}</Row>
          </dl>
        </section>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="shrink-0 text-[var(--text-muted)]">{label}</dt>
      <dd className="min-w-0 break-words text-right font-semibold">{children}</dd>
    </div>
  );
}

function AccountLabel({ account, href }: { account: TransactionAccountDTO; href: string }) {
  return (
    <Link href={href} className={`${linkClassName} inline-flex min-w-0 items-center gap-2`}>
      <span
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
        style={{ backgroundColor: account.color ?? 'var(--surface-subtle)' }}
        aria-hidden="true"
      >
        <IconRenderer iconName={account.icon || 'wallet'} size={13} className="text-white" />
      </span>
      <span className="break-words">{account.name} · {account.currency}</span>
    </Link>
  );
}
