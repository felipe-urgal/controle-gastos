'use client';

import { motion, useReducedMotion } from 'framer-motion';
import Link from 'next/link';
import { FaArrowDown, FaArrowUp, FaCalendarAlt, FaChartLine, FaChevronDown, FaChevronRight, FaCreditCard, FaExchangeAlt, FaFilter } from 'react-icons/fa';
import { CARD_EASE, CARD_VIEWPORT, CountUp, reducedTransition } from '@/app/components/ui/motion';
import { Button, Chip, ChipRow, IconRenderer, PeriodSwitcher } from '@/app/components/ui';
import { isTransferTransaction } from '@/app/lib/transactions/transaction-presentation';
import { CurrencyFinancialSummary } from '@/app/types/financial-summary';
import { TransactionDTO } from '@/app/types/transaction';
import { MobileQuickFilter, TimelineGroup, displayMoney, formatTransactionAmount, formatTransactionTime, scheduledDistanceLabel } from '@/app/components/pages/transactions/index/transactions-view-helpers';
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
  summaryStatus,
  onMovePeriod,
  onOpenFilters,
  onQuickFilterChange,
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
  /** `loading`: primeira carga (esqueleto); `refreshing`: troca de período (valores esmaecidos). */
  summaryStatus: 'ready' | 'loading' | 'refreshing';
  onMovePeriod: (offset: number) => void;
  onOpenFilters: () => void;
  onQuickFilterChange: (filter: MobileQuickFilter) => void;
  onShowPending: () => void;
  hasMore: boolean;
  onLoadMore: () => void;
}) {
  const reduce = useReducedMotion();
  const skeleton = 'block animate-pulse rounded-[var(--radius-sm)] bg-[var(--skeleton)]';
  const summaryLoading = summaryStatus === 'loading';
  const dim = summaryStatus === 'refreshing' ? 'opacity-50' : '';
  const balanceMessage =
    summary.balance < 0
      ? 'Você gastou mais que recebeu.'
      : summary.balance > 0
        ? 'Você recebeu mais do que gastou.'
        : 'Entradas e saídas ficaram equilibradas.';

  return (
    <div className="space-y-4 pb-3">
      <PeriodSwitcher
        animated="roll"
        className="w-full"
        month={month}
        year={year}
        onPrevious={() => onMovePeriod(-1)}
        onNext={() => onMovePeriod(1)}
        disabled={loading}
      />

      <section
        className="rounded-[var(--radius-lg)] border border-[var(--primary)]/35 bg-[var(--surface)] p-4"
        style={{
          background:
            'linear-gradient(135deg, color-mix(in srgb, var(--primary) 13%, var(--surface)) 0%, var(--surface) 62%)',
        }}
        aria-label="Resumo do mês"
        aria-busy={summaryStatus !== 'ready'}
      >
        <div className="flex items-start gap-3">
          <span className="relative grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[var(--danger-subtle)] text-lg text-[var(--expense)]">
            {/* O anel de ondulação sai do ícone uma vez, como no card de saldo do desktop. */}
            {!reduce && (
              <motion.span
                aria-hidden="true"
                className="absolute inset-0 rounded-full border-2 border-[var(--primary)]"
                initial={{ scale: 1, opacity: 0.6 }}
                animate={{ scale: 2.4, opacity: 0 }}
                transition={{ duration: 1.1, ease: 'easeOut', delay: 0.3 }}
              />
            )}
            <motion.span
              className="flex"
              initial={{ scale: 0.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 420, damping: 14, delay: 0.3 }}
            >
              <FaChartLine aria-hidden="true" />
            </motion.span>
          </span>
          <div className="min-w-0">
            <p className="text-sm text-[var(--text-muted)]">Saldo do mês</p>
            {summaryLoading ? (
              <>
                <span className={`${skeleton} mt-2 h-8 w-40`} aria-hidden="true" />
                <span className={`${skeleton} mt-2 h-3 w-44`} aria-hidden="true" />
              </>
            ) : (
              <div className={`transition-opacity duration-150 ${dim}`}>
                <motion.strong
                  className={`mt-1 block text-3xl font-black tracking-tight ${
                    summary.balance < 0 ? 'text-[var(--expense)]' : 'text-[var(--income)]'
                  }`}
                  initial={{ scale: 0.7, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  style={{ transformOrigin: 'left center' }}
                  transition={{ type: 'spring', stiffness: 380, damping: 14, delay: 0.35 }}
                >
                  <span className="money">{displayMoney(summary.balance, showValues, summary.currency)}</span>
                </motion.strong>
                <p className="mt-1 text-xs text-[var(--text-muted)]">{balanceMessage}</p>
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 divide-x divide-[var(--border)] border-t border-[var(--border)] pt-4">
          <div className="flex items-center gap-2.5 pr-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full bg-[var(--primary-subtle)] text-[var(--income)]">
              <motion.span
                className="flex"
                initial={{ y: 16, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 16, delay: 0.1 }}
              >
                <FaArrowUp aria-hidden="true" />
              </motion.span>
            </span>
            <div className="min-w-0">
              <p className="text-xs text-[var(--text-muted)]">Entradas</p>
              {summaryLoading ? (
                <span className={`${skeleton} mt-1 h-4 w-20`} aria-hidden="true" />
              ) : (
                <strong className={`mt-0.5 block tabular-nums text-sm text-[var(--income)] transition-opacity duration-150 ${dim}`}>
                  {showValues ? (
                    <CountUp amount={summary.income} format={(value) => displayMoney(value, true, summary.currency)} className="money" />
                  ) : (
                    <span className="money">{displayMoney(summary.income, showValues, summary.currency)}</span>
                  )}
                </strong>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2.5 pl-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full bg-[var(--danger-subtle)] text-[var(--expense)]">
              <motion.span
                className="flex"
                initial={{ y: -16, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 380, damping: 9, delay: 0.2 }}
              >
                <FaArrowDown aria-hidden="true" />
              </motion.span>
            </span>
            <div className="min-w-0">
              <p className="text-xs text-[var(--text-muted)]">Saídas</p>
              {summaryLoading ? (
                <span className={`${skeleton} mt-1 h-4 w-20`} aria-hidden="true" />
              ) : (
                <span className="block overflow-hidden">
                  <motion.strong
                    className={`mt-0.5 block tabular-nums text-sm text-[var(--expense)] transition-opacity duration-150 ${dim}`}
                    initial={{ y: '-110%' }}
                    animate={{ y: 0 }}
                    transition={{ type: 'spring', stiffness: 320, damping: 18, delay: 0.25 }}
                  >
                    <span className="money">{displayMoney(summary.expense, showValues, summary.currency)}</span>
                  </motion.strong>
                </span>
              )}
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
            <Chip key={value} layoutId="transactions-mobile-quick-filter" selected={quickFilter === value} onClick={() => onQuickFilterChange(value)}>
              {label}
            </Chip>
          ))}
        </ChipRow>
        <motion.div
          className="mt-2"
          initial={{ scale: 0.92, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 380, damping: 20, delay: 0.4 }}
        >
          <Button
            variant="outline"
            fullWidth
            icon={<FaFilter aria-hidden="true" />}
            onClick={onOpenFilters}
          >
            Filtros
            {activeFiltersCount > 0 && (
              <motion.span
                key={activeFiltersCount}
                className="ml-2 rounded-full bg-[var(--primary-subtle)] px-2 py-0.5 text-xs font-bold text-[var(--primary)]"
                initial={{ scale: 0.4 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 500, damping: 12 }}
              >
                {activeFiltersCount}
              </motion.span>
            )}
          </Button>
        </motion.div>
      </div>

      <MobileUpcomingPreview
        items={scheduled}
        showValues={showValues}
        onViewAll={onShowPending}
      />

      <MobileActivityFeed
        groups={groups}
        loading={loading}
        showValues={showValues}
        quickFilter={quickFilter}
        hasMore={hasMore}
        onLoadMore={onLoadMore}
      />
    </div>
  );
}

export function MobileUpcomingPreview({
  items,
  showValues,
  onViewAll,
}: {
  items: TransactionDTO[];
  showValues: boolean;
  onViewAll: () => void;
}) {
  const reduce = useReducedMotion();
  const first = items[0];
  if (!first) return null;

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

      <Link
          href={`/transacoes/show/${first.id}`}
          aria-label={`Abrir transação ${first.description || 'Sem descrição'}`}
          className="mt-2 grid min-h-[58px] w-full grid-cols-[38px_minmax(0,1fr)_auto_12px] items-center gap-2.5 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-2.5 py-2 text-left"
        >
          <motion.span
            className="grid h-9 w-9 place-items-center rounded-[var(--radius-md)] bg-[var(--surface-raised)] text-[var(--text-muted)]"
            initial={{ scale: 1.8, rotate: -14, opacity: 0 }}
            whileInView={{ scale: 1, rotate: 0, opacity: 1 }}
            viewport={CARD_VIEWPORT}
            transition={reducedTransition(reduce, { type: 'spring', stiffness: 420, damping: 13 })}
          >
            <FaCalendarAlt aria-hidden="true" />
          </motion.span>
          <span className="min-w-0">
            <strong className="block truncate text-sm">{first.description || 'Sem descrição'}</strong>
            <span className="mt-1 block truncate text-xs text-[var(--text-muted)]">
              {scheduledDistanceLabel(first)} • {first.account?.name ?? 'Conta'}
            </span>
          </span>
          <strong className={`money shrink-0 text-xs ${first.type === 'INCOME' ? 'text-[var(--income)]' : 'text-[var(--expense)]'}`}>
            {formatTransactionAmount(first, showValues)}
          </strong>
          <FaChevronRight className="text-xs text-[var(--text-muted)]" aria-hidden="true" />
      </Link>
    </section>
  );
}

export function MobileActivityFeed({
  groups,
  loading,
  showValues,
  quickFilter,
  hasMore,
  onLoadMore,
}: {
  groups: TimelineGroup[];
  loading: boolean;
  showValues: boolean;
  quickFilter: MobileQuickFilter;
  hasMore: boolean;
  onLoadMore: () => void;
}) {
  const reduce = useReducedMotion();

  if (loading) {
    return (
      <section className="space-y-2" role="status" aria-label="Carregando movimentações">
        {[1, 2, 3, 4, 5].map((item) => (
          <div key={item} className="h-[56px] animate-pulse rounded-[var(--radius-md)] bg-[var(--skeleton)]" />
        ))}
      </section>
    );
  }

  if (groups.length === 0) {
    return (
      <section className="rounded-[var(--radius-md)] border border-dashed border-[var(--border)] px-4 py-8 text-center">
        <p className="text-sm font-bold">Nenhuma movimentação nesta visão</p>
        <p className="mt-1 text-xs text-[var(--text-muted)]">
          {quickFilter === 'pending' ? 'Nenhuma transação pendente neste período.' : 'Tente outro filtro ou período.'}
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-4" aria-label="Atividade financeira">
      {groups.map((group, groupIndex) => {
        const title =
          group.primaryLabel === 'Hoje' || group.primaryLabel === 'Ontem'
            ? `${group.primaryLabel} • ${group.secondaryLabel}`
            : group.secondaryLabel;

        return (
          // O grupo (visível) observa a viewport: o título desenha a linha e as transações sobem em sequência.
          <motion.div key={group.key} initial="hidden" whileInView="shown" viewport={CARD_VIEWPORT}>
            <h2 className="relative pb-2 text-sm font-bold text-[var(--foreground)]">
              {title}
              <motion.span
                aria-hidden="true"
                className="absolute inset-x-0 bottom-0 h-px origin-left bg-[var(--border)]"
                variants={{ hidden: { scaleX: 0 }, shown: { scaleX: 1 } }}
                transition={reducedTransition(reduce, { duration: 0.5, ease: CARD_EASE, delay: Math.min(groupIndex, 5) * 0.08 })}
              />
            </h2>
            <motion.div
              className="divide-y divide-[var(--border)]"
              variants={{ hidden: {}, shown: { transition: { staggerChildren: 0.06, delayChildren: Math.min(groupIndex, 5) * 0.08 + 0.1 } } }}
            >
              {group.items.map((transaction) => (
                <motion.div
                  key={transaction.id}
                  variants={{ hidden: { opacity: 0, y: 12 }, shown: { opacity: 1, y: 0, transition: { duration: 0.35, ease: CARD_EASE } } }}
                >
                  <MobileTransactionRow transaction={transaction} showValues={showValues} />
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
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
}: {
  transaction: TransactionDTO;
  showValues: boolean;
}) {
  const isTransfer = isTransferTransaction(transaction);
  const isCardPayment = transaction.kind === 'CARD_PAYMENT';
  const isIncome = transaction.type === 'INCOME';
  const amountTone = isTransfer || isCardPayment
    ? 'text-[var(--primary)]'
    : isIncome
      ? 'text-[var(--income)]'
      : 'text-[var(--expense)]';
  const iconBackground = isTransfer || isCardPayment
    ? 'var(--primary)'
    : transaction.category?.color || 'var(--surface-subtle)';

  return (
    <Link
      href={`/transacoes/show/${transaction.id}`}
      aria-label={`Abrir transação ${transaction.description || 'Sem descrição'}`}
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
          {transaction.account?.name ?? 'Conta'} • {isTransfer ? 'Transferência' : isCardPayment ? 'Pagamento de fatura' : transaction.kind === 'OPENING_BALANCE' ? 'Saldo inicial' : transaction.category?.name ?? 'Sem categoria'}
        </span>
        <TransactionTags transaction={transaction} />
      </span>

      <span className="min-w-[86px] text-right">
        <strong className={`money block text-xs ${amountTone}`}>{formatTransactionAmount(transaction, showValues)}</strong>
        <span className="mt-1 block text-xs text-[var(--text-muted)]">
          {transaction.status === 'PENDING' ? 'Pendente' : formatTransactionTime(transaction)}
        </span>
      </span>
    </Link>
  );
}
