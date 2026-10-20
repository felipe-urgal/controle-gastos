'use client';

import Link from 'next/link';
import { ReactNode } from 'react';
import { FaArrowDown, FaArrowRight, FaArrowUp, FaCalendarAlt, FaChartLine, FaChevronDown, FaClock, FaCreditCard, FaExchangeAlt } from 'react-icons/fa';
import { IconRenderer } from '@/app/components/ui';
import { getTransferCounterpartLabel, isTransferTransaction } from '@/app/lib/transactions/transaction-presentation';
import { CurrencyFinancialSummary } from '@/app/types/financial-summary';
import { TransactionDTO } from '@/app/types/transaction';
import { MonthBar, TimelineGroup, TimelineOrder, compactMonth, displayMoney, formatTransactionAmount, formatTransactionTime, monthTitle, scheduledDistanceLabel } from '@/app/components/pages/transactions/index/transactions-view-helpers';
import { StatusPill } from '@/app/components/pages/transactions/index/transaction-dialogs';

export function MonthSummaryCard({
  label,
  count,
  countLabel,
  amount,
  tone,
  icon,
  detail,
  detailTone = 'neutral',
  detailDirection = 'flat',
}: {
  label: string;
  count?: number;
  countLabel?: string;
  amount: string;
  tone: 'income' | 'expense' | 'primary' | 'scheduled';
  icon: ReactNode;
  detail: string;
  detailTone?: 'positive' | 'negative' | 'neutral';
  detailDirection?: 'up' | 'down' | 'flat';
}) {
  const cardTone =
    tone === 'income'
      ? 'border-[var(--income)]/25 bg-[var(--primary-subtle)]/70'
      : tone === 'expense'
        ? 'border-[var(--expense)]/25 bg-[var(--danger-subtle)]/55'
        : tone === 'primary'
          ? 'border-[var(--orbit-primary)]/35 bg-[var(--orbit-primary-subtle)]'
          : 'border-[var(--orbit-primary)]/20 bg-[var(--surface-raised)]';
  const iconTone =
    tone === 'income'
      ? 'bg-[var(--primary-subtle)] text-[var(--income)]'
      : tone === 'expense'
        ? 'bg-[var(--danger-subtle)] text-[var(--expense)]'
        : 'bg-[var(--orbit-primary-subtle)] text-[var(--orbit-primary)]';
  const amountTone =
    tone === 'income'
      ? 'text-[var(--income)]'
      : tone === 'expense'
        ? 'text-[var(--expense)]'
        : tone === 'primary'
          ? 'text-[var(--orbit-primary)]'
          : 'text-[var(--orbit-focus)]';
  const detailClass =
    detailTone === 'positive'
      ? 'text-[var(--income)]'
      : detailTone === 'negative'
        ? 'text-[var(--expense)]'
        : 'text-[var(--text-muted)]';

  return (
    <article className={`min-h-[138px] rounded-[14px] border p-4 ${cardTone}`}>
      <div className="flex items-start gap-3">
        <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-full text-lg ${iconTone}`}>{icon}</span>
        <div className="min-w-0">
          <h2 className="text-sm font-bold text-[var(--foreground)]">{label}</h2>
          <p className="mt-0.5 min-h-4 text-xs text-[var(--text-muted)]">
            {count !== undefined ? `${count} ${countLabel}` : '\u00A0'}
          </p>
          <strong className={`mt-2 block text-[24px] font-extrabold tracking-tight ${amountTone}`}>{amount}</strong>
          <p className={`mt-1 flex items-center gap-1.5 text-xs ${detailClass}`}>
            {detailDirection === 'up' ? (
              <FaArrowUp aria-hidden="true" />
            ) : detailDirection === 'down' ? (
              <FaArrowDown aria-hidden="true" />
            ) : tone === 'primary' ? (
              <FaChartLine aria-hidden="true" />
            ) : tone === 'scheduled' ? (
              <FaClock aria-hidden="true" />
            ) : null}
            {detail}
          </p>
        </div>
      </div>
    </article>
  );
}

export function MovementTimeline({
  month,
  year,
  groups,
  order,
  onOrderChange,
  showValues,
  loading,
  hasMore,
  onLoadMore,
  onOpen,
}: {
  month: number;
  year: number;
  groups: TimelineGroup[];
  order: TimelineOrder;
  onOrderChange: (order: TimelineOrder) => void;
  showValues: boolean;
  loading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  onOpen: (transaction: TransactionDTO) => void;
}) {
  return (
    <article className="min-h-[620px] rounded-[16px] border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xl font-bold">Movimentação de {monthTitle(month, year).toLowerCase()}</h2>
        <label className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
          Ordenar por
          <span className="relative">
            <select
              value={order}
              onChange={(event) => onOrderChange(event.target.value as TimelineOrder)}
              className="min-h-11 sm:min-h-9 appearance-none rounded-[10px] border border-[var(--border)] bg-[var(--surface-raised)] py-2 pl-3 pr-9 text-xs font-semibold text-[var(--foreground)] outline-none focus:border-[var(--orbit-primary)]"
            >
              <option value="newest">Mais recente</option>
              <option value="oldest">Mais antigo</option>
            </select>
            <FaChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--text-muted)]" aria-hidden="true" />
          </span>
        </label>
      </header>

      {loading ? (
        <div className="mt-5 space-y-3" role="status" aria-label="Carregando movimentações">
          {[1, 2, 3, 4, 5].map((item) => (
            <div key={item} className="h-[66px] animate-pulse rounded-[12px] bg-[var(--skeleton)]" />
          ))}
        </div>
      ) : groups.length === 0 ? (
        <div className="mt-5 grid min-h-[420px] place-items-center rounded-[12px] border border-dashed border-[var(--border)]">
          <div className="text-center">
            <p className="text-base font-bold">Nenhuma movimentação neste período</p>
            <p className="mt-1 text-sm text-[var(--text-muted)]">Ajuste os filtros ou registre uma nova transação.</p>
          </div>
        </div>
      ) : (
        <div className="relative mt-5">
          <span className="absolute bottom-8 left-[15px] top-5 hidden w-px border-l border-dashed border-[var(--orbit-primary)]/45 md:block" aria-hidden="true" />
          <div className="space-y-3">
            {groups.map((group) => (
              <div key={group.key} className="grid gap-2 md:grid-cols-[145px_minmax(0,1fr)] md:gap-3">
                <div className="relative flex items-start gap-3 md:pl-10">
                  <span className="absolute left-[5px] top-1.5 hidden h-5 w-5 rounded-full border-[6px] border-[var(--orbit-primary)] bg-[var(--surface)] md:block" aria-hidden="true" />
                  <div>
                    <p className="text-sm font-bold text-[var(--foreground)]">{group.primaryLabel}</p>
                    <p className="mt-1 text-xs text-[var(--text-muted)]">{group.secondaryLabel}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  {group.items.map((transaction) => (
                    <TimelineTransactionRow
                      key={transaction.id}
                      transaction={transaction}
                      showValues={showValues}
                      onOpen={() => onOpen(transaction)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {hasMore && !loading && (
        <button
          type="button"
          onClick={onLoadMore}
          className="mx-auto mt-4 flex min-h-11 sm:min-h-9 w-full max-w-[520px] items-center justify-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-raised)] px-4 text-xs font-semibold hover:bg-[var(--surface-hover)]"
        >
          Ver mais transações <FaChevronDown aria-hidden="true" />
        </button>
      )}
    </article>
  );
}

export function TimelineTransactionRow({
  transaction,
  showValues,
  onOpen,
}: {
  transaction: TransactionDTO;
  showValues: boolean;
  onOpen: () => void;
}) {
  const isTransfer = isTransferTransaction(transaction);
  const isCardPayment = transaction.kind === 'CARD_PAYMENT';
  const isIncome = transaction.type === 'INCOME';
  const amountTone = isTransfer || isCardPayment
    ? 'text-[var(--orbit-primary)]'
    : isIncome
      ? 'text-[var(--income)]'
      : 'text-[var(--expense)]';
  const iconBackground = isTransfer || isCardPayment
    ? 'var(--orbit-primary-subtle)'
    : transaction.category?.color || 'var(--surface-subtle)';
  const iconColor = isTransfer || isCardPayment ? 'var(--orbit-primary)' : '#ffffff';

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`Abrir detalhe contextual da transação ${transaction.description || 'Sem descrição'}`}
      className="grid min-h-[66px] w-full grid-cols-[40px_minmax(0,1fr)_24px] items-center gap-2 rounded-[12px] border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 text-left transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)] sm:grid-cols-[44px_minmax(0,1fr)_110px_88px_24px] sm:gap-3"
    >
      <span className="grid h-10 w-10 place-items-center rounded-[11px]" style={{ backgroundColor: iconBackground, color: iconColor }}>
        {isTransfer ? <FaExchangeAlt aria-hidden="true" /> : isCardPayment ? <FaCreditCard aria-hidden="true" /> : <IconRenderer iconName={transaction.category?.icon || (isIncome ? 'income-up' : 'tag')} size={16} />}
      </span>
      <span className="min-w-0">
        <strong className="block truncate text-sm text-[var(--foreground)]">{transaction.description || 'Sem descrição'}</strong>
        <span className="mt-1 block truncate text-xs text-[var(--text-muted)]">
          {isTransfer ? `Transferências • ${transaction.account?.name ?? 'Conta'}` : isCardPayment ? `Pagamento de fatura • ${transaction.account?.name ?? 'Conta'}` : `${transaction.category?.name ?? 'Sem categoria'} • ${transaction.account?.name ?? 'Conta'}`}
          {isTransfer && <span className="sr-only"> · {getTransferCounterpartLabel(transaction)}</span>}
        </span>
        <TransactionTags transaction={transaction} />
      </span>
      <span className="col-span-2 col-start-2 row-start-2 flex min-w-0 items-center justify-between gap-3 text-right sm:col-span-1 sm:col-start-auto sm:row-start-auto sm:grid sm:shrink-0 sm:justify-items-end sm:gap-1">
        <strong className={`text-sm ${amountTone}`}>{formatTransactionAmount(transaction, showValues)}</strong>
        <span className="text-xs text-[var(--text-muted)]">{formatTransactionTime(transaction)}</span>
      </span>
      <span className="col-start-2 row-start-3 justify-self-start sm:col-start-auto sm:row-start-auto sm:justify-self-center">
        <StatusPill status={transaction.status} />
      </span>
      <span className="col-start-3 row-start-1 text-center text-lg leading-none text-[var(--text-muted)] sm:col-start-auto sm:row-start-auto" aria-hidden="true">⋮</span>
    </button>
  );
}

export function MonthOverview({
  summary,
  previousSummary,
  bars,
  maxBar,
  showValues,
  balanceTrend,
}: {
  summary: CurrencyFinancialSummary;
  previousSummary: CurrencyFinancialSummary;
  bars: MonthBar[];
  maxBar: number;
  showValues: boolean;
  balanceTrend: number | null;
}) {
  const positive = summary.balance >= 0;
  const insightTitle = positive ? 'Você está no positivo!' : 'Atenção ao saldo do mês';
  let insightText = positive
    ? `Saldo de ${displayMoney(summary.balance, showValues, summary.currency)} neste mês.`
    : `As saídas superam as entradas em ${displayMoney(Math.abs(summary.balance), showValues, summary.currency)}.`;

  if (balanceTrend !== null && previousSummary.balance !== 0) {
    const direction = balanceTrend >= 0 ? 'maior' : 'menor';
    insightText = `Seu saldo está ${Math.abs(balanceTrend).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}% ${direction} que no mês passado.`;
  }

  return (
    <article className="rounded-[16px] border border-[var(--border)] bg-[var(--surface)] p-4">
      <header className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold">Visão do mês</h2>
        <Link href="/dashboard" className="text-xs font-semibold text-[var(--orbit-primary)]">Ver relatório →</Link>
      </header>

      <div className="mt-4 grid grid-cols-[minmax(0,1fr)_135px] items-end gap-4">
        <div className="grid h-[92px] grid-cols-8 items-end gap-1.5 border-b border-[var(--border)] px-1 pb-1">
          {bars.map((bar, index) => {
            const height = bar.value === 0 ? 10 : Math.max(18, Math.round((bar.value / maxBar) * 82));
            const tone =
              bar.tone === 'income'
                ? 'bg-[var(--income)]'
                : bar.tone === 'expense'
                  ? 'bg-[var(--expense)]'
                  : 'bg-[var(--surface-subtle)]';
            return (
              <span key={index} className="flex h-full min-w-0 items-end justify-center border-x border-[var(--border)]/25">
                <span className={`w-[68%] rounded-t-sm ${tone}`} style={{ height }} />
              </span>
            );
          })}
        </div>

        <div className="space-y-3 pb-1">
          <div className="flex items-start gap-2">
            <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-[var(--income)]" />
            <div>
              <strong className="block text-base text-[var(--income)]">{displayMoney(summary.income, showValues, summary.currency)}</strong>
              <span className="text-xs text-[var(--text-muted)]">Entradas</span>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full border-[3px] border-[var(--expense)]" />
            <div>
              <strong className="block text-base text-[var(--expense)]">{displayMoney(summary.expense, showValues, summary.currency)}</strong>
              <span className="text-xs text-[var(--text-muted)]">Saídas</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-3 rounded-[12px] border border-[var(--border)] bg-[var(--surface-raised)] p-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[var(--orbit-primary-subtle)] text-[var(--orbit-primary)]">
          <FaChartLine aria-hidden="true" />
        </span>
        <div>
          <strong className="block text-sm">{insightTitle}</strong>
          <p className="mt-0.5 text-xs text-[var(--text-muted)]">{insightText}</p>
        </div>
      </div>
    </article>
  );
}

export function UpcomingTransactions({
  items,
  showValues,
  onOpen,
  onViewAll,
}: {
  items: TransactionDTO[];
  showValues: boolean;
  onOpen: (transaction: TransactionDTO) => void;
  onViewAll: () => void;
}) {
  return (
    <article className="rounded-[16px] border border-[var(--border)] bg-[var(--surface)] p-4">
      <header className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold">Próximos lançamentos</h2>
        <Link href="/calendario" className="text-xs font-semibold text-[var(--orbit-primary)]">Ver calendário →</Link>
      </header>

      <div className="mt-3 divide-y divide-[var(--border)]">
        {items.length === 0 ? (
          <div className="grid min-h-[210px] place-items-center rounded-[12px] border border-dashed border-[var(--border)] px-4 text-center">
            <div>
              <FaCalendarAlt className="mx-auto text-xl text-[var(--orbit-primary)]" aria-hidden="true" />
              <p className="mt-2 text-sm font-bold">Nenhum lançamento agendado</p>
              <p className="mt-1 text-xs text-[var(--text-muted)]">Seus próximos compromissos aparecerão aqui.</p>
            </div>
          </div>
        ) : (
          items.slice(0, 4).map((transaction) => (
            <button
              key={transaction.id}
              type="button"
              onClick={() => onOpen(transaction)}
              aria-label={`Abrir detalhe contextual da transação ${transaction.description || 'Sem descrição'}`}
              className="grid min-h-[62px] w-full grid-cols-[44px_minmax(0,1fr)] items-center gap-2 px-1 py-2 text-left transition-colors hover:bg-[var(--surface-hover)] sm:grid-cols-[44px_36px_minmax(0,1fr)_auto] sm:px-0"
            >
              <span className="grid h-11 w-11 place-content-center rounded-[9px] border border-[var(--border)] bg-[var(--surface-raised)] text-center">
                <strong className="text-sm leading-none">{String(transaction.day).padStart(2, '0')}</strong>
                <span className="mt-1 text-xs font-semibold uppercase text-[var(--text-muted)]">{compactMonth(transaction.month, transaction.year)}</span>
              </span>
              <span
                className="hidden h-9 w-9 place-items-center rounded-full text-white sm:grid"
                style={{ backgroundColor: transaction.category?.color || 'var(--orbit-primary)' }}
              >
                <IconRenderer iconName={transaction.category?.icon || 'calendar'} size={14} />
              </span>
              <span className="min-w-0">
                <strong className="block truncate text-xs">{transaction.description || 'Sem descrição'}</strong>
                <span className="mt-1 block truncate text-xs text-[var(--text-muted)]">
                  {transaction.category?.name ?? 'Sem categoria'} • {transaction.account?.name ?? 'Conta'}
                </span>
              </span>
              <span className="col-start-2 flex min-w-0 items-center justify-between gap-2 sm:col-start-auto sm:grid sm:shrink-0 sm:justify-items-end sm:gap-1">
                <strong className={`text-xs ${transaction.type === 'INCOME' ? 'text-[var(--income)]' : 'text-[var(--expense)]'}`}>
                  {formatTransactionAmount(transaction, showValues)}
                </strong>
                <span className="flex items-center gap-2">
                  <span className="text-xs text-[var(--text-muted)]">{scheduledDistanceLabel(transaction)}</span>
                  <span className="rounded-full bg-[var(--orbit-primary-subtle)] px-2 py-1 text-xs font-bold text-[var(--orbit-primary)]">Agendada</span>
                </span>
              </span>
            </button>
          ))
        )}
      </div>

      {items.length > 0 && (
        <button
          type="button"
          onClick={onViewAll}
          className="mt-3 flex min-h-11 sm:min-h-9 w-full items-center justify-center gap-2 rounded-[10px] border border-[var(--border)] bg-[var(--surface-raised)] px-3 text-xs font-semibold hover:bg-[var(--surface-hover)]"
        >
          Ver todos os agendados ({items.length}) <FaArrowRight aria-hidden="true" />
        </button>
      )}
    </article>
  );
}

export function TransactionTags({ transaction }: { transaction: TransactionDTO }) {
  if (!transaction.tags?.length) return null;
  return (
    <span className="flex flex-wrap gap-1">
      {transaction.tags.slice(0, 3).map((tag) => (
        <span key={tag.id} className="rounded-full bg-[var(--surface-subtle)] px-1.5 py-0.5 text-xs font-semibold text-[var(--text-muted)]">
          #{tag.name}
        </span>
      ))}
      {transaction.tags.length > 3 ? (
        <span className="text-xs text-[var(--text-muted)]">+{transaction.tags.length - 3}</span>
      ) : null}
    </span>
  );
}
