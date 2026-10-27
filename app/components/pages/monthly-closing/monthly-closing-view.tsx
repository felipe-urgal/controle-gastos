'use client';

import { motion, useReducedMotion } from 'framer-motion';
import Link from 'next/link';
import type { ReactNode } from 'react';

import {
  budgetUsage,
  buildTodoItems,
  describeDelta,
  formatLogicalDate,
  monthName,
  shiftPeriod,
  spentShare,
  summaryLede,
  type ClosingTone,
} from '@/app/components/pages/monthly-closing/monthly-closing-model';
import { riseInView, tickIn, unroll } from '@/app/components/pages/monthly-closing/closing-motion';
import { IconRenderer, MoneyText } from '@/app/components/ui';
import { CARD_EASE, CountUp, reducedTransition } from '@/app/components/ui/motion';
import { formatCurrency } from '@/app/lib/currency/format-currency';
import type { SupportedCurrency } from '@/app/types/financial-summary';
import type { MonthlyClosingData, MonthlyClosingRetrospective } from '@/app/types/monthly-closing';

type Retrospective = MonthlyClosingRetrospective;

const MotionLink = motion.create(Link);

const cardClassName = 'rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)]';
const linkClassName =
  'inline-flex min-h-11 items-center text-sm font-semibold text-[var(--primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]';

const TONE_CLASS: Record<ClosingTone, string> = {
  good: 'text-[var(--income)]',
  bad: 'text-[var(--expense)]',
  flat: 'text-[var(--text-muted)]',
};

const PERIOD_STATUS_LABELS = {
  IN_PROGRESS: 'Mês em andamento',
  REVIEWABLE: 'Pronto para revisão',
  FUTURE: 'Período futuro',
} as const;

const CARD_STATE_LABELS = { PAID: 'Paga', OPEN: 'Em aberto', OVERDUE: 'Vencida' } as const;

export default function MonthlyClosingView({
  data,
  retrospective,
  currency,
  showValues,
  transactionsHref,
}: {
  data: MonthlyClosingData;
  retrospective: Retrospective;
  currency: SupportedCurrency;
  showValues: boolean;
  transactionsHref: string;
}) {
  const reduce = useReducedMotion();
  const money = (cents: number) => (showValues ? formatCurrency(cents, currency) : '••••');
  const signed = (cents: number) => `${cents > 0 ? '+ ' : cents < 0 ? '− ' : ''}${money(Math.abs(cents))}`;
  const previous = shiftPeriod(data.period.year, data.period.month, -1);
  const previousMonth = monthName(previous.month);
  const { summary, comparison, planning, netWorth, readiness } = retrospective;
  const isEmpty = summary.income === 0 && summary.expense === 0;
  const todo = buildTodoItems({ readiness, money, pendingHref: transactionsHref + '&status=PENDING' });
  const detailStatements = readiness.cardStatements.items;
  const spent = spentShare(summary);
  const budget = budgetUsage(planning);
  const reviewable = data.status === 'REVIEWABLE';
  const balanceColor =
    summary.balance > 0 ? 'var(--income)' : summary.balance < 0 ? 'var(--expense)' : 'var(--foreground)';
  const toReview = todo.filter((item) => !item.ok).length;
  // Sem mês anterior comparável não há o que comparar: a linha some em vez de repetir "sem base".
  const deltaOf = (metric: typeof comparison.income, lowerIsBetter = false) =>
    metric.percentage === null ? null : describeDelta(metric, previousMonth, lowerIsBetter);

  return (
    <div className="space-y-4">
      <motion.section {...unroll(reduce)} aria-labelledby="closing-result-label" className="grid gap-6 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-surface)] sm:p-6">
        <div className="grid gap-1.5">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <p id="closing-result-label" className="text-sm font-semibold text-[var(--text-muted)]">Resultado do mês</p>
            {/* O selo do status "carimba" depois que a folha abre. */}
            <motion.span
              className="rounded-full bg-[var(--primary-subtle)] px-2.5 py-0.5 text-xs font-bold text-[var(--primary)]"
              initial={reduce ? false : { scale: 2.2, rotate: -14, opacity: 0 }}
              animate={{ scale: 1, rotate: 0, opacity: 1 }}
              transition={reducedTransition(reduce, { type: 'spring', stiffness: 500, damping: 14, delay: 0.7 })}
            >
              {PERIOD_STATUS_LABELS[data.status]}
            </motion.span>
          </div>
          <strong className="money break-words text-3xl font-semibold leading-none tracking-[-0.035em] sm:text-5xl" style={{ color: balanceColor }}>
            {/* O resultado sobe de zero até o valor do mês. */}
            <CountUp amount={summary.balance} format={signed} />
          </strong>
          <p className="mt-2 max-w-[62ch] text-sm text-[var(--text-muted)]">
            <MoneyText>{summaryLede({ summary, comparison, previousMonth, money })}</MoneyText>
          </p>
        </div>

        {!isEmpty && (
          <div className="grid gap-4">
            <div
              className="flex h-3 overflow-hidden rounded-full bg-[var(--surface-subtle)]"
              role="img"
              aria-label={`${spent}% da receita foi gasto`}
            >
              {/* A barra se enche em duas etapas: primeiro o que saiu, depois o que sobrou. */}
              <motion.span
                className="h-full bg-[var(--expense)]"
                initial={reduce ? false : { width: 0 }}
                animate={{ width: spent + '%' }}
                transition={reducedTransition(reduce, { duration: 0.8, ease: CARD_EASE, delay: 0.6 })}
              />
              <motion.span
                className="h-full bg-[var(--income)]"
                initial={reduce ? false : { width: 0 }}
                animate={{ width: 100 - spent + '%' }}
                transition={reducedTransition(reduce, { duration: 0.8, ease: CARD_EASE, delay: 0.9 })}
              />
            </div>
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              <FlowItem index={0} label="Receitas" color="var(--income)" amount={money(summary.income)} delta={deltaOf(comparison.income)} />
              <FlowItem index={1} label="Despesas" color="var(--expense)" amount={money(summary.expense)} delta={deltaOf(comparison.expense, true)} />
              <FlowItem index={2} label="Sobrou" color={balanceColor} amount={money(summary.balance)} delta={deltaOf(comparison.balance)} />
            </div>
          </div>
        )}
      </motion.section>

      {/* As duas colunas esticam até a mesma altura e o último cartão de cada uma cresce, então terminam alinhadas. */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-4">
          <motion.section {...riseInView(reduce, 0.05)} className={`${cardClassName} ${isEmpty ? 'flex-1' : ''}`} aria-labelledby="closing-todo-heading">
            <div className="flex flex-wrap items-baseline justify-between gap-2 px-4 pb-1 pt-4 sm:px-5">
              <h2 id="closing-todo-heading" className="flex items-center gap-2 text-base font-bold">
                Para fechar o mês
                <motion.span
                  key={toReview}
                  className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${toReview === 0 ? 'bg-[var(--primary-subtle)] text-[var(--income)]' : 'bg-[var(--warning-subtle)] text-[var(--warning)]'}`}
                  initial={reduce ? false : { scale: 0.4, opacity: 0 }}
                  whileInView={{ scale: 1, opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ type: 'spring', stiffness: 500, damping: 14, delay: 0.3 }}
                >
                  {toReview === 0 ? 'Tudo conferido' : toReview === 1 ? '1 item' : toReview + ' itens'}
                </motion.span>
              </h2>
              <p className="text-xs text-[var(--text-muted)]">Só informa: nada bloqueia alterações.</p>
            </div>
            <ul className="mt-2">
              {todo.map((item, index) => (
                <motion.li
                  key={item.key}
                  {...tickIn(index, reduce)}
                  whileHover="hover"
                  whileTap="hover"
                  className="grid grid-cols-[32px_minmax(0,1fr)] items-center gap-3 border-t border-[var(--border)] px-4 py-3 sm:grid-cols-[32px_minmax(0,1fr)_auto] sm:px-5"
                >
                  {/* Conferido: o "visto" é desenhado traço a traço. Pendente: um anel pulsa chamando a atenção. */}
                  <motion.span
                    className={`relative grid h-8 w-8 place-items-center rounded-full text-sm font-extrabold ${item.ok ? 'bg-[var(--primary-subtle)] text-[var(--income)]' : 'bg-[var(--warning-subtle)] text-[var(--warning)]'}`}
                    aria-hidden="true"
                    variants={{ hover: { scale: 1.15, rotate: item.ok ? 0 : [0, -12, 10, 0], transition: { duration: 0.45 } } }}
                  >
                    {item.ok ? (
                      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
                        <motion.path
                          d="M5 12.5l4.5 4.5L19 7.5"
                          initial={reduce ? false : { pathLength: 0 }}
                          whileInView={{ pathLength: 1 }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.5, ease: 'easeOut', delay: 0.3 + index * 0.12 }}
                        />
                      </svg>
                    ) : (
                      <>
                        {!reduce && (
                          <motion.span
                            className="absolute inset-0 rounded-full border-2 border-[var(--warning)]"
                            animate={{ scale: [1, 1.6], opacity: [0.6, 0] }}
                            transition={{ duration: 1.4, repeat: Infinity, ease: 'easeOut' }}
                          />
                        )}
                        !
                      </>
                    )}
                  </motion.span>
                  <motion.span className="min-w-0" variants={{ hover: { x: 4, transition: { type: 'spring', stiffness: 400, damping: 22 } } }}>
                    <strong className="block text-sm">{item.title}</strong>
                    <span className="block text-sm text-[var(--text-muted)]">
                      <MoneyText>{item.detail}</MoneyText>
                    </span>
                  </motion.span>
                  {!item.ok && (
                    <MotionLink
                      href={item.href}
                      whileHover={{ y: -2 }}
                      whileTap={{ scale: 0.95 }}
                      className="col-start-2 inline-flex min-h-11 items-center justify-center justify-self-start whitespace-nowrap rounded-[var(--radius-md)] border border-[var(--border-strong)] px-4 text-sm font-bold hover:bg-[var(--surface-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)] sm:col-start-3"
                    >
                      {item.actionLabel}
                    </MotionLink>
                  )}
                </motion.li>
              ))}
            </ul>
            {detailStatements.length > 0 && (
              <details className="border-t border-[var(--border)]">
                <summary className="flex min-h-11 cursor-pointer list-none items-center px-4 text-sm text-[var(--text-muted)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--focus)] sm:px-5 [&::-webkit-details-marker]:hidden">
                  Ver faturas em detalhe
                </summary>
                <div className="grid gap-2 px-4 pb-4 sm:px-5">
                  {detailStatements.map((statement) => (
                    <Link key={statement.cardId + '-' + statement.closingDate.month + '-' + statement.closingDate.year} href={statement.href} className="flex min-h-11 items-center justify-between gap-3 rounded-[var(--radius-md)] border border-[var(--border)] px-3 py-2 hover:bg-[var(--surface-hover)]">
                      <span className="min-w-0">
                        <span className="block break-words text-sm font-semibold">{statement.cardName}</span>
                        <span className="block text-xs text-[var(--text-muted)]">Vence {formatLogicalDate(statement.dueDate)} · {CARD_STATE_LABELS[statement.state]}</span>
                      </span>
                      <span className="money shrink-0 text-sm font-semibold">{money(statement.amount)}</span>
                    </Link>
                  ))}
                </div>
              </details>
            )}
          </motion.section>

          {!isEmpty && (
            <motion.section {...riseInView(reduce, 0.1)} className={`${cardClassName} flex-1`} aria-labelledby="closing-categories-heading">
              <div className="flex flex-wrap items-baseline justify-between gap-2 px-4 pb-1 pt-4 sm:px-5">
                <h2 id="closing-categories-heading" className="text-base font-bold">Para onde foi o dinheiro</h2>
                <Link href={transactionsHref} className={linkClassName}>Ver transações</Link>
              </div>
              {retrospective.topCategories.length === 0 ? (
                <p className="px-4 pb-5 pt-2 text-sm text-[var(--text-muted)] sm:px-5">Nenhuma despesa realizada no período.</p>
              ) : (
                <ul className="grid gap-0.5 px-2 pb-3 pt-1 sm:px-3">
                  {retrospective.topCategories.map((category, index) => (
                    <motion.li key={category.id} {...tickIn(index, reduce)}>
                      <MotionLink
                        href={transactionsHref + '&categoryId=' + encodeURIComponent(category.id)}
                        whileHover="hover"
                        whileTap={{ scale: 0.98 }}
                        className="grid min-h-14 grid-cols-[36px_minmax(0,1fr)_auto] items-center gap-3 rounded-[var(--radius-md)] px-2 py-2 hover:bg-[var(--surface-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--focus)]"
                      >
                        <motion.span
                          className="grid h-9 w-9 place-items-center rounded-[var(--radius-md)]"
                          style={{ backgroundColor: category.color }}
                          aria-hidden="true"
                          variants={{ hover: { rotate: [0, -10, 8, 0], scale: 1.12, transition: { duration: 0.5 } } }}
                        >
                          <IconRenderer iconName={category.icon || 'tag'} size={16} className="text-white" />
                        </motion.span>
                        <span className="min-w-0">
                          <span className="flex justify-between gap-2 text-sm font-semibold">
                            <span className="min-w-0 break-words">{category.name}</span>
                            <span className="shrink-0 text-xs font-medium text-[var(--text-muted)]">{category.sharePercentage}%</span>
                          </span>
                          <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-[var(--surface-subtle)]">
                            <motion.span
                              className="block h-full rounded-full"
                              style={{ backgroundColor: category.color }}
                              initial={reduce ? false : { width: 0 }}
                              whileInView={{ width: Math.min(100, category.sharePercentage) + '%' }}
                              viewport={{ once: true }}
                              transition={reducedTransition(reduce, { duration: 0.9, ease: CARD_EASE, delay: 0.3 + index * 0.1 })}
                            />
                          </span>
                        </span>
                        <motion.span className="money origin-right text-sm font-semibold" variants={{ hover: { scale: 1.1, transition: { type: 'spring', stiffness: 400, damping: 16 } } }}>
                          {money(category.realized)}
                        </motion.span>
                      </MotionLink>
                    </motion.li>
                  ))}
                </ul>
              )}
            </motion.section>
          )}
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          {!budget && (
            <motion.section {...riseInView(reduce, 0.05)} className={cardClassName} aria-labelledby="closing-budget-heading">
              <div className="grid gap-1 px-4 py-4 sm:px-5">
                <h2 id="closing-budget-heading" className="text-base font-bold">Orçamento</h2>
                <p className="text-sm text-[var(--text-muted)]">Defina limites por categoria para ver aqui quanto do planejado você usou.</p>
                <MotionLink href="/categorias" whileHover="hover" className={linkClassName}>
                  Definir orçamento
                  <motion.span className="ml-1 inline-block" aria-hidden="true" variants={{ hover: { x: 5 } }} transition={{ type: 'spring', stiffness: 400, damping: 14 }}>→</motion.span>
                </MotionLink>
              </div>
            </motion.section>
          )}
          {budget && (
            <motion.section {...riseInView(reduce, 0.05)} className={cardClassName} aria-labelledby="closing-budget-heading">
              <div className="px-4 pb-2 pt-4 sm:px-5">
                <h2 id="closing-budget-heading" className="text-base font-bold">Orçamento</h2>
                <p className="text-xs text-[var(--text-muted)]">Gasto contra o que você planejou</p>
              </div>
              <div className="grid gap-3.5 px-4 pb-5 sm:px-5">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="money text-2xl font-semibold"><CountUp amount={planning.realized} format={money} /></span>
                  <span className="text-sm text-[var(--text-muted)]">de <span className="money">{money(planning.budget)}</span></span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-[var(--surface-subtle)]" role="img" aria-label={`${budget.percent}% do orçamento usado`}>
                  <motion.span
                    className={`block h-full rounded-full ${budget.percent > 100 ? 'bg-[var(--expense)]' : 'bg-[var(--primary)]'}`}
                    initial={reduce ? false : { width: 0 }}
                    whileInView={{ width: budget.barPercent + '%' }}
                    viewport={{ once: true }}
                    transition={reducedTransition(reduce, { duration: 1, ease: CARD_EASE, delay: 0.3 })}
                  />
                </div>
                <p className="text-sm text-[var(--text-muted)]">
                  <MoneyText>
                    {budget.remaining >= 0
                      ? `${budget.percent}% usado. Sobraram ${money(budget.remaining)}.`
                      : `${budget.percent}% usado. Passou ${money(Math.abs(budget.remaining))} do orçamento.`}
                  </MoneyText>
                </p>
                {planning.overBudgetCategories > 0 && (
                  <motion.p
                    className="rounded-[var(--radius-md)] bg-[var(--warning-subtle)] px-3 py-2.5 text-sm font-semibold text-[var(--warning)]"
                    initial={reduce ? false : { opacity: 0, x: 0 }}
                    whileInView={{ opacity: 1, x: reduce ? 0 : [0, -7, 6, -3, 0] }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: 0.9 }}
                  >
                    {planning.overBudgetCategories === 1 ? '1 categoria passou do limite.' : `${planning.overBudgetCategories} categorias passaram do limite.`}
                  </motion.p>
                )}
                <dl className="grid gap-2 text-sm">
                  <Row label={reviewable ? 'Despesa ainda pendente' : 'Comprometido'}>{money(planning.committed)}</Row>
                  <Row label={reviewable ? 'Receita ainda pendente' : 'Receita esperada'}>{money(planning.expectedIncome)}</Row>
                  {!reviewable && <Row label="Disponível">{money(planning.available)}</Row>}
                </dl>
              </div>
            </motion.section>
          )}

          <motion.section {...riseInView(reduce, 0.1)} className={`${cardClassName} flex-1`} aria-labelledby="closing-networth-heading">
            <div className="px-4 pb-2 pt-4 sm:px-5">
              <h2 id="closing-networth-heading" className="text-base font-bold">Patrimônio</h2>
              <p className="text-xs text-[var(--text-muted)]">Saldo realizado das contas</p>
            </div>
            {netWorth ? (
              <div className="grid gap-3 px-4 pb-5 sm:px-5">
                <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2.5">
                  <div>
                    <p className="text-sm text-[var(--text-muted)]">Mês anterior</p>
                    <p className="money break-words text-lg font-semibold"><CountUp amount={netWorth.previous} format={money} /></p>
                  </div>
                  {/* A seta vai e volta devagar, apontando do mês anterior para o fim do período. */}
                  <motion.span
                    className="text-[var(--text-muted)]"
                    aria-hidden="true"
                    animate={reduce ? undefined : { x: [0, 6, 0] }}
                    transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    →
                  </motion.span>
                  <div>
                    <p className="text-sm text-[var(--text-muted)]">Fim do período</p>
                    <p className="money break-words text-lg font-semibold"><CountUp amount={netWorth.current} format={money} /></p>
                  </div>
                </div>
                <p className={`money text-2xl font-bold ${netWorth.difference < 0 ? 'text-[var(--expense)]' : netWorth.difference > 0 ? 'text-[var(--income)]' : ''}`}>
                  <CountUp amount={netWorth.difference} format={signed} />
                </p>
              </div>
            ) : (
              <p className="px-4 pb-5 text-sm text-[var(--text-muted)] sm:px-5">
                Ainda não há dois pontos comparáveis de patrimônio nessa moeda para calcular a variação.
              </p>
            )}
          </motion.section>
        </div>
      </div>

      <motion.details {...riseInView(reduce)} className={`${cardClassName} group`}>
        <summary className="flex min-h-[52px] cursor-pointer list-none items-center justify-between px-4 font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--focus)] sm:px-5 [&::-webkit-details-marker]:hidden">
          Como calculamos este fechamento
          <span className="text-lg text-[var(--text-muted)] group-open:hidden" aria-hidden="true">+</span>
          <span className="hidden text-lg text-[var(--text-muted)] group-open:inline" aria-hidden="true">−</span>
        </summary>
        <div className="grid max-w-[78ch] gap-2.5 px-4 pb-5 text-sm text-[var(--text-muted)] sm:px-5">
          <p><strong className="text-[var(--foreground)]">Só o que foi concluído entra no resultado.</strong> Lançamentos pendentes ou cancelados ficam fora do saldo e aparecem em “Para fechar o mês”.</p>
          <p><strong className="text-[var(--foreground)]">Cartão de crédito conta na data da compra.</strong> O pagamento da fatura não é uma nova despesa, então o resultado não representa, por si só, a variação do seu caixa.</p>
          <p><strong className="text-[var(--foreground)]">Cada moeda é calculada separada.</strong> Valores em moedas diferentes nunca são somados.</p>
          <p><strong className="text-[var(--foreground)]">Os números mudam se você alterar o passado.</strong> O fechamento é recalculado a cada visita, com referência em {formatLogicalDate(data.asOf)}.</p>
          <p>{retrospective.netWorthMethodology.description}</p>
        </div>
      </motion.details>
    </div>
  );
}

function FlowItem({ index, label, color, amount, delta }: { index: number; label: string; color: string; amount: string; delta: { text: string; tone: ClosingTone } | null }) {
  const reduce = useReducedMotion();

  return (
    <motion.div
      className="grid min-w-0 content-start gap-0.5 rounded-[var(--radius-md)] bg-[var(--surface-raised)] px-3 py-3 sm:px-4 sm:py-3.5"
      initial={reduce ? false : { opacity: 0, y: 18, scale: 0.92 }}
      animate={{ opacity: 1, y: 0, scale: 1, transition: reducedTransition(reduce, { type: 'spring', stiffness: 300, damping: 20, delay: 0.8 + index * 0.1 }) }}
      whileHover="hover"
      whileTap="hover"
    >
      <span className="truncate text-xs font-semibold text-[var(--text-muted)] sm:text-sm">
        {/* No hover (ou toque) a bolinha da cor pulsa e o valor cresce. */}
        <motion.span
          className="mr-1.5 inline-block h-2 w-2 rounded-full"
          style={{ backgroundColor: color }}
          aria-hidden="true"
          variants={{ hover: { scale: [1, 2, 1], transition: { duration: 0.5 } } }}
        />
        {label}
      </span>
      <motion.span
        className="money origin-left truncate text-base font-semibold sm:text-2xl"
        style={{ color }}
        variants={{ hover: { scale: 1.07, transition: { type: 'spring', stiffness: 400, damping: 16 } } }}
      >
        {amount}
      </motion.span>
      {delta && <span className={`text-xs font-bold ${TONE_CLASS[delta.tone]}`}>{delta.text}</span>}
    </motion.div>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <motion.div className="flex justify-between gap-3" whileHover={{ x: 3 }} whileTap={{ x: 3 }}>
      <dt className="text-[var(--text-muted)]">{label}</dt>
      <dd className="money font-semibold">{children}</dd>
    </motion.div>
  );
}
