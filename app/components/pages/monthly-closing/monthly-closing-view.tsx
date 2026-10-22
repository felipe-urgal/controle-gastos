'use client';

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
import { IconRenderer, MoneyText } from '@/app/components/ui';
import { formatCurrency } from '@/app/lib/currency/format-currency';
import type { SupportedCurrency } from '@/app/types/financial-summary';
import type { MonthlyClosingData, MonthlyClosingRetrospective } from '@/app/types/monthly-closing';

type Retrospective = MonthlyClosingRetrospective;

const cardClassName = 'rounded-[16px] border border-[var(--border)] bg-[var(--surface)]';
const linkClassName =
  'inline-flex min-h-11 items-center text-sm font-semibold text-[var(--orbit-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]';

const TONE_CLASS: Record<ClosingTone, string> = {
  good: 'text-[var(--income)]',
  bad: 'text-[var(--expense)]',
  flat: 'text-[var(--text-muted)]',
};

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
  const money = (cents: number) => (showValues ? formatCurrency(cents, currency) : '••••');
  const previous = shiftPeriod(data.period.year, data.period.month, -1);
  const previousMonth = monthName(previous.month);
  const { summary, comparison, planning, netWorth, readiness } = retrospective;
  const isEmpty = summary.income === 0 && summary.expense === 0;
  const todo = buildTodoItems({ readiness, money, pendingHref: transactionsHref + '&status=PENDING' });
  const detailAccounts = readiness.reconciliation.accounts.filter((account) => account.status !== 'RECONCILED');
  const detailStatements = readiness.cardStatements.items;
  const spent = spentShare(summary);
  const budget = budgetUsage(planning);
  const reviewable = data.status === 'REVIEWABLE';

  return (
    <div className="space-y-4">
      <section aria-labelledby="closing-result-label" className="grid gap-6 rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-surface)] sm:p-6">
        <div className="grid gap-1.5">
          <p id="closing-result-label" className="text-sm font-semibold text-[var(--text-muted)]">Resultado do mês</p>
          <strong className={`money break-words text-[2.125rem] font-semibold leading-none tracking-[-0.035em] sm:text-5xl ${summary.balance < 0 ? 'text-[var(--expense)]' : ''}`}>
            {summary.balance > 0 ? '+ ' : summary.balance < 0 ? '− ' : ''}
            {money(Math.abs(summary.balance))}
          </strong>
          <p className="mt-2 max-w-[62ch] text-[15px] text-[var(--text-muted)]">
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
              <span className="h-full bg-[var(--expense)]" style={{ width: spent + '%' }} />
              <span className="h-full bg-[var(--income)]" style={{ width: 100 - spent + '%' }} />
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <FlowItem label="Receitas" dot="var(--income)" amount={money(summary.income)} delta={describeDelta(comparison.income, previousMonth)} />
              <FlowItem label="Despesas" dot="var(--expense)" amount={money(summary.expense)} delta={describeDelta(comparison.expense, previousMonth, true)} />
              <FlowItem label="Sobrou" dot="var(--orbit-primary)" amount={money(summary.balance)} delta={describeDelta(comparison.balance, previousMonth)} />
            </div>
          </div>
        )}
      </section>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-4">
          <section className={cardClassName} aria-labelledby="closing-todo-heading">
            <div className="flex flex-wrap items-baseline justify-between gap-2 px-4 pb-1 pt-4 sm:px-5">
              <h2 id="closing-todo-heading" className="text-base font-bold">Para fechar o mês</h2>
              <p className="text-xs text-[var(--text-muted)]">Conferências informativas. Nada aqui bloqueia alterações.</p>
            </div>
            <ul className="mt-2">
              {todo.map((item) => (
                <li key={item.key} className="grid grid-cols-[32px_minmax(0,1fr)] items-center gap-3 border-t border-[var(--border)] px-4 py-3 sm:grid-cols-[32px_minmax(0,1fr)_auto] sm:px-5">
                  <span
                    className={`grid h-8 w-8 place-items-center rounded-full text-sm font-extrabold ${item.ok ? 'bg-[var(--primary-subtle)] text-[var(--income)]' : 'bg-[var(--warning-subtle)] text-[var(--warning)]'}`}
                    aria-hidden="true"
                  >
                    {item.ok ? '✓' : '!'}
                  </span>
                  <span className="min-w-0">
                    <strong className="block text-sm">{item.title}</strong>
                    <span className="block text-[13px] text-[var(--text-muted)]">
                      <MoneyText>{item.detail}</MoneyText>
                    </span>
                  </span>
                  {!item.ok && (
                    <Link
                      href={item.href}
                      className="col-start-2 inline-flex min-h-11 items-center justify-center justify-self-start whitespace-nowrap rounded-[12px] border border-[var(--border-strong)] px-4 text-[13px] font-bold hover:bg-[var(--surface-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)] sm:col-start-3"
                    >
                      {item.actionLabel}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
            {(detailAccounts.length > 0 || detailStatements.length > 0) && (
              <details className="border-t border-[var(--border)]">
                <summary className="flex min-h-11 cursor-pointer list-none items-center px-4 text-sm text-[var(--text-muted)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--focus)] sm:px-5 [&::-webkit-details-marker]:hidden">
                  Ver contas e faturas em detalhe
                </summary>
                <div className="grid gap-2 px-4 pb-4 sm:px-5">
                  {detailAccounts.map((account) => (
                    <Link key={account.accountId} href={account.href} className="flex min-h-11 items-center justify-between gap-3 rounded-[10px] border border-[var(--border)] px-3 py-2 hover:bg-[var(--surface-hover)]">
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold">{account.accountName}</span>
                        <span className="block text-xs text-[var(--text-muted)]">
                          {account.status === 'NEVER_RECONCILED' ? 'Nunca conciliada' : account.status === 'PARTIAL' ? 'Conciliação parcial' : 'Lançamentos não conciliados'}
                          {account.unreconciledCount > 0 ? ' · ' + account.unreconciledCount : ''}
                        </span>
                      </span>
                    </Link>
                  ))}
                  {detailStatements.map((statement) => (
                    <Link key={statement.cardId + '-' + statement.closingDate.month + '-' + statement.closingDate.year} href={statement.href} className="flex min-h-11 items-center justify-between gap-3 rounded-[10px] border border-[var(--border)] px-3 py-2 hover:bg-[var(--surface-hover)]">
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold">{statement.cardName}</span>
                        <span className="block text-xs text-[var(--text-muted)]">Vence {formatLogicalDate(statement.dueDate)} · {CARD_STATE_LABELS[statement.state]}</span>
                      </span>
                      <span className="money shrink-0 text-sm font-semibold">{money(statement.amount)}</span>
                    </Link>
                  ))}
                </div>
              </details>
            )}
          </section>

          {!isEmpty && (
            <section className={cardClassName} aria-labelledby="closing-categories-heading">
              <div className="flex flex-wrap items-baseline justify-between gap-2 px-4 pb-1 pt-4 sm:px-5">
                <h2 id="closing-categories-heading" className="text-base font-bold">Para onde foi o dinheiro</h2>
                <Link href={transactionsHref} className={linkClassName}>Ver transações</Link>
              </div>
              {retrospective.topCategories.length === 0 ? (
                <p className="px-4 pb-5 pt-2 text-sm text-[var(--text-muted)] sm:px-5">Nenhuma despesa realizada no período.</p>
              ) : (
                <ul className="grid gap-0.5 px-2 pb-3 pt-1 sm:px-3">
                  {retrospective.topCategories.map((category) => (
                    <li key={category.id}>
                      <Link
                        href={transactionsHref + '&categoryId=' + encodeURIComponent(category.id)}
                        className="grid min-h-14 grid-cols-[36px_minmax(0,1fr)_auto] items-center gap-3 rounded-[12px] px-2 py-2 hover:bg-[var(--surface-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--focus)]"
                      >
                        <span className="grid h-9 w-9 place-items-center rounded-[10px]" style={{ backgroundColor: category.color }} aria-hidden="true">
                          <IconRenderer iconName={category.icon || 'tag'} size={16} className="text-white" />
                        </span>
                        <span className="min-w-0">
                          <span className="flex justify-between gap-2 text-sm font-semibold">
                            <span className="truncate">{category.name}</span>
                            <span className="shrink-0 text-xs font-medium text-[var(--text-muted)]">{category.sharePercentage}%</span>
                          </span>
                          <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-[var(--surface-subtle)]">
                            <span className="block h-full rounded-full" style={{ width: Math.min(100, category.sharePercentage) + '%', backgroundColor: category.color }} />
                          </span>
                        </span>
                        <span className="money text-sm font-semibold">{money(category.realized)}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
        </div>

        <div className="min-w-0 space-y-4">
          {budget && (
            <section className={cardClassName} aria-labelledby="closing-budget-heading">
              <div className="px-4 pb-2 pt-4 sm:px-5">
                <h2 id="closing-budget-heading" className="text-base font-bold">Orçamento</h2>
                <p className="text-xs text-[var(--text-muted)]">Gasto contra o que você planejou</p>
              </div>
              <div className="grid gap-3.5 px-4 pb-5 sm:px-5">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="money text-[22px] font-semibold">{money(planning.realized)}</span>
                  <span className="text-sm text-[var(--text-muted)]">de <span className="money">{money(planning.budget)}</span></span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-[var(--surface-subtle)]" role="img" aria-label={`${budget.percent}% do orçamento usado`}>
                  <span className={`block h-full rounded-full ${budget.percent > 100 ? 'bg-[var(--expense)]' : 'bg-[var(--orbit-primary)]'}`} style={{ width: budget.barPercent + '%' }} />
                </div>
                <p className="text-sm text-[var(--text-muted)]">
                  <MoneyText>
                    {budget.remaining >= 0
                      ? `${budget.percent}% usado. Sobraram ${money(budget.remaining)}.`
                      : `${budget.percent}% usado. Passou ${money(Math.abs(budget.remaining))} do orçamento.`}
                  </MoneyText>
                </p>
                {planning.overBudgetCategories > 0 && (
                  <p className="rounded-[10px] bg-[var(--warning-subtle)] px-3 py-2.5 text-[13px] font-semibold text-[var(--warning)]">
                    {planning.overBudgetCategories === 1 ? '1 categoria passou do limite.' : `${planning.overBudgetCategories} categorias passaram do limite.`}
                  </p>
                )}
                <dl className="grid gap-2 text-[13px]">
                  <Row label={reviewable ? 'Despesa ainda pendente' : 'Comprometido'}>{money(planning.committed)}</Row>
                  <Row label={reviewable ? 'Receita ainda pendente' : 'Receita esperada'}>{money(planning.expectedIncome)}</Row>
                  {!reviewable && <Row label="Disponível">{money(planning.available)}</Row>}
                </dl>
              </div>
            </section>
          )}

          <section className={cardClassName} aria-labelledby="closing-networth-heading">
            <div className="px-4 pb-2 pt-4 sm:px-5">
              <h2 id="closing-networth-heading" className="text-base font-bold">Patrimônio</h2>
              <p className="text-xs text-[var(--text-muted)]">Saldo realizado das contas</p>
            </div>
            {netWorth ? (
              <div className="grid gap-3 px-4 pb-5 sm:px-5">
                <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2.5">
                  <div>
                    <p className="text-[13px] text-[var(--text-muted)]">Mês anterior</p>
                    <p className="money break-words text-[17px] font-semibold">{money(netWorth.previous)}</p>
                  </div>
                  <span className="text-[var(--text-muted)]" aria-hidden="true">→</span>
                  <div>
                    <p className="text-[13px] text-[var(--text-muted)]">Fim do período</p>
                    <p className="money break-words text-[17px] font-semibold">{money(netWorth.current)}</p>
                  </div>
                </div>
                <p className={`money text-2xl font-bold ${netWorth.difference < 0 ? 'text-[var(--expense)]' : netWorth.difference > 0 ? 'text-[var(--income)]' : ''}`}>
                  {netWorth.difference > 0 ? '+ ' : netWorth.difference < 0 ? '− ' : ''}
                  {money(Math.abs(netWorth.difference))}
                </p>
              </div>
            ) : (
              <p className="px-4 pb-5 text-sm text-[var(--text-muted)] sm:px-5">
                Ainda não há dois pontos comparáveis de patrimônio nessa moeda para calcular a variação.
              </p>
            )}
          </section>
        </div>
      </div>

      <details className={`${cardClassName} group`}>
        <summary className="flex min-h-[52px] cursor-pointer list-none items-center justify-between px-4 font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--focus)] sm:px-5 [&::-webkit-details-marker]:hidden">
          Como calculamos este fechamento
          <span className="text-lg text-[var(--text-muted)] group-open:hidden" aria-hidden="true">+</span>
          <span className="hidden text-lg text-[var(--text-muted)] group-open:inline" aria-hidden="true">−</span>
        </summary>
        <div className="grid max-w-[78ch] gap-2.5 px-4 pb-5 text-[13px] text-[var(--text-muted)] sm:px-5">
          <p><strong className="text-[var(--foreground)]">Só o que foi concluído entra no resultado.</strong> Lançamentos pendentes ou cancelados ficam fora do saldo e aparecem em “Para fechar o mês”.</p>
          <p><strong className="text-[var(--foreground)]">Cartão de crédito conta na data da compra.</strong> O pagamento da fatura não é uma nova despesa, então o resultado não representa, por si só, a variação do seu caixa.</p>
          <p><strong className="text-[var(--foreground)]">Cada moeda é calculada separada.</strong> Valores em moedas diferentes nunca são somados.</p>
          <p><strong className="text-[var(--foreground)]">Os números mudam se você alterar o passado.</strong> O fechamento é recalculado a cada visita, com referência em {formatLogicalDate(data.asOf)}.</p>
          <p>{retrospective.netWorthMethodology.description}</p>
        </div>
      </details>
    </div>
  );
}

function FlowItem({ label, dot, amount, delta }: { label: string; dot: string; amount: string; delta: { text: string; tone: ClosingTone } }) {
  return (
    <div className="grid gap-0.5 rounded-[12px] bg-[var(--surface-raised)] px-4 py-3.5">
      <span className="text-[13px] font-semibold text-[var(--text-muted)]">
        <span className="mr-1.5 inline-block h-2 w-2 rounded-full" style={{ backgroundColor: dot }} aria-hidden="true" />
        {label}
      </span>
      <span className="money break-words text-[22px] font-semibold">{amount}</span>
      <span className={`text-xs font-bold ${TONE_CLASS[delta.tone]}`}>{delta.text}</span>
    </div>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-[var(--text-muted)]">{label}</dt>
      <dd className="money font-semibold">{children}</dd>
    </div>
  );
}
