'use client';

import Link from 'next/link';
import ForecastPanel from '@/app/components/pages/dashboard/forecast';
import { ModalShell } from '@/app/components/overlays/modal-shell';
import { ReactNode } from 'react';
import { FaArrowDown, FaArrowRight, FaArrowUp, FaBarcode, FaCalendarAlt, FaChartPie, FaChevronRight, FaCreditCard, FaExchangeAlt, FaEye, FaBullseye, FaPlus, FaQuestionCircle } from 'react-icons/fa';
import { IconRenderer } from '@/app/components/ui';
import { formatCurrency } from '@/app/lib/currency/format-currency';
import { DashboardHome, DashboardRecentTransaction, MonthlyDashboard } from '@/app/types/dashboard';
import { SupportedCurrency } from '@/app/types/financial-summary';
import { ForecastData } from '@/app/types/forecast';
import { FinancialCommitment } from '@/app/types/financial-commitment';
import { commitmentBadge, compactMonthLabel, dashboardLogicalDateLabel, displayMoney, groupCommitments, monthLabel, signedMoney, transactionDateLabel } from '@/app/components/pages/dashboard/dashboard/dashboard-helpers';
import { ComparisonDetail } from '@/app/components/pages/dashboard/dashboard/insight-cards';

export function CurrentCashCard({
  accounts,
  total,
  showValues,
  currency,
  asOf,
}: {
  accounts: DashboardHome['current']['cash']['accounts'];
  total: number;
  showValues: boolean;
  currency: string;
  asOf: DashboardHome['scope']['currentAsOf'];
}) {
  return (
    <article
      className="relative min-h-[278px] overflow-hidden rounded-[14px] border border-[var(--orbit-primary)]/55 p-5"
      style={{
        background:
          'linear-gradient(135deg, color-mix(in srgb, var(--orbit-primary) 32%, var(--surface)) 0%, color-mix(in srgb, var(--orbit-primary) 14%, var(--surface)) 48%, var(--surface) 100%)',
      }}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.04em] text-[var(--text-muted)]">
        Hoje · {dashboardLogicalDateLabel(asOf)}
      </p>
      <div className="mt-3 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-[19px] font-bold leading-tight">Saldo realizado em contas correntes</h2>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Investimentos ficam no patrimônio e não entram como dinheiro disponível.
          </p>
        </div>
        <Link
          href="/contas"
          className="hidden min-h-11 shrink-0 items-center gap-3 rounded-[10px] border border-[var(--orbit-primary)]/60 bg-[var(--orbit-primary-subtle)] px-4 text-sm font-semibold sm:inline-flex"
        >
          Ver contas <FaArrowRight className="text-[var(--orbit-primary)]" aria-hidden="true" />
        </Link>
      </div>

      <strong className={`mt-5 block text-[36px] font-extrabold leading-none tracking-tight ${total < 0 ? 'text-[var(--expense)]' : 'text-[var(--foreground)]'}`}>
        {displayMoney(total, showValues, currency)}
      </strong>
      <p className="mt-2 text-sm text-[var(--text-muted)]">
        {accounts.length === 0
          ? 'Nenhuma conta corrente ativa nesta moeda.'
          : `${accounts.length} ${accounts.length === 1 ? 'conta corrente ativa' : 'contas correntes ativas'}`}
      </p>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Link href="/transacoes/nova?type=expense" className="flex min-h-[68px] flex-col items-center justify-center gap-2 rounded-[9px] bg-[var(--orbit-primary)] px-2 text-center text-xs font-bold text-[var(--orbit-on-primary)] shadow-sm">
          <span className="grid h-5 w-5 place-items-center rounded-full bg-white/90 text-[var(--orbit-primary)]"><FaPlus size={10} aria-hidden="true" /></span> Nova transação
        </Link>
        <Link href="/transacoes/nova?mode=transfer" className="flex min-h-[68px] flex-col items-center justify-center gap-2 rounded-[9px] border border-[var(--border-strong)] bg-[var(--surface)] px-2 text-center text-xs font-semibold">
          <FaExchangeAlt aria-hidden="true" /> Transferir
        </Link>
        <Link href="/transacoes/nova?type=expense" className="flex min-h-[68px] flex-col items-center justify-center gap-2 rounded-[9px] border border-[var(--border-strong)] bg-[var(--surface)] px-2 text-center text-xs font-semibold">
          <FaBarcode aria-hidden="true" /> Pagar conta
        </Link>
        <Link href="/transacoes/nova?type=income" className="flex min-h-[68px] flex-col items-center justify-center gap-2 rounded-[9px] border border-[var(--border-strong)] bg-[var(--surface)] px-2 text-center text-xs font-semibold">
          <FaArrowUp aria-hidden="true" /> Adicionar dinheiro
        </Link>
      </div>
    </article>
  );
}

export function AccountsCard({
  accounts,
  showValues,
  currency,
}: {
  accounts: DashboardHome['current']['cash']['accounts'];
  showValues: boolean;
  currency: string;
}) {
  return (
    <article className="min-h-[278px] rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-[14px]">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.04em] text-[var(--text-muted)]">
        Contas correntes <FaEye aria-hidden="true" />
      </div>
      <h2 className="mt-2 text-lg font-bold">Detalhamento do saldo atual</h2>
      <p className="mt-1 text-xs text-[var(--text-muted)]">Somente contas de caixa em {currency}; investimentos ficam no patrimônio.</p>

      <div className="mt-3 divide-y divide-[var(--border)] border-t border-[var(--border)]">
        {accounts.length === 0 ? (
          <p className="py-4 text-sm text-[var(--text-muted)]">Nenhuma conta ativa nesta moeda.</p>
        ) : (
          accounts.slice(0, 4).map((account) => (
            <Link key={account.id} href="/contas" className="flex min-h-10 items-center justify-between gap-3 py-1">
              <span className="flex min-w-0 items-center gap-2.5">
                <span
                  className="grid h-7 w-7 shrink-0 place-items-center rounded-[7px] text-white"
                  style={{ backgroundColor: account.color }}
                >
                  <IconRenderer iconName={account.icon || 'wallet'} size={13} />
                </span>
                <span className="truncate text-xs font-semibold">{account.name}</span>
              </span>
              <span className="flex shrink-0 items-center gap-2 text-xs font-semibold">
                {displayMoney(account.balance, showValues, account.currency)}
                <FaChevronRight className="text-xs text-[var(--text-muted)]" aria-hidden="true" />
              </span>
            </Link>
          ))
        )}
      </div>
    </article>
  );
}

export function MonthlyPlanningCard({
  planning,
  showValues,
  currency,
}: {
  planning: MonthlyDashboard['planning'];
  showValues: boolean;
  currency: string;
}) {
  const consumption = planning.realized + planning.committed;
  const percentage =
    planning.budget > 0
      ? Math.round((consumption / planning.budget) * 1000) / 10
      : 0;

  return (
    <article className="rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-[14px]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-base font-bold">
            <FaChartPie className="text-[var(--orbit-primary)]" aria-hidden="true" />
            Planejamento mensal
          </h2>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Mesma regra de Categorias / Limites: realizado + comprometido.
          </p>
        </div>
        <Link href="/categorias" className="text-xs font-semibold text-[var(--orbit-primary)]">
          Ajustar orçamento
        </Link>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <PlanningMetric label="Orçamento" value={displayMoney(planning.budget, showValues, currency)} />
        <PlanningMetric label="Realizado" value={displayMoney(planning.realized, showValues, currency)} />
        <PlanningMetric label="Comprometido" value={displayMoney(planning.committed, showValues, currency)} />
        <PlanningMetric
          label="Disponível"
          value={displayMoney(planning.available, showValues, currency)}
          danger={planning.available < 0}
        />
        <PlanningMetric label="Receita esperada" value={displayMoney(planning.expectedIncome, showValues, currency)} />
      </div>

      <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--surface-subtle)]">
        <div
          className={`h-full rounded-full ${
            planning.available < 0 ? 'bg-[var(--expense)]' : 'bg-[var(--orbit-primary)]'
          }`}
          style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }}
        />
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--text-muted)]">
        <span>{percentage.toLocaleString('pt-BR')}% do orçamento consumido</span>
        {planning.overBudgetCategories > 0 && (
          <strong className="text-[var(--expense)]">
            {planning.overBudgetCategories} categoria{planning.overBudgetCategories === 1 ? '' : 's'} acima do orçamento
          </strong>
        )}
      </div>
    </article>
  );
}

export function PlanningMetric({
  label,
  value,
  danger = false,
}: {
  label: string;
  value: string;
  danger?: boolean;
}) {
  return (
    <div className="rounded-[10px] bg-[var(--surface-raised)] p-3">
      <p className="text-xs text-[var(--text-muted)]">{label}</p>
      <strong className={`mt-1 block text-sm ${danger ? 'text-[var(--expense)]' : 'text-[var(--foreground)]'}`}>
        {value}
      </strong>
    </div>
  );
}

export function FinancialGoalsCard({
  goals,
  showValues,
  currency,
}: {
  goals: MonthlyDashboard['goals'];
  showValues: boolean;
  currency: string;
}) {
  return (
    <article className="rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-[14px]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-base font-bold">
            <FaBullseye className="text-[var(--orbit-primary)]" aria-hidden="true" />
            Metas
          </h2>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Progresso atual das metas. Nenhum valor altera o saldo das contas.
          </p>
        </div>
        <Link href="/metas" className="inline-flex min-h-11 items-center px-2 -mx-2 text-xs font-semibold text-[var(--orbit-primary)] sm:min-h-0">
          Ver todas
        </Link>
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
        {goals.slice(0, 3).map((goal) => {
          const percentage = Math.max(0, Math.min(100, goal.percentage));

          return (
            <Link
              key={goal.id}
              href={`/metas#goal-${encodeURIComponent(goal.id)}`}
              className="rounded-[12px] border border-[var(--border)] bg-[var(--surface-raised)] p-3 transition-colors hover:bg-[var(--surface-hover)]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-[var(--foreground)]">
                    {goal.name}
                  </p>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">
                    {goal.targetDate
                      ? `Prazo ${goal.targetDate.split('-').reverse().join('/')}`
                      : 'Sem prazo definido'}
                  </p>
                </div>
                <span className="shrink-0 text-xs font-bold text-[var(--orbit-primary)]">
                  {goal.percentage.toLocaleString('pt-BR')}%
                </span>
              </div>

              <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--surface-subtle)]">
                <div
                  className="h-full rounded-full bg-[var(--orbit-primary)]"
                  style={{ width: `${percentage}%` }}
                />
              </div>

              <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <p className="text-[var(--text-muted)]">Atual</p>
                  <strong className="mt-1 block text-[var(--foreground)]">
                    {displayMoney(goal.currentAmount, showValues, currency)}
                  </strong>
                </div>
                <div>
                  <p className="text-[var(--text-muted)]">Falta</p>
                  <strong className="mt-1 block text-[var(--foreground)]">
                    {displayMoney(goal.remainingAmount, showValues, currency)}
                  </strong>
                </div>
              </div>

              {goal.monthlyContributionSuggestion !== null && (
                <p className="mt-2 text-xs text-[var(--text-muted)]">
                  Aproximadamente {displayMoney(goal.monthlyContributionSuggestion, showValues, currency)}/mês até o prazo.
                </p>
              )}
            </Link>
          );
        })}
      </div>
    </article>
  );
}

export function CreditCardsCard({
  cards,
  showValues,
  currency,
}: {
  cards: MonthlyDashboard['cards'];
  showValues: boolean;
  currency: string;
}) {
  return (
    <article className="rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-[14px]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-base font-bold">
            <FaCreditCard className="text-[var(--orbit-primary)]" aria-hidden="true" />
            Cartões
          </h2>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Estado atual de limite e próxima fatura, sem somar crédito ao saldo disponível.
          </p>
        </div>
        <Link href="/contas" className="text-xs font-semibold text-[var(--orbit-primary)]">
          Ver contas
        </Link>
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
        {cards.slice(0, 3).map((card) => {
          const usage =
            card.creditLimit > 0
              ? Math.min(100, Math.round((card.usedLimit / card.creditLimit) * 100))
              : 0;

          return (
            <Link
              key={card.id}
              href={`/contas/show/${card.id}`}
              className="rounded-[12px] border border-[var(--border)] bg-[var(--surface-raised)] p-3 transition-colors hover:bg-[var(--surface-hover)]"
            >
              <div className="flex items-center gap-3">
                <span
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-[10px] text-white"
                  style={{ backgroundColor: card.color }}
                  aria-hidden="true"
                >
                  <IconRenderer iconName={card.icon || 'credit-card'} size={17} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-[var(--foreground)]">{card.name}</p>
                  <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                    {usage}% do limite em uso
                  </p>
                </div>
                <FaChevronRight className="text-xs text-[var(--text-muted)]" aria-hidden="true" />
              </div>

              <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <p className="text-[var(--text-muted)]">Disponível</p>
                  <strong className="mt-1 block text-[var(--foreground)]">
                    {displayMoney(card.availableLimit, showValues, currency)}
                  </strong>
                </div>
                <div>
                  <p className="text-[var(--text-muted)]">Próxima fatura</p>
                  <strong className="mt-1 block text-[var(--foreground)]">
                    {card.nextStatement
                      ? displayMoney(card.nextStatement.amount, showValues, currency)
                      : 'Sem fatura'}
                  </strong>
                </div>
              </div>

              {card.nextStatement && (
                <p className="mt-2 text-xs text-[var(--text-muted)]">
                  Vence {dashboardLogicalDateLabel(card.nextStatement.dueDate)}
                </p>
              )}
            </Link>
          );
        })}
      </div>
    </article>
  );
}

export function UpcomingCard({
  items,
  asOf,
  showValues,
  currency,
  loading,
  error,
}: {
  items: FinancialCommitment[];
  asOf: DashboardHome['scope']['currentAsOf'];
  showValues: boolean;
  currency: string;
  loading: boolean;
  error: string;
}) {
  return (
    <article className="min-h-[278px] rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-[14px]">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-[0.04em] text-[var(--text-muted)]">Compromissos · hoje</h2>
        <Link href="/compromissos" className="inline-flex min-h-11 items-center px-2 -mx-2 text-xs font-semibold text-[var(--orbit-primary)] sm:min-h-0">Ver todos</Link>
      </div>

      <div className="mt-2 divide-y divide-[var(--border)]">
        {loading ? (
          <div className="space-y-2 py-2" role="status" aria-label="Carregando compromissos">
            {[1, 2, 3, 4].map((item) => <div key={item} className="h-[46px] animate-pulse rounded-lg bg-[var(--skeleton)]" />)}
          </div>
        ) : error ? (
          <p className="py-4 text-sm text-[var(--expense)]">{error}</p>
        ) : items.length === 0 ? (
          <p className="py-4 text-sm text-[var(--text-muted)]">Nenhum compromisso vencido ou próximo nos próximos 30 dias.</p>
        ) : (
          <div className="space-y-3 py-1">
            {groupCommitments(items, 2).map((group) => (
              <section key={group.direction} aria-label={group.label}>
                <div className="mb-1 flex items-center justify-between gap-2">
                  <h3 className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                    {group.label}
                  </h3>
                  <span className="text-xs text-[var(--text-muted)]">
                    {group.items.length}
                  </span>
                </div>
                <div className="divide-y divide-[var(--border)]">
                  {group.items.map((item) => (
                    <Link key={item.id} href={item.href} className="grid min-h-[52px] grid-cols-[46px_minmax(0,1fr)_auto] items-center gap-3 py-1">
                      <span className="grid h-[43px] w-[43px] place-content-center rounded-[9px] border border-[var(--border-strong)] text-center">
                        <strong className="text-sm leading-none">{String(item.date.day).padStart(2, '0')}</strong>
                        <span className="mt-1 text-xs font-medium uppercase leading-none text-[var(--text-muted)]">{compactMonthLabel(item.date.month, item.date.year)}</span>
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-xs font-bold">{item.title}</p>
                        <p className="mt-1 text-xs text-[var(--text-muted)]">
                          {item.amount === null ? 'Marco sem valor financeiro' : displayMoney(item.amount, showValues, currency)}
                        </p>
                      </div>
                      <span className={`rounded-[8px] px-2.5 py-1.5 text-xs font-semibold ${item.state === 'OVERDUE' ? 'bg-[var(--danger-subtle)] text-[var(--expense)]' : 'bg-[var(--orbit-primary-subtle)] text-[var(--orbit-primary)]'}`}>
                        {item.state === 'OVERDUE' ? 'Vencido' : commitmentBadge(item.date, asOf)}
                      </span>
                    </Link>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}

export function MonthOverviewCard({
  data,
  showValues,
  incomeWidth,
  expenseWidth,
}: {
  data: MonthlyDashboard;
  showValues: boolean;
  incomeWidth: number;
  expenseWidth: number;
}) {
  const previous = data.comparison.previousPeriod;

  return (
    <article className="min-h-[252px] rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-[22px]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">Visão do mês</h2>
          <p className="mt-1 text-sm text-[var(--text-muted)]">Seu dinheiro em {monthLabel(`${data.period.year}-${String(data.period.month).padStart(2, '0')}`)}.</p>
        </div>
        <span className="inline-flex min-h-9 items-center rounded-[9px] border border-[var(--border)] bg-[var(--surface-raised)] px-3 text-xs font-semibold">
          {monthLabel(`${data.period.year}-${String(data.period.month).padStart(2, '0')}`)}
        </span>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-3 sm:divide-x sm:divide-[var(--border)]">
        <MonthMetric
          icon={<FaArrowUp aria-hidden="true" />}
          label="Receitas"
          value={displayMoney(data.summary.income, showValues, data.currency)}
          detail={
            <ComparisonDetail
              percentage={data.comparison.income.percentage}
              previousMonth={previous.month}
              previousYear={previous.year}
              tone={data.comparison.income.percentage !== null && data.comparison.income.percentage >= 0 ? 'income' : 'expense'}
            />
          }
          tone="income"
        />
        <MonthMetric
          icon={<FaArrowDown aria-hidden="true" />}
          label="Despesas"
          value={displayMoney(data.summary.expense, showValues, data.currency)}
          detail={
            <ComparisonDetail
              percentage={data.comparison.expense.percentage}
              previousMonth={previous.month}
              previousYear={previous.year}
            />
          }
          tone="expense"
        />
        <MonthMetric
          icon={<span aria-hidden="true">−</span>}
          label="Saldo do mês"
          value={signedMoney(data.summary.balance, showValues, data.currency)}
          detail={data.summary.balance < 0 ? 'Você gastou mais que recebeu.' : 'O mês está positivo até aqui.'}
          tone={data.summary.balance < 0 ? 'expense' : 'income'}
          iconTone="neutral"
        />
      </div>

      <div className="mt-4 flex h-3 overflow-hidden rounded-full bg-[var(--surface-subtle)]" aria-label="Proporção entre receitas e despesas">
        <span className="h-full bg-[var(--income)]" style={{ width: `${incomeWidth}%` }} />
        <span className="h-full bg-[var(--expense)]" style={{ width: `${expenseWidth}%` }} />
      </div>
      <div className="mt-2 flex items-center justify-between gap-3 text-xs font-semibold">
        <span>{displayMoney(data.summary.income, showValues, data.currency)}</span>
        <span className="text-[var(--expense)]">{displayMoney(data.summary.expense, showValues, data.currency)}</span>
      </div>
    </article>
  );
}

export function MonthMetric({
  icon,
  label,
  value,
  detail,
  tone,
  iconTone = tone,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  detail: ReactNode;
  tone: 'income' | 'expense' | 'neutral';
  iconTone?: 'income' | 'expense' | 'neutral';
}) {
  const toneClass =
    tone === 'income'
      ? 'text-[var(--income)]'
      : tone === 'expense'
        ? 'text-[var(--expense)]'
        : 'text-[var(--foreground)]';
  const iconToneClass =
    iconTone === 'income'
      ? 'bg-[var(--primary-subtle)] text-[var(--income)]'
      : iconTone === 'expense'
        ? 'bg-[var(--danger-subtle)] text-[var(--expense)]'
        : 'bg-[var(--surface-subtle)] text-[var(--text-muted)]';
  return (
    <div className="min-w-0 sm:px-4 sm:first:pl-0 sm:last:pr-0">
      <div className="flex items-center gap-2">
        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${iconToneClass}`}>{icon}</span>
        <span className="text-sm text-[var(--text-muted)]">{label}</span>
      </div>
      <strong className={`mt-2 block break-words text-xl font-extrabold ${toneClass}`}>{value}</strong>
      <p className="mt-1 text-xs leading-relaxed text-[var(--text-muted)]">{detail}</p>
    </div>
  );
}

export function CategoriesCard({
  categories,
  showValues,
  currency,
  period,
}: {
  categories: MonthlyDashboard['categories'];
  showValues: boolean;
  currency: string;
  period: MonthlyDashboard['period'];
}) {
  return (
    <article className="rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-[14px]">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold">Principais categorias de gastos</h2>
        <span className="hidden text-xs font-semibold text-[var(--text-muted)] sm:inline">{monthLabel(`${period.year}-${String(period.month).padStart(2, '0')}`)}</span>
      </div>
      <div className="mt-2 divide-y divide-[var(--border)]">
        {categories.length === 0 ? (
          <p className="py-4 text-sm text-[var(--text-muted)]">Nenhuma despesa categorizada neste período.</p>
        ) : (
          categories.map((category) => (
            <Link
              key={category.id}
              href={`/categorias/show/${encodeURIComponent(category.id)}`}
              className="grid min-h-11 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-[9px] py-0.5 transition-colors hover:bg-[var(--surface-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)] sm:grid-cols-[minmax(0,1.1fr)_120px_minmax(90px,.8fr)_44px]"
            >
              <span className="flex min-w-0 items-center gap-2.5">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-white" style={{ backgroundColor: category.color }}><IconRenderer iconName={category.icon || 'tag'} size={14} /></span>
                <span className="truncate text-sm font-semibold">{category.name}</span>
              </span>
              <strong className="text-right text-sm sm:text-left">{displayMoney(category.realized, showValues, currency)}</strong>
              <span className="hidden h-2 overflow-hidden rounded-full bg-[var(--surface-subtle)] sm:block">
                <span className="block h-full rounded-full bg-[var(--orbit-primary)]" style={{ width: `${Math.min(100, category.sharePercentage)}%` }} />
              </span>
              <span className="hidden text-right text-xs font-semibold text-[var(--text-muted)] sm:block">{category.sharePercentage.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%</span>
            </Link>
          ))
        )}
      </div>
      <Link href="/categorias" className="mt-2 flex min-h-11 sm:min-h-9 items-center justify-between rounded-[10px] border border-[var(--border-strong)] px-3 text-sm font-semibold">
        Ver todas as categorias <FaChevronRight aria-hidden="true" />
      </Link>
    </article>
  );
}

export function RecentTransactionsCard({
  items,
  loading,
  error,
  showValues,
  currency,
}: {
  items: DashboardRecentTransaction[];
  loading: boolean;
  error: string;
  showValues: boolean;
  currency: string;
}) {
  return (
    <article className="min-h-[244px] rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-[14px]">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold">Últimas transações do mês</h2>
        <Link href="/transacoes" className="inline-flex min-h-11 items-center px-2 -mx-2 text-xs font-semibold text-[var(--orbit-primary)] sm:min-h-0">Ver todas</Link>
      </div>

      <div className="mt-2 divide-y divide-[var(--border)]">
        {loading ? (
          <div className="space-y-2 py-2" role="status" aria-label="Carregando transações recentes">
            {[1, 2, 3, 4].map((item) => <div key={item} className="h-[38px] animate-pulse rounded-lg bg-[var(--skeleton)]" />)}
          </div>
        ) : error ? (
          <p className="py-5 text-sm text-[var(--expense)]">{error}</p>
        ) : items.length === 0 ? (
          <p className="py-5 text-sm text-[var(--text-muted)]">Nenhuma transação encontrada neste mês.</p>
        ) : (
          items.map((transaction) => {
            const isIncome = transaction.type === 'INCOME';
            const isTransfer = transaction.kind === 'TRANSFER';
            const isCardPayment = transaction.kind === 'CARD_PAYMENT';
            const tone = isTransfer || isCardPayment ? 'text-[var(--orbit-primary)]' : isIncome ? 'text-[var(--income)]' : 'text-[var(--expense)]';
            const statusLabel = transaction.status === 'COMPLETED' ? null : transaction.status === 'PENDING' ? 'Pendente' : 'Cancelada';

            return (
              <Link key={transaction.id} href={`/transacoes/show/${transaction.id}`} className="grid min-h-11 sm:min-h-9 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-1 sm:grid-cols-[minmax(0,1.25fr)_130px_150px_auto]">
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-white ${isTransfer ? 'bg-[var(--orbit-primary)]' : isIncome ? 'bg-[var(--income)]' : ''}`}
                    style={!isTransfer && !isIncome && transaction.category ? { backgroundColor: transaction.category.color } : undefined}
                  >
                    {isTransfer || isCardPayment ? <FaExchangeAlt size={12} aria-hidden="true" /> : <IconRenderer iconName={transaction.category?.icon || (isIncome ? 'income-up' : 'tag')} size={12} />}
                  </span>
                  <p className="truncate text-xs font-semibold">{transaction.description}</p>
                </div>
                <span className="hidden text-xs text-[var(--text-muted)] sm:block">{transactionDateLabel(transaction)}</span>
                <span className="hidden truncate text-xs text-[var(--text-muted)] sm:block">
                  {isTransfer && transaction.counterpartAccount
                    ? `${transaction.account.name} → ${transaction.counterpartAccount.name}`
                    : `${transaction.account.name}${isCardPayment ? ' · Pagamento de fatura' : ''}${statusLabel ? ` · ${statusLabel}` : ''}`}
                </span>
                <strong className={`shrink-0 text-xs ${tone}`}>
                  {showValues ? `${isIncome ? '+' : isTransfer || isCardPayment ? '' : '-'} ${formatCurrency(transaction.amount, currency)}` : '••••'}
                </strong>
              </Link>
            );
          })
        )}
      </div>
    </article>
  );
}

export function ProjectedBalanceCard({
  safeToSpend,
  showValues,
  currency,
  loading,
  error,
  commitmentCount,
  horizonEnd,
  onOpen,
  enabled,
}: {
  safeToSpend: ForecastData['safeToSpend'] | null;
  showValues: boolean;
  currency: string;
  loading: boolean;
  error: string;
  commitmentCount: number;
  horizonEnd: ForecastData['horizonEnd'] | null;
  onOpen: () => void;
  enabled: boolean;
}) {
  const projectedDate = horizonEnd
    ? `${String(horizonEnd.day).padStart(2, '0')}/${String(horizonEnd.month).padStart(2, '0')}`
    : '30 dias';

  return (
    <article className="min-h-[244px] rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-[14px]">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-bold">Disponível para gastar</h2>
        <span className="rounded-full border border-[var(--orbit-primary)]/35 bg-[var(--orbit-primary-subtle)] px-2.5 py-1 text-xs font-semibold text-[var(--orbit-primary)]">Cálculo conservador</span>
        <FaQuestionCircle className="ml-auto text-xs text-[var(--text-muted)]" aria-hidden="true" />
      </div>

      {error ? (
        <p className="mt-4 text-sm text-[var(--expense)]">{error}</p>
      ) : loading ? (
        <div className="mt-4 h-28 animate-pulse rounded-xl bg-[var(--skeleton)]" role="status" aria-label="Carregando disponível para gastar" />
      ) : (
        <div className="mt-2">
          <ProjectionRow label="Saldo realizado" value={safeToSpend ? displayMoney(safeToSpend.realizedBalance, showValues, currency) : '—'} />
          <ProjectionRow
            label="(-) Pendências conhecidas"
            value={safeToSpend && safeToSpend.pendingExpenses > 0 ? `- ${displayMoney(safeToSpend.pendingExpenses, showValues, currency)}` : displayMoney(0, showValues, currency)}
            tone={safeToSpend && safeToSpend.pendingExpenses > 0 ? 'expense' : 'neutral'}
          />
          <ProjectionRow
            label="(-) Faturas em aberto"
            value={safeToSpend && safeToSpend.cardCommitments > 0 ? `- ${displayMoney(safeToSpend.cardCommitments, showValues, currency)}` : displayMoney(0, showValues, currency)}
            tone={safeToSpend && safeToSpend.cardCommitments > 0 ? 'expense' : 'neutral'}
          />
          <ProjectionRow
            label="(+/-) Transferências"
            value={
              !safeToSpend || safeToSpend.transferNet === 0
                ? displayMoney(0, showValues, currency)
                : `${safeToSpend.transferNet > 0 ? '+' : '-'} ${displayMoney(Math.abs(safeToSpend.transferNet), showValues, currency)}`
            }
            tone={!safeToSpend || safeToSpend.transferNet === 0 ? 'neutral' : safeToSpend.transferNet > 0 ? 'income' : 'expense'}
          />
          <div className="mt-1 flex items-end justify-between gap-3 border-t border-[var(--border)] pt-2">
            <span className="text-sm font-bold">Disponível até {projectedDate}</span>
            <strong className={`text-xl font-extrabold ${safeToSpend && safeToSpend.safeToSpend < 0 ? 'text-[var(--expense)]' : 'text-[var(--income)]'}`}>
              {safeToSpend ? displayMoney(safeToSpend.safeToSpend, showValues, currency) : '—'}
            </strong>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-[var(--text-muted)]">
            Receitas futuras não são antecipadas; metas e dívidas só entram quando já viram compromisso concreto.
          </p>
        </div>
      )}

      <button
        type="button"
        onClick={onOpen}
        disabled={!enabled}
        aria-label="Ver projeção"
        className="mt-2 flex min-h-[54px] w-full items-center gap-3 rounded-[10px] border border-[var(--border-strong)] bg-[var(--surface-raised)] px-3 text-left disabled:opacity-50"
      >
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-[var(--orbit-primary)]">
          <FaCalendarAlt aria-hidden="true" />
        </span>
        <span className="min-w-0">
          <strong className="block text-xs font-semibold text-[var(--orbit-primary)]">
            {commitmentCount === 0
              ? 'Nenhum compromisso vencido ou nos próximos 10 dias.'
              : `${commitmentCount} compromisso${commitmentCount === 1 ? '' : 's'} exigindo atenção: vencidos ou nos próximos 10 dias.`}
          </strong>
          <span className="mt-1 block text-xs text-[var(--text-muted)]">Mantenha seu saldo em dia e evite imprevistos.</span>
        </span>
      </button>
    </article>
  );
}

export function ProjectionRow({ label, value, tone = 'neutral' }: { label: string; value: string; tone?: 'income' | 'expense' | 'neutral' }) {
  return (
    <div className="flex items-center justify-between gap-3 py-0.5">
      <span className="text-sm text-[var(--text-muted)]">{label}</span>
      <strong className={tone === 'income' ? 'text-[var(--income)]' : tone === 'expense' ? 'text-[var(--expense)]' : ''}>{value}</strong>
    </div>
  );
}

export function ForecastDialog({
  currency,
  initialData,
  onClose,
}: {
  currency: SupportedCurrency;
  initialData: ForecastData;
  onClose: () => void;
}) {
  return (
    <ModalShell
      variant="fullscreen-sheet"
      eyebrow="Próximos movimentos"
      title="Saldo projetado"
      description="Leitura dos lançamentos pendentes já cadastrados. O realizado não muda e nenhuma ocorrência é criada por esta visualização."
      closeLabel="Fechar projeção"
      maxWidthClass="sm:max-w-[920px]"
      onClose={onClose}
    >
      <ForecastPanel embedded initialCurrency={currency} initialData={initialData} />
    </ModalShell>
  );
}
