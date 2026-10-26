'use client';

import { motion, useReducedMotion, type TargetAndTransition, type Transition } from 'framer-motion';
import Link from 'next/link';
import { ReactNode, useState } from 'react';
import { FaArrowDown, FaArrowRight, FaArrowUp, FaCalendarAlt, FaChartLine, FaChevronDown, FaChevronRight, FaClock, FaCreditCard, FaExchangeAlt } from 'react-icons/fa';
import { Button, IconRenderer, MoneyText, Select } from '@/app/components/ui';
import { CARD_EASE, CARD_VIEWPORT, CountUp, reducedTransition } from '@/app/components/ui/motion';
import { getTransferCounterpartLabel, isTransferTransaction } from '@/app/lib/transactions/transaction-presentation';
import { CurrencyFinancialSummary } from '@/app/types/financial-summary';
import { TransactionDTO } from '@/app/types/transaction';
import { MonthBar, TimelineGroup, TimelineOrder, compactMonth, displayMoney, formatTransactionAmount, formatTransactionTime, monthTitle, scheduledDistanceLabel } from '@/app/components/pages/transactions/index/transactions-view-helpers';
import { StatusPill } from '@/app/components/pages/transactions/index/transaction-dialogs';

type SummaryTone = 'income' | 'expense' | 'primary' | 'scheduled';

const MotionLink = motion.create(Link);
type Entry = { initial: TargetAndTransition; animate: TargetAndTransition; transition: Transition };

/** Ícone de cada card de resumo: a seta de entrada sobe, a de saída cai, o saldo cresce e o relógio gira. */
const iconEntry: Record<SummaryTone, Entry> = {
  income: { initial: { y: 16, opacity: 0 }, animate: { y: 0, opacity: 1 }, transition: { type: 'spring', stiffness: 300, damping: 16, delay: 0.1 } },
  expense: { initial: { y: -16, opacity: 0 }, animate: { y: 0, opacity: 1 }, transition: { type: 'spring', stiffness: 380, damping: 9, delay: 0.2 } },
  primary: { initial: { scale: 0.4, opacity: 0 }, animate: { scale: 1, opacity: 1 }, transition: { type: 'spring', stiffness: 420, damping: 14, delay: 0.3 } },
  scheduled: { initial: { rotate: -360, opacity: 0 }, animate: { rotate: 0, opacity: 1 }, transition: { duration: 0.9, ease: CARD_EASE, delay: 0.4 } },
};

/** Valor de cada card: Entradas conta até o número (CountUp, à parte); os demais têm o seu. */
const amountEntry: Record<SummaryTone, Entry> = {
  income: { initial: {}, animate: {}, transition: {} },
  expense: { initial: { y: '-110%' }, animate: { y: 0 }, transition: { type: 'spring', stiffness: 320, damping: 18, delay: 0.25 } },
  primary: { initial: { scale: 0.7, opacity: 0 }, animate: { scale: 1, opacity: 1 }, transition: { type: 'spring', stiffness: 380, damping: 14, delay: 0.35 } },
  scheduled: { initial: { opacity: 0, filter: 'blur(10px)' }, animate: { opacity: 1, filter: 'blur(0px)' }, transition: { duration: 0.7, ease: CARD_EASE, delay: 0.45 } },
};

/** Hover de cada card de resumo: o card, o ícone e o valor reagem de um jeito próprio por tom. */
const cardHover: Record<SummaryTone, { card: TargetAndTransition; icon: TargetAndTransition; amount: TargetAndTransition; glow: string }> = {
  income: { card: { y: -3 }, icon: { y: [0, -6, 0] }, amount: { y: -2 }, glow: 'hover:shadow-[0_10px_26px_-14px_var(--income)]' },
  expense: { card: { y: 3 }, icon: { y: [0, 6, 0] }, amount: { y: 2 }, glow: 'hover:shadow-[0_10px_26px_-14px_var(--expense)]' },
  primary: { card: { scale: 1.02 }, icon: { scale: [1, 1.25, 1] }, amount: { scale: 1.05 }, glow: 'hover:shadow-[0_10px_26px_-14px_var(--primary)]' },
  scheduled: { card: { y: -2 }, icon: { rotate: 360 }, amount: { x: 3 }, glow: 'hover:shadow-[0_10px_26px_-14px_var(--primary)]' },
};

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
  status = 'ready',
  detailLoading = false,
  countUp,
}: {
  label: string;
  count?: number;
  countLabel?: string;
  amount: string;
  tone: 'income' | 'expense' | 'primary' | 'scheduled';
  icon: ReactNode;
  detail?: string;
  detailTone?: 'positive' | 'negative' | 'neutral';
  detailDirection?: 'up' | 'down' | 'flat';
  /** `loading`: primeira carga (esqueleto); `refreshing`: troca de período (valores antigos esmaecidos). */
  status?: 'ready' | 'loading' | 'refreshing';
  /** Só o comparativo com o mês anterior ainda está carregando. */
  detailLoading?: boolean;
  /** Entradas: o valor sobe de zero até este número (só com valores visíveis). */
  countUp?: { value: number; format: (amount: number) => string };
}) {
  const reduce = useReducedMotion();
  const skeleton = 'block animate-pulse rounded-[var(--radius-sm)] bg-[var(--skeleton)]';
  const loading = status === 'loading';
  const cardTone =
    tone === 'income'
      ? 'border-[var(--income)]/25 bg-[var(--primary-subtle)]/70'
      : tone === 'expense'
        ? 'border-[var(--expense)]/25 bg-[var(--danger-subtle)]/55'
        : tone === 'primary'
          ? 'border-[var(--primary)]/35 bg-[var(--primary-subtle)]'
          : 'border-[var(--primary)]/20 bg-[var(--surface-raised)]';
  const iconTone =
    tone === 'income'
      ? 'bg-[var(--primary-subtle)] text-[var(--income)]'
      : tone === 'expense'
        ? 'bg-[var(--danger-subtle)] text-[var(--expense)]'
        : 'bg-[var(--primary-subtle)] text-[var(--primary)]';
  const amountTone =
    tone === 'income'
      ? 'text-[var(--income)]'
      : tone === 'expense'
        ? 'text-[var(--expense)]'
        : tone === 'primary'
          ? 'text-[var(--primary)]'
          : 'text-[var(--focus)]';
  const detailClass =
    detailTone === 'positive'
      ? 'text-[var(--income)]'
      : detailTone === 'negative'
        ? 'text-[var(--expense)]'
        : 'text-[var(--text-muted)]';

  return (
    <motion.article
      className={`min-h-[138px] rounded-[var(--radius-lg)] border p-4 transition-shadow ${cardHover[tone].glow} ${cardTone}`}
      aria-busy={status !== 'ready'}
      whileHover="hover"
      whileTap={{ scale: 0.98 }}
      variants={{ hover: { ...cardHover[tone].card, transition: { type: 'spring', stiffness: 420, damping: 24 } } }}
    >
      <div className="flex items-start gap-3">
        <span className={`relative grid h-11 w-11 shrink-0 place-items-center rounded-full text-lg ${iconTone}`}>
          {tone === 'primary' && !reduce && (
            <motion.span
              aria-hidden="true"
              className="absolute inset-0 rounded-full border-2 border-[var(--primary)]"
              initial={{ scale: 1, opacity: 0.6 }}
              animate={{ scale: 2.4, opacity: 0 }}
              transition={{ duration: 1.1, ease: 'easeOut', delay: 0.3 }}
            />
          )}
          <motion.span className="flex" variants={{ hover: { ...cardHover[tone].icon, transition: { duration: 0.6, ease: 'easeInOut' } } }}>
            <motion.span
              className="flex"
              initial={iconEntry[tone].initial}
              animate={iconEntry[tone].animate}
              transition={reducedTransition(reduce, iconEntry[tone].transition)}
            >
              {icon}
            </motion.span>
          </motion.span>
        </span>
        <div className={`min-w-0 flex-1 transition-opacity duration-150 ${status === 'refreshing' ? 'opacity-50' : ''}`}>
          <h2 className="text-sm font-bold text-[var(--foreground)]">{label}</h2>
          <p className="mt-0.5 min-h-4 text-xs text-[var(--text-muted)]">
            {loading ? (
              count !== undefined ? <span className={`${skeleton} h-3 w-20`} /> : '\u00A0'
            ) : count !== undefined ? (
              `${count} ${countLabel}`
            ) : (
              '\u00A0'
            )}
          </p>
          {loading ? (
            <span className={`${skeleton} mt-2 h-8 w-36`} aria-hidden="true" />
          ) : (
            <motion.span className="mt-2 block" variants={{ hover: { ...cardHover[tone].amount, transition: { type: 'spring', stiffness: 400, damping: 16 } } }}>
            <span className="block overflow-hidden">
              {tone === 'income' && countUp ? (
                <CountUp amount={countUp.value} format={countUp.format} className={`money block text-2xl font-extrabold tracking-tight ${amountTone}`} />
              ) : (
                <motion.strong
                  className={`money block text-2xl font-extrabold tracking-tight ${amountTone}`}
                  initial={amountEntry[tone].initial}
                  animate={amountEntry[tone].animate}
                  transition={reducedTransition(reduce, amountEntry[tone].transition)}
                >
                  {amount}
                </motion.strong>
              )}
            </span>
            </motion.span>
          )}
          {!detail && !loading && !detailLoading ? null : loading || detailLoading ? (
            <span className={`${skeleton} mt-2 h-3 w-32`} aria-hidden="true" />
          ) : (
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
          )}
        </div>
      </div>
    </motion.article>
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
}) {
  const reduce = useReducedMotion();

  return (
    <article className="min-h-[620px] rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xl font-bold">Movimentação de {monthTitle(month, year).toLowerCase()}</h2>
        <div className="w-full sm:w-52">
          <Select
            label="Ordenar por"
            value={order}
            onChange={(value) => onOrderChange(value as TimelineOrder)}
            options={[
              { value: 'newest', label: 'Mais recente' },
              { value: 'oldest', label: 'Mais antigo' },
            ]}
          />
        </div>
      </header>

      {loading ? (
        <div className="mt-5 space-y-3" role="status" aria-label="Carregando movimentações">
          {[1, 2, 3, 4, 5].map((item) => (
            <div key={item} className="h-[66px] animate-pulse rounded-[var(--radius-md)] bg-[var(--skeleton)]" />
          ))}
        </div>
      ) : groups.length === 0 ? (
        <div className="mt-5 grid min-h-[420px] place-items-center rounded-[var(--radius-md)] border border-dashed border-[var(--border)]">
          <div className="text-center">
            <p className="text-base font-bold">Nenhuma movimentação neste período</p>
            <p className="mt-1 text-sm text-[var(--text-muted)]">Ajuste os filtros ou registre uma nova transação.</p>
          </div>
        </div>
      ) : (
        <div className="relative mt-5">
          {/* A linha tracejada se desenha de cima para baixo. */}
          <motion.span
            className="absolute bottom-8 left-[15px] top-5 hidden w-px origin-top border-l border-dashed border-[var(--primary)]/45 md:block"
            aria-hidden="true"
            initial={{ scaleY: 0 }}
            animate={{ scaleY: 1 }}
            transition={reducedTransition(reduce, { duration: 1.4, ease: CARD_EASE })}
          />
          <div className="space-y-3">
            {groups.map((group, groupIndex) => (
              // O grupo (visível) observa a viewport; o marcador e as linhas só herdam a animação.
              <motion.div
                key={group.key}
                className="grid gap-2 md:grid-cols-[145px_minmax(0,1fr)] md:gap-3"
                initial="hidden"
                whileInView="shown"
                viewport={CARD_VIEWPORT}
                whileHover="groupHover"
              >
                <div className="relative flex items-start gap-3 md:pl-10">
                  {/* Ao passar o mouse no dia, o marcador da linha pulsa. */}
                  <motion.span
                    className="absolute left-[5px] top-1.5 hidden h-5 w-5 rounded-full border-[6px] border-[var(--primary)] bg-[var(--surface)] md:block"
                    aria-hidden="true"
                    variants={{ hidden: { scale: 0 }, shown: { scale: 1 }, groupHover: { scale: [1, 1.35, 1], transition: { duration: 0.5 } } }}
                    transition={reducedTransition(reduce, { type: 'spring', stiffness: 500, damping: 12, delay: Math.min(groupIndex, 6) * 0.12 })}
                  />
                  <div>
                    <p className="text-sm font-bold text-[var(--foreground)]">{group.primaryLabel}</p>
                    {(group.primaryLabel === 'Hoje' || group.primaryLabel === 'Ontem') && (
                      <p className="mt-1 text-xs text-[var(--text-muted)]">{group.secondaryLabel}</p>
                    )}
                  </div>
                </div>
                <motion.div
                  className="space-y-2"
                  variants={{ hidden: { opacity: 0, y: 10 }, shown: { opacity: 1, y: 0 } }}
                  transition={reducedTransition(reduce, { duration: 0.45, ease: CARD_EASE, delay: Math.min(groupIndex, 6) * 0.12 + 0.1 })}
                >
                  {group.items.map((transaction) => (
                    <TimelineTransactionRow
                      key={transaction.id}
                      transaction={transaction}
                      showValues={showValues}
                    />
                  ))}
                </motion.div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {hasMore && !loading && (
        <motion.div className="mx-auto mt-4 w-full max-w-[520px]" whileHover="hover" whileTap={{ scale: 0.98 }}>
          <Button
            variant="secondary"
            onClick={onLoadMore}
            icon={
              // O chevron quica para baixo.
              <motion.span className="flex" variants={{ hover: { y: [0, 5, -2, 0], transition: { duration: 0.5 } } }}>
                <FaChevronDown aria-hidden="true" />
              </motion.span>
            }
            iconPosition="right"
            className="w-full"
          >
            Ver mais transações
          </Button>
        </motion.div>
      )}
    </article>
  );
}

export function TimelineTransactionRow({
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
    ? 'var(--primary-subtle)'
    : transaction.category?.color || 'var(--surface-subtle)';
  const iconColor = isTransfer || isCardPayment ? 'var(--primary)' : '#ffffff';

  return (
    <MotionLink
      href={`/transacoes/show/${transaction.id}`}
      aria-label={`Abrir transação ${transaction.description || 'Sem descrição'}`}
      whileHover="hover"
      whileTap={{ scale: 0.985 }}
      variants={{ hover: { x: 4, transition: { type: 'spring', stiffness: 420, damping: 24 } } }}
      className="grid min-h-[66px] w-full grid-cols-[40px_minmax(0,1fr)_24px] items-center gap-2 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 text-left transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)] sm:grid-cols-[44px_minmax(0,1fr)_110px_88px_24px] sm:gap-3"
    >
      {/* O ícone da categoria pula. */}
      <motion.span
        className="grid h-10 w-10 place-items-center rounded-[var(--radius-md)]"
        style={{ backgroundColor: iconBackground, color: iconColor }}
        variants={{ hover: { y: [0, -7, 0], scale: [1, 1.12, 1], transition: { duration: 0.5 } } }}
      >
        {isTransfer ? <FaExchangeAlt aria-hidden="true" /> : isCardPayment ? <FaCreditCard aria-hidden="true" /> : <IconRenderer iconName={transaction.category?.icon || (isIncome ? 'income-up' : 'tag')} size={16} />}
      </motion.span>
      <span className="min-w-0">
        <strong className="block truncate text-sm text-[var(--foreground)]">{transaction.description || 'Sem descrição'}</strong>
        <span className="mt-1 block truncate text-xs text-[var(--text-muted)]">
          {isTransfer ? `Transferências • ${transaction.account?.name ?? 'Conta'}` : isCardPayment ? `Pagamento de fatura • ${transaction.account?.name ?? 'Conta'}` : `${transaction.kind === 'OPENING_BALANCE' ? 'Saldo inicial' : transaction.category?.name ?? 'Sem categoria'} • ${transaction.account?.name ?? 'Conta'}`}
          {isTransfer && <span className="sr-only"> · {getTransferCounterpartLabel(transaction)}</span>}
        </span>
        <TransactionTags transaction={transaction} />
      </span>
      <span className="col-span-2 col-start-2 row-start-2 flex min-w-0 items-center justify-between gap-3 text-right sm:col-span-1 sm:col-start-auto sm:row-start-auto sm:grid sm:shrink-0 sm:justify-items-end sm:gap-1">
        <strong className={`money text-sm ${amountTone}`}>{formatTransactionAmount(transaction, showValues)}</strong>
        <span className="text-xs text-[var(--text-muted)]">{formatTransactionTime(transaction)}</span>
      </span>
      <span className="col-start-2 row-start-3 justify-self-start sm:col-start-auto sm:row-start-auto sm:justify-self-center">
        {transaction.status !== 'COMPLETED' && <StatusPill status={transaction.status} />}
      </span>
      <FaChevronRight className="col-start-3 row-start-1 justify-self-center text-xs text-[var(--text-muted)] sm:col-start-auto sm:row-start-auto" aria-hidden="true" />
    </MotionLink>
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
  const reduce = useReducedMotion();
  const [activeBarIndex, setActiveBarIndex] = useState<number | null>(null);
  const activeBar = activeBarIndex === null ? null : bars[activeBarIndex];
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
    <article className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-4">
      <header className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold">Visão do mês</h2>
        <MotionLink href="/dashboard" whileHover="hover" className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--primary)]">
          Ver relatório
          <motion.span aria-hidden="true" className="inline-block" variants={{ hover: { x: 5 } }} transition={{ type: 'spring', stiffness: 400, damping: 14 }}>→</motion.span>
        </MotionLink>
      </header>

      <div className="mt-4 grid grid-cols-[minmax(0,1fr)_135px] items-end gap-4">
        <div className="grid gap-1.5">
          <p className="min-h-4 text-sm text-[var(--text-muted)]" aria-live="polite">
            {activeBar ? (
              <>
                Dias {activeBar.fromDay}–{activeBar.toDay}:{' '}
                <strong className="money text-[var(--foreground)]">
                  {activeBar.income === 0 && activeBar.expense === 0
                    ? 'sem movimento'
                    : `+${displayMoney(activeBar.income, showValues, summary.currency)} / −${displayMoney(activeBar.expense, showValues, summary.currency)}`}
                </strong>
              </>
            ) : (
              'Passe o cursor ou toque numa coluna.'
            )}
          </p>
          <motion.div
            role="group"
            aria-label="Saldo por trecho do mês"
            tabIndex={0}
            onKeyDown={(event) => {
              if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
                event.preventDefault();
                setActiveBarIndex((current) => Math.min(bars.length - 1, Math.max(0, (current ?? (event.key === 'ArrowRight' ? -1 : bars.length)) + (event.key === 'ArrowRight' ? 1 : -1))));
              } else if (event.key === 'Escape') setActiveBarIndex(null);
            }}
            onPointerLeave={(event) => event.pointerType === 'mouse' && setActiveBarIndex(null)}
            initial="hidden"
            whileInView="shown"
            viewport={CARD_VIEWPORT}
            className="grid h-[92px] grid-cols-8 items-end gap-1.5 border-b border-[var(--border)] px-1 pb-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]"
          >
            {bars.map((bar, index) => {
              const height = bar.value === 0 ? 10 : Math.max(18, Math.round((bar.value / maxBar) * 82));
              const tone =
                bar.tone === 'income'
                  ? 'bg-[var(--income)]'
                  : bar.tone === 'expense'
                    ? 'bg-[var(--expense)]'
                    : 'bg-[var(--surface-subtle)]';
              return (
                <motion.span
                  key={index}
                  className="flex h-full min-w-0 cursor-pointer items-end justify-center border-x border-[var(--border)]/25"
                  style={{ transformOrigin: 'bottom' }}
                  // Onda: a coluna sob o cursor sobe mais e as vizinhas sobem cada vez menos.
                  animate={{ scaleY: activeBarIndex === null ? 1 : 1 + 0.14 / (1 + Math.abs(activeBarIndex - index) ** 2) }}
                  transition={{ type: 'spring', stiffness: 380, damping: 18 }}
                  onPointerEnter={(event) => event.pointerType === 'mouse' && setActiveBarIndex(index)}
                  onPointerDown={() => setActiveBarIndex(index)}
                >
                  <motion.span
                    className={`w-[68%] rounded-t-sm transition-opacity ${tone} ${activeBarIndex !== null && activeBarIndex !== index ? 'opacity-45' : ''}`}
                    variants={{ hidden: { height: 0 }, shown: { height } }}
                    transition={reducedTransition(reduce, { type: 'spring', stiffness: 300, damping: 8, delay: index * 0.07 })}
                    role="img"
                    aria-label={`Dias ${bar.fromDay} a ${bar.toDay}`}
                  />
                </motion.span>
              );
            })}
          </motion.div>
        </div>

        <div className="space-y-3 pb-1">
          <motion.div className="flex items-start gap-2" whileHover="hover">
            <motion.span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-[var(--income)]" variants={{ hover: { scale: [1, 1.7, 1], transition: { duration: 0.5 } } }} />
            <div>
              <strong className="block text-base text-[var(--income)]"><span className="money">{displayMoney(summary.income, showValues, summary.currency)}</span></strong>
              <span className="text-xs text-[var(--text-muted)]">Entradas</span>
            </div>
          </motion.div>
          <motion.div className="flex items-start gap-2" whileHover="hover">
            <motion.span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full border-[3px] border-[var(--expense)]" variants={{ hover: { scale: [1, 1.7, 1], transition: { duration: 0.5 } } }} />
            <div>
              <strong className="block text-base text-[var(--expense)]"><span className="money">{displayMoney(summary.expense, showValues, summary.currency)}</span></strong>
              <span className="text-xs text-[var(--text-muted)]">Saídas</span>
            </div>
          </motion.div>
        </div>
      </div>

      <motion.div
        className="mt-4 flex items-center gap-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-raised)] p-3"
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={CARD_VIEWPORT}
        whileHover="hover"
        transition={reducedTransition(reduce, { type: 'spring', stiffness: 260, damping: 20, delay: 0.7 })}
      >
        <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full bg-[var(--primary-subtle)] text-[var(--primary)]">
          {/* O gráfico "sobe": sai por cima e reentra por baixo. */}
          <motion.span className="flex" variants={{ hover: { y: ['0%', '-140%', '140%', '0%'], opacity: [1, 0, 0, 1], transition: { duration: 0.6, times: [0, 0.4, 0.41, 1] } } }}>
            <FaChartLine aria-hidden="true" />
          </motion.span>
        </span>
        <div>
          <strong className="block text-sm">{insightTitle}</strong>
          <p className="mt-0.5 text-xs text-[var(--text-muted)]"><MoneyText>{insightText}</MoneyText></p>
        </div>
      </motion.div>
    </article>
  );
}

export function UpcomingTransactions({
  items,
  showValues,
  onViewAll,
}: {
  items: TransactionDTO[];
  showValues: boolean;
  onViewAll: () => void;
}) {
  const reduce = useReducedMotion();

  return (
    <article className="flex h-full flex-col rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-4">
      <header className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold">Próximos lançamentos</h2>
        <MotionLink href="/calendario" whileHover="hover" className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--primary)]">
          Ver calendário
          <motion.span aria-hidden="true" className="inline-block" variants={{ hover: { x: 5 } }} transition={{ type: 'spring', stiffness: 400, damping: 14 }}>→</motion.span>
        </MotionLink>
      </header>

      <div className="mt-3 flex-1 divide-y divide-[var(--border)]">
        {items.length === 0 ? (
          <div className="grid h-full min-h-[210px] place-items-center rounded-[var(--radius-md)] border border-dashed border-[var(--border)] px-4 text-center">
            <div>
              <FaCalendarAlt className="mx-auto text-xl text-[var(--primary)]" aria-hidden="true" />
              <p className="mt-2 text-sm font-bold">Nenhum lançamento agendado</p>
              <p className="mt-1 text-xs text-[var(--text-muted)]">Seus próximos compromissos aparecerão aqui.</p>
            </div>
          </div>
        ) : (
          items.slice(0, 4).map((transaction, index) => (
            <MotionLink
              key={transaction.id}
              href={`/transacoes/show/${transaction.id}`}
              aria-label={`Abrir transação ${transaction.description || 'Sem descrição'}`}
              whileHover="hover"
              whileTap={{ scale: 0.985 }}
              className="grid min-h-[62px] w-full grid-cols-[44px_minmax(0,1fr)] items-center gap-2 px-1 py-2 text-left transition-colors hover:bg-[var(--surface-hover)] sm:grid-cols-[44px_36px_minmax(0,1fr)_auto] sm:px-0"
            >
              {/* A data balança de leve, como um carimbo assentando. */}
              <motion.span className="flex" variants={{ hover: { rotate: [0, -9, 8, -4, 0], transition: { duration: 0.55 } } }}>
              <motion.span
                className="grid h-11 w-11 place-content-center rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-raised)] text-center"
                initial={{ scale: 1.8, rotate: -14, opacity: 0 }}
                whileInView={{ scale: 1, rotate: 0, opacity: 1 }}
                viewport={CARD_VIEWPORT}
                transition={reducedTransition(reduce, { type: 'spring', stiffness: 420, damping: 13, delay: index * 0.12 })}
              >
                <strong className="text-sm leading-none">{String(transaction.day).padStart(2, '0')}</strong>
                <span className="mt-1 text-xs font-semibold uppercase text-[var(--text-muted)]">{compactMonth(transaction.month, transaction.year)}</span>
              </motion.span>
              </motion.span>
              <span
                className="hidden h-9 w-9 place-items-center rounded-full text-white sm:grid"
                style={{ backgroundColor: transaction.category?.color || 'var(--primary)' }}
              >
                <IconRenderer iconName={transaction.category?.icon || 'calendar'} size={14} />
              </span>
              <span className="min-w-0">
                <strong className="block truncate text-xs">{transaction.description || 'Sem descrição'}</strong>
                <span className="mt-1 block truncate text-xs text-[var(--text-muted)]">
                  {transaction.kind === 'OPENING_BALANCE' ? 'Saldo inicial' : transaction.category?.name ?? 'Sem categoria'} • {transaction.account?.name ?? 'Conta'}
                </span>
              </span>
              <span className="col-start-2 flex min-w-0 items-center justify-between gap-2 sm:col-start-auto sm:grid sm:shrink-0 sm:justify-items-end sm:gap-1">
                <motion.strong
                  className={`text-xs ${transaction.type === 'INCOME' ? 'text-[var(--income)]' : 'text-[var(--expense)]'}`}
                  style={{ transformOrigin: 'right center' }}
                  variants={{ hover: { scale: 1.12, transition: { type: 'spring', stiffness: 420, damping: 14 } } }}
                >
                  {formatTransactionAmount(transaction, showValues)}
                </motion.strong>
                <span className="flex items-center gap-2">
                  <span className="text-xs text-[var(--text-muted)]">{scheduledDistanceLabel(transaction)}</span>
                  <span className="rounded-full bg-[var(--primary-subtle)] px-2 py-1 text-xs font-bold text-[var(--primary)]">Agendada</span>
                </span>
              </span>
            </MotionLink>
          ))
        )}
      </div>

      {items.length > 0 && (
        <motion.button
          type="button"
          onClick={onViewAll}
          whileHover="hover"
          whileTap={{ scale: 0.98 }}
          className="mt-3 flex min-h-11 sm:min-h-9 w-full items-center justify-center gap-2 overflow-hidden rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-raised)] px-3 text-xs font-semibold hover:bg-[var(--surface-hover)]"
        >
          Ver todos os agendados ({items.length})
          {/* A seta atravessa o botão: sai pela direita e reentra pela esquerda. */}
          <motion.span className="flex" variants={{ hover: { x: [0, 26, -26, 0], opacity: [1, 0, 0, 1], transition: { duration: 0.6, times: [0, 0.4, 0.41, 1] } } }}>
            <FaArrowRight aria-hidden="true" />
          </motion.span>
        </motion.button>
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
