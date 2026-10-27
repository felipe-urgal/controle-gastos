'use client';

import { motion, useReducedMotion } from 'framer-motion';
import Link from 'next/link';
import { useState } from 'react';
import { FaArrowDown, FaArrowUp, FaFlag } from 'react-icons/fa';

import { conveyorRow, riseInView } from '@/app/components/pages/financial-commitments/commitments-motion';
import {
  buildLede,
  dayMonth,
  filterItems,
  forecastBalance,
  formatDate,
  groupByDay,
  overdueLabel,
  signedAmount,
  splitCommitments,
  weekBuckets,
  type CommitmentFilter,
} from '@/app/components/pages/financial-commitments/financial-commitments-model';
import { Chip, MoneyText } from '@/app/components/ui';
import { CARD_EASE, CountUp, reducedTransition } from '@/app/components/ui/motion';
import { formatCurrency } from '@/app/lib/currency/format-currency';
import type {
  FinancialCommitment,
  FinancialCommitmentDirection,
  FinancialCommitmentsData,
  FinancialCommitmentType,
} from '@/app/types/financial-commitment';

const MotionLink = motion.create(Link);

const cardClassName = 'rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)]';

const TYPE_LABEL: Record<FinancialCommitmentType, string> = {
  PENDING: 'Pendente',
  RECURRING: 'Recorrência',
  INSTALLMENT: 'Parcela',
  CARD_STATEMENT: 'Fatura',
  DEBT_INSTALLMENT: 'Dívida',
  GOAL_DEADLINE: 'Meta',
};

const FILTERS: Array<{ key: CommitmentFilter; label: string }> = [
  { key: 'all', label: 'Todos' },
  { key: 'PAYABLE', label: 'A pagar' },
  { key: 'RECEIVABLE', label: 'A receber' },
  { key: 'MILESTONE', label: 'Marcos' },
];

const ICON_TONE: Record<FinancialCommitmentDirection, string> = {
  PAYABLE: 'bg-[var(--danger-subtle)] text-[var(--expense)]',
  RECEIVABLE: 'bg-[color-mix(in_srgb,var(--income)_12%,transparent)] text-[var(--income)]',
  MILESTONE: 'bg-[var(--primary-subtle)] text-[var(--primary)]',
};

export default function FinancialCommitmentsView({
  data,
  showValues,
}: {
  data: FinancialCommitmentsData;
  showValues: boolean;
}) {
  const reduce = useReducedMotion();
  const [filter, setFilter] = useState<CommitmentFilter>('all');
  const money = (cents: number) => (showValues ? formatCurrency(cents, data.currency) : '••••');
  const { payable, receivable, milestoneCount, overdueCount } = data.totals;
  const { overdue, upcoming } = splitCommitments(data.items);
  const days = groupByDay(filterItems(upcoming, filter), data.asOf);
  const weeks = weekBuckets(data.items, data.asOf);
  const balance = forecastBalance(data.totals);
  const hasAnything = data.items.length > 0 || payable.count > 0 || receivable.count > 0 || milestoneCount > 0;

  return (
    <div className="space-y-4">
      <motion.section
        aria-labelledby="commitments-hero-label"
        // O resumo desce do alto da tela e assenta com um quique, como um lembrete caindo na mesa.
        initial={reduce ? false : { opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={reducedTransition(reduce, { type: 'spring', stiffness: 200, damping: 13, delay: 0.1 })}
        className="grid gap-4 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-surface)] sm:p-6"
      >
        <div className="grid gap-1.5">
          <p id="commitments-hero-label" className="text-sm font-semibold text-[var(--text-muted)]">A pagar até {formatDate(data.through)} · {payable.count} compromisso{payable.count === 1 ? '' : 's'}</p>
          <strong className="money break-words text-3xl font-semibold leading-none tracking-[-0.035em] text-[var(--expense)] sm:text-5xl">
            <CountUp amount={payable.amount} format={money} />
          </strong>
          <p className="mt-2 max-w-[62ch] text-sm text-[var(--text-muted)]">
            <MoneyText>{buildLede(data, money)}</MoneyText>
          </p>
        </div>

        {hasAnything && (
          <div className={`grid grid-cols-2 gap-2 sm:gap-3 ${milestoneCount > 0 ? 'sm:grid-cols-3' : ''}`}>
            <Legend index={0} dot="var(--income)" label="A receber" value={money(receivable.amount)} detail={`${receivable.count} entrada${receivable.count === 1 ? '' : 's'}`} color="var(--income)" />
            <Legend
              index={1}
              dot={balance < 0 ? 'var(--expense)' : 'var(--income)'}
              label="Saldo previsto"
              value={`${balance > 0 ? '+ ' : balance < 0 ? '− ' : ''}${money(Math.abs(balance))}`}
              detail="a receber − a pagar"
              color={balance === 0 ? 'var(--foreground)' : balance < 0 ? 'var(--expense)' : 'var(--income)'}
            />
            {milestoneCount > 0 && (
              <Legend index={2} dot="var(--primary)" label="Marcos" value={String(milestoneCount)} detail="sem valor monetário" color="var(--foreground)" />
            )}
          </div>
        )}
      </motion.section>

      {overdue.length > 0 && (
        <motion.section
          // Vencidos entram de lado e dão uma tremida: é o que pede ação primeiro.
          initial={reduce ? false : { opacity: 0, x: -60 }}
          animate={{ opacity: 1, x: reduce ? 0 : [-60, 0, -8, 6, -3, 0] }}
          transition={{ duration: 0.8, ease: 'easeOut', delay: 0.5 }}
          className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--expense)]/30 bg-[var(--danger-subtle)]"
          aria-labelledby="commitments-overdue-heading"
        >
          <div className="flex flex-wrap items-baseline justify-between gap-2 px-4 pb-1.5 pt-3.5 text-[var(--expense)] sm:px-5">
            <h2 id="commitments-overdue-heading" className="text-base font-bold">Vencidos · resolva primeiro</h2>
            <p className="text-xs font-semibold">{overdueCount} {overdueCount === 1 ? 'item ainda pendente' : 'itens ainda pendentes'}</p>
          </div>
          <ul>
            {overdue.map((item, index) => (
              <li key={item.id}>
                <CommitmentRow index={index} item={item} money={money} lateLabel={overdueLabel(item.date, data.asOf)} />
              </li>
            ))}
          </ul>
        </motion.section>
      )}

      {hasAnything ? (
        <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
          <motion.section {...riseInView(reduce, 0.05)} className={`${cardClassName} min-w-0 overflow-hidden`} aria-labelledby="commitments-timeline-heading">
            <div className="flex flex-wrap items-center justify-between gap-2 px-4 pb-2 pt-4 sm:px-5">
              <h2 id="commitments-timeline-heading" className="text-base font-bold">Linha do tempo</h2>
              <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar por tipo">
                {FILTERS.map((option) => (
                  <Chip key={option.key} layoutId="commitments-filter" selected={filter === option.key} onClick={() => setFilter(option.key)}>
                    {option.label}
                  </Chip>
                ))}
              </div>
            </div>
            {/* A chave é o filtro: trocar o tipo refaz a fila, com os itens chegando de novo pela direita. */}
            <div key={filter}>
              {days.length === 0 ? (
                <motion.p
                  initial={reduce ? false : { opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, ease: CARD_EASE }}
                  className="border-t border-[var(--border)] px-4 py-6 text-sm text-[var(--text-muted)] sm:px-5"
                >
                  Nenhum compromisso deste tipo no horizonte selecionado.
                </motion.p>
              ) : (
                (() => {
                  let rowIndex = 0;
                  return days.map((day) => (
                    <div key={day.key} className="border-t border-[var(--border)]">
                      <div className="flex flex-wrap items-baseline justify-between gap-x-3 bg-[var(--surface-raised)] px-4 pb-1 pt-3 sm:px-5">
                        <h3 className="text-sm font-bold">{day.label}</h3>
                        {day.net !== null && (
                          <motion.span
                            className="money text-xs text-[var(--text-muted)]"
                            initial={reduce ? false : { opacity: 0, scale: 0.6 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={{ once: true }}
                            transition={{ type: 'spring', stiffness: 500, damping: 14, delay: 0.2 }}
                          >
                            {day.net > 0 ? '+ ' : day.net < 0 ? '− ' : ''}{money(Math.abs(day.net))}
                          </motion.span>
                        )}
                      </div>
                      <ul>
                        {day.items.map((item) => (
                          <li key={item.id} className="border-t border-[var(--border)] first:border-t-0">
                            <CommitmentRow index={rowIndex++} item={item} money={money} />
                          </li>
                        ))}
                      </ul>
                    </div>
                  ));
                })()
              )}
            </div>
          </motion.section>

          <motion.section {...riseInView(reduce, 0.15)} className={`${cardClassName} lg:sticky lg:top-[calc(var(--app-sidebar-header-height)+1rem)]`} aria-labelledby="commitments-weeks-heading">
            <div className="flex flex-wrap items-baseline justify-between gap-2 px-4 pb-2 pt-4 sm:px-5">
              <h2 id="commitments-weeks-heading" className="text-base font-bold">Quando pesa mais</h2>
              <p className="text-xs text-[var(--text-muted)]">por semana</p>
            </div>
            {weeks.length === 0 ? (
              <p className="px-4 pb-5 text-sm text-[var(--text-muted)] sm:px-5">Sem valores a pagar ou a receber no horizonte.</p>
            ) : (
              <ul className="grid gap-3.5 px-4 pb-5 sm:px-5">
                {weeks.map((week, index) => (
                  <motion.li key={week.key} className="grid gap-1.5" whileHover="hover" whileTap="hover">
                    <div className="flex flex-wrap justify-between gap-x-2 text-sm">
                      <span className="font-semibold">{week.label}</span>
                      <span className="money text-[var(--text-muted)]">
                        {week.payable > 0 ? `− ${money(week.payable)}` : ''}
                        {week.payable > 0 && week.receivable > 0 ? ' · ' : ''}
                        {week.receivable > 0 ? `+ ${money(week.receivable)}` : ''}
                      </span>
                    </div>
                    <div className="grid gap-[3px]" aria-hidden="true">
                      {/* As barras crescem semana a semana, a de pagar antes da de receber; no hover (ou toque) engordam. */}
                      {week.payable > 0 && (
                        <motion.span
                          className="block h-2 origin-left rounded-full bg-[var(--expense)]"
                          initial={reduce ? false : { width: 0 }}
                          whileInView={{ width: week.payableWidth + '%' }}
                          viewport={{ once: true }}
                          variants={{ hover: { scaleY: 1.6, transition: { type: 'spring', stiffness: 400, damping: 18 } } }}
                          transition={reducedTransition(reduce, { duration: 0.9, ease: CARD_EASE, delay: 0.3 + index * 0.1 })}
                        />
                      )}
                      {week.receivable > 0 && (
                        <motion.span
                          className="block h-2 origin-left rounded-full bg-[var(--income)]"
                          initial={reduce ? false : { width: 0 }}
                          whileInView={{ width: week.receivableWidth + '%' }}
                          viewport={{ once: true }}
                          variants={{ hover: { scaleY: 1.6, transition: { type: 'spring', stiffness: 400, damping: 18 } } }}
                          transition={reducedTransition(reduce, { duration: 0.9, ease: CARD_EASE, delay: 0.45 + index * 0.1 })}
                        />
                      )}
                    </div>
                  </motion.li>
                ))}
              </ul>
            )}
            <p className="border-t border-[var(--border)] px-4 py-3 text-xs text-[var(--text-muted)] sm:px-5">
              Só a moeda escolhida; moedas diferentes não são somadas. Sem valor definido aparece “—”.
            </p>
          </motion.section>
        </div>
      ) : (
        <motion.section {...riseInView(reduce)} className={`${cardClassName} grid justify-items-center gap-2.5 px-4 py-10 text-center`}>
          {/* Sem nada a pagar: o ícone flutua devagar, como quem respira aliviado. */}
          <motion.span
            aria-hidden="true"
            className="text-3xl"
            animate={reduce ? undefined : { y: [0, -8, 0] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
          >
            🎉
          </motion.span>
          <h2 className="text-lg font-bold">Nenhum compromisso nos próximos {data.days} dias</h2>
          <p className="max-w-[48ch] text-sm text-[var(--text-muted)]">Que tal olhar mais adiante? Ou registre uma conta a pagar para ela aparecer aqui.</p>
          <MotionLink
            href="/transacoes/nova"
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.95 }}
            className="inline-flex min-h-11 items-center rounded-[var(--radius-md)] border border-[var(--border-strong)] px-4 text-sm font-bold hover:bg-[var(--surface-hover)]"
          >
            Nova transação
          </MotionLink>
        </motion.section>
      )}
    </div>
  );
}

function CommitmentRow({ index, item, money, lateLabel }: { index: number; item: FinancialCommitment; money: (cents: number) => string; lateLabel?: string }) {
  const reduce = useReducedMotion();
  const signed = signedAmount(item);
  const Icon = item.direction === 'PAYABLE' ? FaArrowUp : item.direction === 'RECEIVABLE' ? FaArrowDown : FaFlag;
  return (
    <MotionLink
      href={item.href}
      {...conveyorRow(index, reduce)}
      whileHover="hover"
      whileTap={{ scale: 0.98, transition: { type: 'spring', stiffness: 500, damping: 20 } }}
      className="grid min-h-16 grid-cols-[36px_minmax(0,1fr)_auto] items-center gap-3 px-4 py-2.5 hover:bg-[var(--surface-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--focus)] sm:px-5"
    >
      {/* No hover (ou toque): a seta se move no sentido do dinheiro (pagar sobe, receber desce) e a bandeira balança. */}
      <motion.span
        className={`grid h-9 w-9 place-items-center overflow-hidden rounded-[var(--radius-md)] text-sm ${ICON_TONE[item.direction]}`}
        aria-hidden="true"
        variants={{
          hover:
            item.direction === 'MILESTONE'
              ? { rotate: [0, -14, 12, 0], transition: { duration: 0.5 } }
              : { y: item.direction === 'PAYABLE' ? [0, -6, 0] : [0, 6, 0], scale: [1, 1.15, 1], transition: { duration: 0.5 } },
        }}
      >
        <Icon />
      </motion.span>
      <motion.span className="min-w-0" variants={{ hover: { x: 4, transition: { type: 'spring', stiffness: 400, damping: 22 } } }}>
        <strong className="block break-words text-sm">{item.title}</strong>
        <small className="block text-xs text-[var(--text-muted)]">
          {TYPE_LABEL[item.type]}
          {item.accountName ? ` · ${item.accountName}` : ''}
          {lateLabel ? ` · venceu ${dayMonth(item.date)}` : ''}
        </small>
      </motion.span>
      <span className="grid justify-items-end gap-1">
        <motion.strong
          className={`money origin-right text-sm font-semibold ${signed === null ? 'text-[var(--text-muted)]' : signed < 0 ? 'text-[var(--expense)]' : 'text-[var(--income)]'}`}
          variants={{ hover: { scale: 1.1, transition: { type: 'spring', stiffness: 400, damping: 16 } } }}
        >
          {signed === null ? '—' : `${signed < 0 ? '− ' : '+ '}${money(Math.abs(signed))}`}
        </motion.strong>
        {lateLabel && (
          <motion.span
            className="rounded-full bg-[var(--surface)] px-2 py-0.5 text-xs font-bold text-[var(--expense)]"
            animate={reduce ? undefined : { scale: [1, 1.08, 1] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
          >
            {lateLabel}
          </motion.span>
        )}
      </span>
    </MotionLink>
  );
}

function Legend({ index, dot, label, value, detail, color }: { index: number; dot: string; label: string; value: string; detail: string; color: string }) {
  const reduce = useReducedMotion();

  return (
    // As caixas "viram" como cartas (rotateY) ao entrar; no hover (ou toque) a bolinha pulsa e o valor cresce.
    <motion.div
      className="grid min-w-0 content-start gap-0.5 rounded-[var(--radius-md)] bg-[var(--surface-raised)] px-3 py-3 sm:px-4 sm:py-3.5"
      style={{ transformPerspective: 600 }}
      initial={reduce ? false : { opacity: 0, rotateY: -80, scale: 0.9 }}
      animate={{ opacity: 1, rotateY: 0, scale: 1, transition: reducedTransition(reduce, { type: 'spring', stiffness: 220, damping: 16, delay: 0.5 + index * 0.1 }) }}
      whileHover="hover"
      whileTap="hover"
    >
      <span className="truncate text-xs font-semibold text-[var(--text-muted)] sm:text-sm">
        <motion.span
          className="mr-1.5 inline-block h-2 w-2 rounded-full"
          style={{ backgroundColor: dot }}
          aria-hidden="true"
          variants={{ hover: { scale: [1, 2, 1], transition: { duration: 0.5 } } }}
        />
        {label}
      </span>
      <motion.span
        className="money origin-left truncate text-base font-semibold sm:text-xl"
        style={{ color }}
        variants={{ hover: { scale: 1.07, transition: { type: 'spring', stiffness: 400, damping: 16 } } }}
      >
        {value}
      </motion.span>
      <span className="text-xs text-[var(--text-muted)]">{detail}</span>
    </motion.div>
  );
}
