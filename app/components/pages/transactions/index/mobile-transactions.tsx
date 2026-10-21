'use client';

import { FaArrowDown, FaArrowUp, FaCalendarAlt, FaChartLine, FaChevronDown, FaChevronLeft, FaChevronRight, FaCreditCard, FaExchangeAlt, FaFilter } from 'react-icons/fa';
import { Button, Chip, ChipRow, IconButton, IconRenderer } from '@/app/components/ui';
import { isTransferTransaction } from '@/app/lib/transactions/transaction-presentation';
import { CurrencyFinancialSummary } from '@/app/types/financial-summary';
import { TransactionDTO } from '@/app/types/transaction';
import { MobileQuickFilter, TimelineGroup, displayMoney, formatTransactionAmount, formatTransactionTime, monthTitle, scheduledDistanceLabel } from '@/app/components/pages/transactions/index/transactions-view-helpers';
import { TransactionTags } from '@/app/components/pages/transactions/index/desktop-transactions';

export function MobileTransactionsPrototype2({
  month,
  year,
  summary,
  scheduled,
  groups,
  quickFilter,
  activeFiltersCount,
  showValues,
  loading,
  onMovePeriod,
  onOpenPeriod,
  onOpenFilters,
  onQuickFilterChange,
  onOpenTransaction,
  onShowPending,
  hasMore,
  onLoadMore,
}: {
  month: number;
  year: number;
  summary: CurrencyFinancialSummary;
  scheduled: TransactionDTO[];
  groups: TimelineGroup[];
  quickFilter: MobileQuickFilter;
  activeFiltersCount: number;
  showValues: boolean;
  loading: boolean;
  onMovePeriod: (offset: number) => void;
  onOpenPeriod: () => void;
  onOpenFilters: () => void;
  onQuickFilterChange: (filter: MobileQuickFilter) => void;
  onOpenTransaction: (transaction: TransactionDTO) => void;
  onShowPending: () => void;
  hasMore: boolean;
  onLoadMore: () => void;
}) {
  const balanceMessage =
    summary.balance < 0
      ? 'Você gastou mais que recebeu.'
      : summary.balance > 0
        ? 'Você recebeu mais do que gastou.'
        : 'Entradas e saídas ficaram equilibradas.';

  return (
    <div className="space-y-4 pb-3">
      <section className="grid grid-cols-[44px_minmax(0,1fr)_44px] gap-2">
        <IconButton
          label="Mês anterior"
          icon={<FaChevronLeft />}
          onClick={() => onMovePeriod(-1)}
          disabled={loading}
          className="border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)]"
        />
        <button
          type="button"
          onClick={onOpenPeriod}
          aria-haspopup="dialog"
          className="inline-flex h-11 min-w-0 items-center justify-center gap-2 rounded-[11px] border border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-bold"
        >
          <span className="truncate">{monthTitle(month, year)}</span>
          <FaChevronDown className="shrink-0 text-xs text-[var(--text-muted)]" aria-hidden="true" />
        </button>
        <IconButton
          label="Próximo mês"
          icon={<FaChevronRight />}
          onClick={() => onMovePeriod(1)}
          disabled={loading}
          className="border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)]"
        />
      </section>

      <section
        className="rounded-[16px] border border-[var(--orbit-primary)]/35 bg-[var(--surface)] p-4"
        style={{
          background:
            'linear-gradient(135deg, color-mix(in srgb, var(--orbit-primary) 13%, var(--surface)) 0%, var(--surface) 62%)',
        }}
        aria-label="Resumo do mês"
      >
        <div className="flex items-start gap-3">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[var(--danger-subtle)] text-lg text-[var(--expense)]">
            <FaChartLine aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-sm text-[var(--text-muted)]">Saldo do mês</p>
            <strong className={`mt-1 block text-3xl font-black tracking-tight ${
              summary.balance < 0 ? 'text-[var(--expense)]' : 'text-[var(--income)]'
            }`}>
              {displayMoney(summary.balance, showValues, summary.currency)}
            </strong>
            <p className="mt-1 text-xs text-[var(--text-muted)]">{balanceMessage}</p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 divide-x divide-[var(--border)] border-t border-[var(--border)] pt-4">
          <div className="flex items-center gap-2.5 pr-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--primary-subtle)] text-[var(--income)]">
              <FaArrowUp aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-xs text-[var(--text-muted)]">Entradas</p>
              <strong className="mt-0.5 block tabular-nums text-sm text-[var(--income)]">
                {displayMoney(summary.income, showValues, summary.currency)}
              </strong>
            </div>
          </div>
          <div className="flex items-center gap-2.5 pl-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--danger-subtle)] text-[var(--expense)]">
              <FaArrowDown aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-xs text-[var(--text-muted)]">Saídas</p>
              <strong className="mt-0.5 block tabular-nums text-sm text-[var(--expense)]">
                {displayMoney(summary.expense, showValues, summary.currency)}
              </strong>
            </div>
          </div>
        </div>
      </section>

      <div>
        <ChipRow label="Filtros rápidos">
          {([
            ['all', 'Todas'],
            ['income', 'Receitas'],
            ['expense', 'Despesas'],
            ['pending', 'Pendentes'],
          ] as Array<[MobileQuickFilter, string]>).map(([value, label]) => (
            <Chip key={value} selected={quickFilter === value} onClick={() => onQuickFilterChange(value)}>
              {label}
            </Chip>
          ))}
        </ChipRow>
        <Button
          variant="outline"
          fullWidth
          className="mt-2"
          icon={<FaFilter aria-hidden="true" />}
          onClick={onOpenFilters}
        >
          Filtros
          {activeFiltersCount > 0 && (
            <span className="ml-2 rounded-full bg-[var(--orbit-primary-subtle)] px-2 py-0.5 text-xs font-bold text-[var(--orbit-primary)]">
              {activeFiltersCount}
            </span>
          )}
        </Button>
      </div>

      <MobileUpcomingPreview
        items={scheduled}
        showValues={showValues}
        onOpen={onOpenTransaction}
        onViewAll={onShowPending}
      />

      <MobileActivityFeed
        groups={groups}
        loading={loading}
        showValues={showValues}
        quickFilter={quickFilter}
        onOpen={onOpenTransaction}
        hasMore={hasMore}
        onLoadMore={onLoadMore}
      />
    </div>
  );
}

export function MobileUpcomingPreview({
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
  const first = items[0];

  return (
    <section>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-bold min-[360px]:text-base">Próximos lançamentos</h2>
        {items.length > 0 && (
          <Button variant="link" size="xs" onClick={onViewAll}>
            Ver todos
          </Button>
        )}
      </div>

      {!first ? (
        <div className="mt-2 rounded-[12px] border border-[var(--border)] bg-[var(--surface)] px-3 py-3 text-xs text-[var(--text-muted)]">
          Nenhum lançamento agendado para este período.
        </div>
      ) : (
        <button
          type="button"
          onClick={() => onOpen(first)}
          aria-label={`Abrir detalhe contextual da transação ${first.description || 'Sem descrição'}`}
          className="mt-2 grid min-h-[58px] w-full grid-cols-[38px_minmax(0,1fr)_auto_12px] items-center gap-2.5 rounded-[11px] border border-[var(--border)] bg-[var(--surface)] px-2.5 py-2 text-left"
        >
          <span className="grid h-9 w-9 place-items-center rounded-[9px] bg-[var(--surface-raised)] text-[var(--text-muted)]">
            <FaCalendarAlt aria-hidden="true" />
          </span>
          <span className="min-w-0">
            <strong className="block truncate text-sm">{first.description || 'Sem descrição'}</strong>
            <span className="mt-1 block truncate text-xs text-[var(--text-muted)]">
              {scheduledDistanceLabel(first)} • {first.account?.name ?? 'Conta'}
            </span>
          </span>
          <strong className={`shrink-0 text-xs ${first.type === 'INCOME' ? 'text-[var(--income)]' : 'text-[var(--expense)]'}`}>
            {formatTransactionAmount(first, showValues)}
          </strong>
          <FaChevronRight className="text-xs text-[var(--text-muted)]" aria-hidden="true" />
        </button>
      )}
    </section>
  );
}

export function MobileActivityFeed({
  groups,
  loading,
  showValues,
  quickFilter,
  onOpen,
  hasMore,
  onLoadMore,
}: {
  groups: TimelineGroup[];
  loading: boolean;
  showValues: boolean;
  quickFilter: MobileQuickFilter;
  onOpen: (transaction: TransactionDTO) => void;
  hasMore: boolean;
  onLoadMore: () => void;
}) {
  if (loading) {
    return (
      <section className="space-y-2" role="status" aria-label="Carregando movimentações">
        {[1, 2, 3, 4, 5].map((item) => (
          <div key={item} className="h-[56px] animate-pulse rounded-[10px] bg-[var(--skeleton)]" />
        ))}
      </section>
    );
  }

  if (groups.length === 0) {
    return (
      <section className="rounded-[12px] border border-dashed border-[var(--border)] px-4 py-8 text-center">
        <p className="text-sm font-bold">Nenhuma movimentação nesta visão</p>
        <p className="mt-1 text-xs text-[var(--text-muted)]">
          {quickFilter === 'pending' ? 'Nenhuma transação pendente neste período.' : 'Tente outro filtro ou período.'}
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-4" aria-label="Atividade financeira">
      {groups.map((group) => {
        const title =
          group.primaryLabel === 'Hoje' || group.primaryLabel === 'Ontem'
            ? `${group.primaryLabel} • ${group.secondaryLabel}`
            : group.secondaryLabel;

        return (
          <div key={group.key}>
            <h2 className="border-b border-[var(--border)] pb-2 text-sm font-bold text-[var(--foreground)]">{title}</h2>
            <div className="divide-y divide-[var(--border)]">
              {group.items.map((transaction) => (
                <MobileTransactionRow
                  key={transaction.id}
                  transaction={transaction}
                  showValues={showValues}
                  onOpen={() => onOpen(transaction)}
                />
              ))}
            </div>
          </div>
        );
      })}
      {hasMore && (
        <Button variant="secondary" fullWidth onClick={onLoadMore} icon={<FaChevronDown aria-hidden="true" />} iconPosition="right">
          Carregar mais transações
        </Button>
      )}
    </section>
  );
}

export function MobileTransactionRow({
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
    ? 'var(--orbit-primary)'
    : transaction.category?.color || 'var(--surface-subtle)';

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`Abrir detalhe contextual da transação ${transaction.description || 'Sem descrição'}`}
      className="grid min-h-[56px] w-full grid-cols-[38px_minmax(0,1fr)_auto] items-center gap-2.5 py-1.5 text-left"
    >
      <span className="grid h-9 w-9 place-items-center rounded-full text-white" style={{ backgroundColor: iconBackground }}>
        {isTransfer ? (
          <FaExchangeAlt aria-hidden="true" />
        ) : isCardPayment ? (
          <FaCreditCard aria-hidden="true" />
        ) : (
          <IconRenderer iconName={transaction.category?.icon || (isIncome ? 'income-up' : 'tag')} size={15} />
        )}
      </span>

      <span className="min-w-0">
        <strong className="block truncate text-sm">{transaction.description || 'Sem descrição'}</strong>
        <span className="mt-0.5 block truncate text-xs text-[var(--text-muted)]">
          {transaction.account?.name ?? 'Conta'} • {isTransfer ? 'Transferência' : isCardPayment ? 'Pagamento de fatura' : transaction.category?.name ?? 'Sem categoria'}
        </span>
        <TransactionTags transaction={transaction} />
      </span>

      <span className="min-w-[86px] text-right">
        <strong className={`block text-xs ${amountTone}`}>{formatTransactionAmount(transaction, showValues)}</strong>
        <span className="mt-1 block text-xs text-[var(--text-muted)]">
          {transaction.status === 'PENDING' ? 'Pendente' : formatTransactionTime(transaction)}
        </span>
      </span>
    </button>
  );
}
