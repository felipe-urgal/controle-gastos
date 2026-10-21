'use client';

import Link from 'next/link';
import { FaArrowUp, FaBarcode, FaCalendarAlt, FaChartLine, FaChartPie, FaChevronDown, FaChevronRight, FaCreditCard, FaExchangeAlt, FaEye, FaBullseye, FaPlus } from 'react-icons/fa';
import { LocalFinancialAssistantCard } from '@/app/components/pages/dashboard/dashboard/local-financial-assistant-card';
import { Button, IconRenderer, Select } from '@/app/components/ui';
import { currencyOptions } from '@/app/lib/constants/account.constants';
import { formatCurrency } from '@/app/lib/currency/format-currency';
import { DashboardHome, DashboardNetWorthSummary, DashboardRecentTransaction, MonthlyDashboard } from '@/app/types/dashboard';
import { SupportedCurrency } from '@/app/types/financial-summary';
import { FinancialInsightsData } from '@/app/types/financial-insight';
import { ForecastData } from '@/app/types/forecast';
import { FinancialCommitment } from '@/app/types/financial-commitment';
import { commitmentBadge, compactMonthLabel, dashboardLogicalDateLabel, displayMoney, groupCommitments, monthLabel, signedMoney, transactionDateLabel } from '@/app/components/pages/dashboard/dashboard/dashboard-helpers';
import { FinancialInsightsCard, NetWorthSummaryCard } from '@/app/components/pages/dashboard/dashboard/insight-cards';
import { PlanningMetric } from '@/app/components/pages/dashboard/dashboard/desktop-cards';

/** Estado de erro padrão dos cards: mensagem + "Tentar novamente" quando houver retry. */
function CardError({ message, onRetry, tone = 'plain' }: { message: string; onRetry?: () => void; tone?: 'plain' | 'box' }) {
  return (
    <div className={`mt-3 space-y-2 ${tone === 'box' ? 'rounded-[10px] bg-[var(--danger-subtle)] p-3' : ''}`} role="alert">
      <p className="text-sm text-[var(--expense)]">{message}</p>
      {onRetry && (
        <Button type="button" size="sm" variant="outline" onClick={onRetry}>
          Tentar novamente
        </Button>
      )}
    </div>
  );
}

export function MobileDashboardHeader({
  periodValue,
  currency,
  loading,
  onPeriodChange,
  onCurrencyChange,
}: {
  periodValue: string;
  currency: SupportedCurrency;
  loading: boolean;
  onPeriodChange: (period: string) => void;
  onCurrencyChange: (currency: SupportedCurrency) => void;
}) {
  return (
    <section>
      <h1 className="sr-only">Dashboard financeiro</h1>
      <div className="grid grid-cols-[minmax(0,1fr)_116px] gap-2">
        <label className="relative flex min-h-11 cursor-pointer items-center gap-2.5 rounded-[11px] border border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-semibold focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[var(--focus)]">
          <FaCalendarAlt className="shrink-0 text-[var(--text-muted)]" aria-hidden="true" />
          <span className="min-w-0 flex-1 truncate">{monthLabel(periodValue)}</span>
          <FaChevronDown className="shrink-0 text-xs text-[var(--text-muted)]" aria-hidden="true" />
          <span className="sr-only">Escolher mês do dashboard</span>
          <input
            type="month"
            value={periodValue}
            min="2000-01"
            max="2100-12"
            onChange={(event) => event.currentTarget.value && onPeriodChange(event.currentTarget.value)}
            disabled={loading}
            className="absolute -inset-px cursor-pointer opacity-0"
          />
        </label>

        <div className="min-w-0">
          <Select
            ariaLabel="Moeda"
            value={currency}
            options={currencyOptions}
            onChange={(value) => onCurrencyChange(value as SupportedCurrency)}
            disabled={loading}
          />
        </div>
      </div>
    </section>
  );
}

export function MobileDashboardHome({
  home,
  showValues,
  forecast,
  commitments,
  recentTransactions,
  topCategories,
  netWorth,
  insights,
  onOpenForecast,
  onRetry,
}: {
  home: DashboardHome;
  onRetry?: () => void;
  showValues: boolean;
  onOpenForecast: () => void;
  forecast: {
    data: ForecastData | null;
    loading: boolean;
    error: string;
  };
  commitments: {
    data: import('@/app/types/financial-commitment').FinancialCommitmentsData | null;
    loading: boolean;
    error: string;
  };
  recentTransactions: {
    data: DashboardRecentTransaction[] | null;
    loading: boolean;
    error: string;
  };
  topCategories: MonthlyDashboard['categories'];
  netWorth: {
    data: DashboardNetWorthSummary | null;
    loading: boolean;
    error: string;
  };
  insights: {
    data: FinancialInsightsData | null;
    loading: boolean;
    error: string;
  };
}) {
  const data = home.monthly;
  const cashAccounts = home.current.cash.accounts;
  const availableNow = home.current.cash.total;
  const flowTotal = data.summary.income + data.summary.expense;
  const incomeWidth = flowTotal > 0 ? (data.summary.income / flowTotal) * 100 : 50;
  const expenseWidth = flowTotal > 0 ? (data.summary.expense / flowTotal) * 100 : 50;
  const hasPlanning =
    data.planning.budget > 0 ||
    data.planning.realized > 0 ||
    data.planning.committed > 0 ||
    data.planning.expectedIncome > 0;

  return (
    <div className="space-y-3">
      <MobileBalanceCard
        cashTotal={availableNow}
        cashAccounts={cashAccounts}
        asOf={home.scope.currentAsOf}
        showValues={showValues}
        summary={data.summary}
        currency={data.currency}
      />

      <MobileQuickActions />

      <MobileSafeToSpendCard
        safeToSpend={forecast.data?.safeToSpend ?? null}
        horizonEnd={forecast.data?.horizonEnd ?? null}
        showValues={showValues}
        currency={data.currency}
        loading={forecast.loading}
        error={forecast.error}
        onRetry={onRetry}
      />

      <Button
        type="button"
        variant="outline"
        fullWidth
        onClick={onOpenForecast}
        disabled={!forecast.data}
        icon={<FaChartLine aria-hidden="true" />}
      >
        Ver projeção
      </Button>

      {(data.cards.length > 0 || data.goals.length > 0 || hasPlanning) && (
        <details className="group rounded-[16px] border border-[var(--border)] bg-[var(--surface)]">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-[16px] px-4 text-sm font-semibold text-[var(--foreground)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)] [&::-webkit-details-marker]:hidden">
            <span>Ver mais: cartões, metas e planejamento</span>
            <FaChevronRight className="shrink-0 text-xs text-[var(--text-muted)] transition-transform group-open:rotate-90" aria-hidden="true" />
          </summary>
          <div className="space-y-3 px-3 pb-3">
            {data.cards.length > 0 && (
              <MobileCreditCardsCard
                cards={data.cards}
                showValues={showValues}
                currency={data.currency}
              />
            )}

            {data.goals.length > 0 && (
              <MobileFinancialGoalsCard
                goals={data.goals}
                showValues={showValues}
                currency={data.currency}
              />
            )}

            {hasPlanning && (
              <MobileMonthlyPlanningCard
                planning={data.planning}
                showValues={showValues}
                currency={data.currency}
              />
            )}
          </div>
        </details>
      )}

      <NetWorthSummaryCard
        currency={data.currency}
        showValues={showValues}
        summary={netWorth}
        period={data.period}
      />

      <FinancialInsightsCard
        insights={insights}
        showValues={showValues}
        currency={data.currency}
        compact
      />

      <LocalFinancialAssistantCard
        key={`mobile-${data.period.year}-${data.period.month}-${data.currency}`}
        dashboard={data}
        insights={insights.data}
        forecast={forecast.data}
        showValues={showValues}
        compact
        contextReady={Boolean(forecast.data) && Boolean(insights.data)}
      />

      <MobileUpcomingCard
        items={commitments.data?.items ?? []}
        asOf={home.scope.currentAsOf}
        showValues={showValues}
        currency={data.currency}
        loading={commitments.loading}
        error={commitments.error}
        onRetry={onRetry}
      />

      <MobileCategoriesCard
        categories={topCategories}
        showValues={showValues}
        currency={data.currency}
      />

      <MobileRecentTransactionsCard
        items={recentTransactions.data ?? []}
        loading={recentTransactions.loading}
        error={recentTransactions.error}
        onRetry={onRetry}
        showValues={showValues}
        currency={data.currency}
      />

      <div className="sr-only" aria-live="polite">
        Saldo realizado em {cashAccounts.length} conta{cashAccounts.length === 1 ? '' : 's'} corrente{cashAccounts.length === 1 ? '' : 's'}: {displayMoney(availableNow, showValues, data.currency)}.
        Receitas representam {incomeWidth.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}% do fluxo do mês selecionado e despesas {expenseWidth.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%.
      </div>
    </div>
  );
}

export function MobileSafeToSpendCard({
  safeToSpend,
  horizonEnd,
  showValues,
  currency,
  loading,
  error,
  onRetry,
}: {
  onRetry?: () => void;
  safeToSpend: ForecastData['safeToSpend'] | null;
  horizonEnd: ForecastData['horizonEnd'] | null;
  showValues: boolean;
  currency: string;
  loading: boolean;
  error: string;
}) {
  const horizonLabel = horizonEnd
    ? `${String(horizonEnd.day).padStart(2, '0')}/${String(horizonEnd.month).padStart(2, '0')}`
    : '30 dias';

  return (
    <section className="rounded-[16px] border border-[var(--border)] bg-[var(--surface)] p-4" aria-labelledby="mobile-safe-to-spend-title">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--orbit-primary)]">Próximos 30 dias</p>
          <h2 id="mobile-safe-to-spend-title" className="mt-1 text-sm font-bold">Disponível para gastar</h2>
        </div>
        <span className="text-xs text-[var(--text-muted)]">até {horizonLabel}</span>
      </div>

      {error ? (
        <CardError message={error} onRetry={onRetry} />
      ) : loading ? (
        <div className="mt-3 h-16 animate-pulse rounded-xl bg-[var(--skeleton)]" role="status" aria-label="Carregando disponível para gastar" />
      ) : safeToSpend ? (
        <>
          <strong className={`mt-2 block text-2xl font-black ${safeToSpend.safeToSpend < 0 ? 'text-[var(--expense)]' : 'text-[var(--foreground)]'}`}>
            {displayMoney(safeToSpend.safeToSpend, showValues, currency)}
          </strong>
          <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
            <div className="rounded-[10px] bg-[var(--surface-subtle)] p-2.5">
              <span className="block text-xs text-[var(--text-muted)]">Pendências</span>
              <strong className="mt-0.5 block text-base text-[var(--expense)]">
                {safeToSpend.pendingExpenses > 0 ? '- ' : ''}{displayMoney(safeToSpend.pendingExpenses, showValues, currency)}
              </strong>
            </div>
            <div className="rounded-[10px] bg-[var(--surface-subtle)] p-2.5">
              <span className="block text-xs text-[var(--text-muted)]">Faturas</span>
              <strong className="mt-0.5 block text-base text-[var(--expense)]">
                {safeToSpend.cardCommitments > 0 ? '- ' : ''}{displayMoney(safeToSpend.cardCommitments, showValues, currency)}
              </strong>
            </div>
          </div>
        </>
      ) : (
        <p className="mt-3 text-sm text-[var(--text-muted)]">Sem dados elegíveis nesta moeda.</p>
      )}
    </section>
  );
}

export function MobileBalanceCard({
  cashTotal,
  cashAccounts,
  asOf,
  showValues,
  summary,
  currency,
}: {
  cashTotal: number;
  cashAccounts: DashboardHome['current']['cash']['accounts'];
  asOf: DashboardHome['scope']['currentAsOf'];
  showValues: boolean;
  summary: MonthlyDashboard['summary'];
  currency: string;
}) {
  return (
    <section className="rounded-[18px] border border-[var(--border)] bg-[var(--surface)] p-4" aria-labelledby="mobile-balance-title">
      <p className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--orbit-primary)]">
        Hoje · {dashboardLogicalDateLabel(asOf)}
      </p>
      <p id="mobile-balance-title" className="mt-1 flex items-center gap-2 text-sm text-[var(--text-muted)]">
        Saldo realizado em contas correntes <FaEye className="text-xs" aria-hidden="true" />
      </p>

      <strong className={`mt-1 block text-4xl font-black leading-none tracking-tight ${cashTotal < 0 ? 'text-[var(--expense)]' : 'text-[var(--foreground)]'}`}>
        {displayMoney(cashTotal, showValues, currency)}
      </strong>

      <Link
        href="/contas"
        className="mt-4 flex min-h-11 items-center gap-3 rounded-[11px] border border-[var(--border)] bg-[var(--surface-raised)]/55 px-3 transition-colors hover:bg-[var(--surface-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]"
      >
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[8px] bg-[var(--orbit-primary)] text-[var(--orbit-on-primary)]">
          <IconRenderer iconName="wallet" size={14} />
        </span>
        <span className="min-w-0 flex-1">
          <strong className="block truncate text-sm">
            {cashAccounts.length === 0
              ? 'Nenhuma conta corrente ativa'
              : `${cashAccounts.length} ${cashAccounts.length === 1 ? 'conta corrente' : 'contas correntes'}`}
          </strong>
          <span className="mt-0.5 block truncate text-xs text-[var(--text-muted)]">
            Investimentos ficam no patrimônio e não entram neste saldo.
          </span>
        </span>
        <FaChevronRight className="shrink-0 text-xs text-[var(--text-muted)]" aria-hidden="true" />
      </Link>

      <dl className="mt-4 divide-y divide-[var(--border)] border-t border-[var(--border)]">
        <div className="flex min-h-11 items-center justify-between gap-3 py-2">
          <dt className="text-sm text-[var(--text-muted)]">Receitas do mês</dt>
          <dd className="tabular-nums text-base font-extrabold text-[var(--income)]">
            {displayMoney(summary.income, showValues, currency)}
          </dd>
        </div>
        <div className="flex min-h-11 items-center justify-between gap-3 py-2">
          <dt className="text-sm text-[var(--text-muted)]">Despesas do mês</dt>
          <dd className="tabular-nums text-base font-extrabold text-[var(--expense)]">
            {displayMoney(summary.expense, showValues, currency)}
          </dd>
        </div>
        <div className="flex min-h-11 items-center justify-between gap-3 py-2">
          <dt className="text-sm text-[var(--text-muted)]">Saldo do mês</dt>
          <dd className={`tabular-nums text-base font-extrabold ${summary.balance < 0 ? 'text-[var(--expense)]' : 'text-[var(--income)]'}`}>
            {signedMoney(summary.balance, showValues, currency)}
          </dd>
        </div>
      </dl>
    </section>
  );
}

export function MobileQuickActions() {
  const actions = [
    {
      href: '/transacoes/nova?type=expense',
      label: 'Nova transação',
      icon: <FaPlus aria-hidden="true" />,
      primary: true,
    },
    {
      href: '/transacoes/nova?mode=transfer',
      label: 'Transferir',
      icon: <FaExchangeAlt aria-hidden="true" />,
      primary: false,
    },
    {
      href: '/transacoes/nova?type=expense',
      label: 'Pagar',
      icon: <FaBarcode aria-hidden="true" />,
      primary: false,
    },
    {
      href: '/transacoes/nova?type=income',
      label: 'Adicionar',
      icon: <FaArrowUp aria-hidden="true" />,
      primary: false,
    },
  ];

  return (
    <section className="grid grid-cols-2 gap-2" aria-label="Ações rápidas">
      {actions.map((action) => (
        <Link
          key={action.label}
          href={action.href}
          className={`flex min-h-[62px] items-center gap-3 rounded-[12px] border px-3 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)] ${
            action.primary
              ? 'border-[var(--orbit-primary)] bg-[var(--orbit-primary)] text-[var(--orbit-on-primary)]'
              : 'border-[var(--border-strong)] bg-[var(--surface)] text-[var(--foreground)]'
          }`}
        >
          <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${
            action.primary
              ? 'bg-white/90 text-[var(--orbit-primary)]'
              : 'bg-[var(--surface-raised)] text-[var(--foreground)]'
          }`}>
            {action.icon}
          </span>
          <span className="min-w-0 flex-1 leading-tight">{action.label}</span>
          <FaChevronRight className="hidden shrink-0 text-xs opacity-70 min-[360px]:block" aria-hidden="true" />
        </Link>
      ))}
    </section>
  );
}

export function MobileUpcomingCard({
  items,
  asOf,
  showValues,
  currency,
  loading,
  error,
  onRetry,
}: {
  onRetry?: () => void;
  items: FinancialCommitment[];
  asOf: DashboardHome['scope']['currentAsOf'];
  showValues: boolean;
  currency: string;
  loading: boolean;
  error: string;
}) {
  return (
    <article className="rounded-[16px] border border-[var(--border)] bg-[var(--surface)] p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-base font-bold">
          <FaCalendarAlt className="text-[var(--orbit-primary)]" aria-hidden="true" />
          Compromissos · hoje
        </h2>
        <Link href="/compromissos" className="inline-flex min-h-11 items-center px-2 -mx-2 text-sm font-semibold text-[var(--orbit-primary)]">Ver todos</Link>
      </div>

      {loading ? (
        <div className="mt-3 h-16 animate-pulse rounded-[10px] bg-[var(--skeleton)]" role="status" aria-label="Carregando compromissos" />
      ) : error ? (
        <CardError message={error} onRetry={onRetry} tone="box" />
      ) : items.length === 0 ? (
        <div className="mt-3 flex items-center gap-3 rounded-[12px] bg-[var(--surface-raised)]/45 p-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[var(--surface-subtle)] text-[var(--text-subtle)]">
            <FaCalendarAlt aria-hidden="true" />
          </span>
          <div>
            <p className="text-sm font-semibold">Nenhum compromisso conhecido</p>
            <p className="mt-0.5 text-xs leading-relaxed text-[var(--text-muted)]">Sem pendências vencidas ou próximas neste horizonte.</p>
          </div>
        </div>
      ) : (
        <div className="mt-3 space-y-3">
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
                  <Link
                    key={item.id}
                    href={item.href}
                    className="grid min-h-[54px] grid-cols-[42px_minmax(0,1fr)_auto] items-center gap-3 py-2"
                  >
                    <span className="grid h-10 w-10 place-content-center rounded-[9px] border border-[var(--border)] text-center">
                      <strong className="text-xs leading-none">{String(item.date.day).padStart(2, '0')}</strong>
                      <span className="mt-1 text-xs uppercase leading-none text-[var(--text-muted)]">{compactMonthLabel(item.date.month, item.date.year)}</span>
                    </span>
                    <span className="min-w-0">
                      <strong className="block truncate text-sm">{item.title}</strong>
                      <span className="mt-1 block text-sm text-[var(--text-muted)]">
                        {item.amount === null ? 'Marco sem valor financeiro' : displayMoney(item.amount, showValues, currency)}
                      </span>
                    </span>
                    <span className={`rounded-full px-2 py-1 text-xs font-semibold ${item.state === 'OVERDUE' ? 'bg-[var(--danger-subtle)] text-[var(--expense)]' : 'bg-[var(--orbit-primary-subtle)] text-[var(--orbit-primary)]'}`}>
                      {item.state === 'OVERDUE' ? 'Vencido' : commitmentBadge(item.date, asOf)}
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </article>
  );
}

export function MobileCategoriesCard({
  categories,
  showValues,
  currency,
}: {
  categories: MonthlyDashboard['categories'];
  showValues: boolean;
  currency: string;
}) {
  return (
    <article className="rounded-[16px] border border-[var(--border)] bg-[var(--surface)] p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-bold">Principais categorias de gastos</h2>
        <Link href="/categorias" className="inline-flex min-h-11 items-center px-2 -mx-2 text-sm font-semibold text-[var(--orbit-primary)]">Ver todas</Link>
      </div>

      <div className="mt-2 divide-y divide-[var(--border)]">
        {categories.length === 0 ? (
          <p className="py-4 text-sm text-[var(--text-muted)]">Nenhuma despesa categorizada neste período.</p>
        ) : (
          categories.slice(0, 5).map((category) => (
            <Link
              key={category.id}
              href={`/categorias/show/${encodeURIComponent(category.id)}`}
              className="grid min-h-11 grid-cols-[minmax(0,1fr)_auto_12px] items-center gap-2 py-1.5"
            >
              <span className="flex min-w-0 items-center gap-2.5">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-white" style={{ backgroundColor: category.color }}>
                  <IconRenderer iconName={category.icon || 'tag'} size={13} />
                </span>
                <span className="truncate text-sm font-semibold">{category.name}</span>
              </span>
              <strong className="text-right text-sm">{displayMoney(category.realized, showValues, currency)}</strong>
              <FaChevronRight className="text-xs text-[var(--text-muted)]" aria-hidden="true" />
            </Link>
          ))
        )}
      </div>
    </article>
  );
}

export function MobileRecentTransactionsCard({
  items,
  loading,
  error,
  onRetry,
  showValues,
  currency,
}: {
  onRetry?: () => void;
  items: DashboardRecentTransaction[];
  loading: boolean;
  error: string;
  showValues: boolean;
  currency: string;
}) {
  return (
    <article className="rounded-[16px] border border-[var(--border)] bg-[var(--surface)] p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-bold">Últimas transações do mês</h2>
        <Link href="/transacoes" className="inline-flex min-h-11 items-center px-2 -mx-2 text-sm font-semibold text-[var(--orbit-primary)]">Ver todas</Link>
      </div>

      <div className="mt-2 divide-y divide-[var(--border)]">
        {loading ? (
          <div className="space-y-2 py-2" role="status" aria-label="Carregando transações recentes">
            {[1, 2, 3, 4].map((item) => <div key={item} className="h-10 animate-pulse rounded-lg bg-[var(--skeleton)]" />)}
          </div>
        ) : error ? (
          <CardError message={error} onRetry={onRetry} />
        ) : items.length === 0 ? (
          <p className="py-4 text-sm text-[var(--text-muted)]">Nenhuma transação encontrada neste mês.</p>
        ) : (
          items.slice(0, 4).map((transaction) => {
            const isIncome = transaction.type === 'INCOME';
            const isTransfer = transaction.kind === 'TRANSFER';
            const isCardPayment = transaction.kind === 'CARD_PAYMENT';
            const tone = isTransfer || isCardPayment ? 'text-[var(--orbit-primary)]' : isIncome ? 'text-[var(--income)]' : 'text-[var(--expense)]';
            const statusLabel = transaction.status === 'COMPLETED' ? null : transaction.status === 'PENDING' ? 'Pendente' : 'Cancelada';

            return (
              <Link
                key={transaction.id}
                href={`/transacoes/show/${transaction.id}`}
                className="grid min-h-11 grid-cols-[minmax(0,1fr)_auto_12px] items-center gap-2 py-1.5"
              >
                <span className="flex min-w-0 items-center gap-2.5">
                  <span
                    className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-white ${isTransfer ? 'bg-[var(--orbit-primary)]' : isIncome ? 'bg-[var(--income)]' : ''}`}
                    style={!isTransfer && !isIncome && transaction.category ? { backgroundColor: transaction.category.color } : undefined}
                  >
                    {isTransfer || isCardPayment ? <FaExchangeAlt size={12} aria-hidden="true" /> : <IconRenderer iconName={transaction.category?.icon || (isIncome ? 'income-up' : 'tag')} size={12} />}
                  </span>
                  <span className="min-w-0">
                    <strong className="block truncate text-sm">{transaction.description}</strong>
                    <span className="mt-0.5 block truncate text-xs text-[var(--text-muted)]">
                      {transactionDateLabel(transaction)}
                      {isTransfer && transaction.counterpartAccount ? ` · para ${transaction.counterpartAccount.name}` : ''}
                      {isCardPayment ? ' · Pagamento de fatura' : ''}
                      {statusLabel ? ` · ${statusLabel}` : ''}
                    </span>
                  </span>
                </span>
                <strong className={`shrink-0 text-sm ${tone}`}>
                  {showValues ? `${isIncome ? '+' : isTransfer || isCardPayment ? '' : '-'} ${formatCurrency(transaction.amount, currency)}` : '••••'}
                </strong>
                <FaChevronRight className="text-xs text-[var(--text-muted)]" aria-hidden="true" />
              </Link>
            );
          })
        )}
      </div>
    </article>
  );
}

export function MobileMonthlyPlanningCard({
  planning,
  showValues,
  currency,
}: {
  planning: MonthlyDashboard['planning'];
  showValues: boolean;
  currency: string;
}) {
  return (
    <Link
      href="/categorias"
      className="block rounded-[16px] border border-[var(--border)] bg-[var(--surface)] p-4"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-base font-bold">
          <FaChartPie className="text-[var(--orbit-primary)]" aria-hidden="true" />
          Planejamento
        </h2>
        <FaChevronRight className="text-xs text-[var(--text-muted)]" aria-hidden="true" />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
        <PlanningMetric label="Orçamento" value={displayMoney(planning.budget, showValues, currency)} />
        <PlanningMetric
          label="Disponível"
          value={displayMoney(planning.available, showValues, currency)}
          danger={planning.available < 0}
        />
        <PlanningMetric label="Realizado" value={displayMoney(planning.realized, showValues, currency)} />
        <PlanningMetric label="Comprometido" value={displayMoney(planning.committed, showValues, currency)} />
      </div>

      {planning.overBudgetCategories > 0 && (
        <p className="mt-3 text-xs font-semibold text-[var(--expense)]">
          {planning.overBudgetCategories} categoria{planning.overBudgetCategories === 1 ? '' : 's'} acima do orçamento
        </p>
      )}
    </Link>
  );
}

export function MobileFinancialGoalsCard({
  goals,
  showValues,
  currency,
}: {
  goals: MonthlyDashboard['goals'];
  showValues: boolean;
  currency: string;
}) {
  return (
    <article className="rounded-[16px] border border-[var(--border)] bg-[var(--surface)] p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-base font-bold">
          <FaBullseye className="text-[var(--orbit-primary)]" aria-hidden="true" />
          Metas
        </h2>
        <Link href="/metas" className="inline-flex min-h-11 items-center px-2 -mx-2 text-sm font-semibold text-[var(--orbit-primary)]">
          Ver todas
        </Link>
      </div>

      <div className="mt-2 divide-y divide-[var(--border)]">
        {goals.slice(0, 3).map((goal) => (
          <Link
            key={goal.id}
            href={`/metas#goal-${encodeURIComponent(goal.id)}`}
            className="grid min-h-[66px] grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-2"
          >
            <span className="min-w-0">
              <strong className="block truncate text-sm">{goal.name}</strong>
              <span className="mt-1 block text-xs text-[var(--text-muted)]">
                {displayMoney(goal.currentAmount, showValues, currency)} de {displayMoney(goal.targetAmount, showValues, currency)}
              </span>
            </span>
            <span className="text-right">
              <strong className="block text-sm text-[var(--orbit-primary)]">
                {goal.percentage.toLocaleString('pt-BR')}%
              </strong>
              <span className="mt-1 block text-xs text-[var(--text-muted)]">
                falta {displayMoney(goal.remainingAmount, showValues, currency)}
              </span>
            </span>
          </Link>
        ))}
      </div>
    </article>
  );
}

export function MobileCreditCardsCard({
  cards,
  showValues,
  currency,
}: {
  cards: MonthlyDashboard['cards'];
  showValues: boolean;
  currency: string;
}) {
  return (
    <article className="rounded-[16px] border border-[var(--border)] bg-[var(--surface)] p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-base font-bold">
          <FaCreditCard className="text-[var(--orbit-primary)]" aria-hidden="true" />
          Cartões
        </h2>
        <Link href="/contas" className="inline-flex min-h-11 items-center px-2 -mx-2 text-sm font-semibold text-[var(--orbit-primary)]">
          Ver todos
        </Link>
      </div>

      <div className="mt-2 divide-y divide-[var(--border)]">
        {cards.slice(0, 3).map((card) => (
          <Link
            key={card.id}
            href={`/contas/show/${card.id}`}
            className="grid min-h-[66px] grid-cols-[38px_minmax(0,1fr)_auto] items-center gap-3 py-2"
          >
            <span
              className="grid h-9 w-9 place-items-center rounded-[9px] text-white"
              style={{ backgroundColor: card.color }}
              aria-hidden="true"
            >
              <IconRenderer iconName={card.icon || 'credit-card'} size={15} />
            </span>
            <span className="min-w-0">
              <strong className="block truncate text-sm">{card.name}</strong>
              <span className="mt-1 block truncate text-xs text-[var(--text-muted)]">
                Disponível {displayMoney(card.availableLimit, showValues, currency)}
              </span>
            </span>
            <span className="text-right">
              <strong className="block text-sm text-[var(--foreground)]">
                {card.nextStatement
                  ? displayMoney(card.nextStatement.amount, showValues, currency)
                  : 'Sem fatura'}
              </strong>
              {card.nextStatement && (
                <span className="mt-1 block text-xs text-[var(--text-muted)]">
                  vence {dashboardLogicalDateLabel(card.nextStatement.dueDate)}
                </span>
              )}
            </span>
          </Link>
        ))}
      </div>
    </article>
  );
}
