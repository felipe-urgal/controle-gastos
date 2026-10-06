'use client';

import Link from 'next/link';
import { useEffect, useState, type ReactNode } from 'react';
import {
  FaArrowDown,
  FaArrowRight,
  FaArrowUp,
  FaBarcode,
  FaCalendarAlt,
  FaChartLine,
  FaChartPie,
  FaChevronDown,
  FaChevronLeft,
  FaChevronRight,
  FaCreditCard,
  FaExchangeAlt,
  FaEye,
  FaBullseye,
  FaPlus,
  FaQuestionCircle,
  FaSyncAlt,
  FaTimes,
} from 'react-icons/fa';

import { ProtectedRoute } from '@/app/components/layout';
import ForecastPanel from '@/app/components/pages/dashboard/forecast';
import { LocalFinancialAssistantCard } from '@/app/components/pages/dashboard/dashboard/local-financial-assistant-card';
import { PeriodicSummaryCard } from '@/app/components/pages/dashboard/dashboard/periodic-summary-card';
import { IconRenderer, Select } from '@/app/components/ui';
import { useAuth } from '@/app/context';
import { useDashboardHome } from '@/app/hooks/dashboard/use-dashboard-home';
import { usePeriodicSummary } from '@/app/hooks/dashboard/use-periodic-summary';
import { useModalFocus } from '@/app/hooks/use-modal-focus';
import { currencyOptions } from '@/app/lib/constants/account.constants';
import { formatCurrency } from '@/app/lib/currency/format-currency';
import type {
  DashboardHome,
  DashboardNetWorthSummary,
  DashboardRecentTransaction,
  DashboardSection,
  MonthlyDashboard,
} from '@/app/types/dashboard';
import type { SupportedCurrency } from '@/app/types/financial-summary';
import type { FinancialInsight, FinancialInsightsData } from '@/app/types/financial-insight';
import type { ForecastData } from '@/app/types/forecast';
import type { FinancialCommitment } from '@/app/types/financial-commitment';

function displayMoney(amount: number, showValues: boolean, currency: string) {
  return showValues ? formatCurrency(amount, currency) : '••••';
}

function signedMoney(amount: number, showValues: boolean, currency: string) {
  if (!showValues) return '••••';
  const sign = amount > 0 ? '+' : amount < 0 ? '-' : '';
  return `${sign}${formatCurrency(Math.abs(amount), currency)}`;
}

function periodOffset(periodValue: string, offset: number) {
  const [year, month] = periodValue.split('-').map(Number);
  const date = new Date(year, month - 1 + offset, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(periodValue: string) {
  const [year, month] = periodValue.split('-').map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
  });
}

function compactMonthLabel(month: number, year: number) {
  return new Date(year, month - 1, 1)
    .toLocaleDateString('pt-BR', { month: 'short' })
    .replace('.', '');
}

function dashboardLogicalDateLabel(date: { year: number; month: number; day: number }) {
  return `${String(date.day).padStart(2, '0')}/${String(date.month).padStart(2, '0')}`;
}

function transactionDateLabel(transaction: DashboardRecentTransaction) {
  return new Date(
    Date.UTC(transaction.year, transaction.month - 1, transaction.day),
  )
    .toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      timeZone: 'UTC',
    })
    .replace('.', '');
}

function currentDateLabel() {
  return new Date()
    .toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    })
    .toUpperCase();
}

function logicalDateDistance(
  item: { year: number; month: number; day: number },
  asOf: { year: number; month: number; day: number },
) {
  const itemTime = Date.UTC(item.year, item.month - 1, item.day);
  const asOfTime = Date.UTC(asOf.year, asOf.month - 1, asOf.day);
  return Math.round((itemTime - asOfTime) / 86_400_000);
}

function commitmentBadge(
  item: { year: number; month: number; day: number },
  asOf: { year: number; month: number; day: number } | null,
) {
  if (!asOf) return '';
  const distance = logicalDateDistance(item, asOf);
  if (distance < 0) return 'Vencido';
  if (distance === 0) return 'Hoje';
  if (distance === 1) return 'Em 1 dia';
  return `Em ${distance} dias`;
}

function accountTypeLabel(type: MonthlyDashboard['accounts'][number]['type']) {
  return type === 'INVESTMENT' ? 'Investimentos' : 'Conta corrente';
}

function ComparisonDetail({
  percentage,
  previousMonth,
  previousYear,
  tone = 'neutral',
}: {
  percentage: number | null;
  previousMonth: number;
  previousYear: number;
  tone?: 'income' | 'expense' | 'neutral';
}) {
  if (percentage === null) {
    return <span className="text-[var(--text-muted)]">sem base anterior</span>;
  }

  const sign = percentage > 0 ? '+' : '';
  const toneClass =
    tone === 'income'
      ? 'text-[var(--income)]'
      : tone === 'expense'
        ? 'text-[var(--expense)]'
        : 'text-[var(--text-muted)]';

  return (
    <>
      <span className={toneClass}>{sign}{percentage.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%</span>
      <span className="text-[var(--text-muted)]"> vs. {compactMonthLabel(previousMonth, previousYear)}</span>
    </>
  );
}

export default function OrbitDashboardV2() {
  const { user } = useAuth();
  const showValues = user?.showValues !== false;
  const {
    data,
    loading,
    error,
    periodValue,
    currency,
    setPeriodValue,
    setCurrency,
    retry,
  } = useDashboardHome();

  return (
    <ProtectedRoute>
      <header className="hidden flex-col gap-4 lg:flex lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p suppressHydrationWarning className="min-h-4 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">{currentDateLabel()}</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-[var(--foreground)] min-[901px]:text-[32px]">Seu dinheiro, no seu controle</h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">Acompanhe o mês selecionado sem misturar com o estado financeiro de hoje.</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setPeriodValue(periodOffset(periodValue, -1))}
            disabled={loading}
            aria-label="Mês anterior"
            className="grid min-h-11 min-w-11 place-items-center rounded-[10px] border border-[var(--border)] bg-[var(--surface)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)] disabled:opacity-50"
          >
            <FaChevronLeft aria-hidden="true" />
          </button>
          <label className="relative min-h-11 min-w-[180px] cursor-pointer rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-3 py-3 text-center text-sm font-semibold capitalize focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[var(--focus)]">
            {monthLabel(periodValue)}
            <span className="sr-only">Escolher mês do dashboard</span>
            <input
              type="month"
              value={periodValue}
              min="2000-01"
              max="2100-12"
              onChange={(event) => event.currentTarget.value && setPeriodValue(event.currentTarget.value)}
              disabled={loading}
              className="absolute inset-0 cursor-pointer opacity-0"
            />
          </label>
          <button
            type="button"
            onClick={() => setPeriodValue(periodOffset(periodValue, 1))}
            disabled={loading}
            aria-label="Próximo mês"
            className="grid min-h-11 min-w-11 place-items-center rounded-[10px] border border-[var(--border)] bg-[var(--surface)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)] disabled:opacity-50"
          >
            <FaChevronRight aria-hidden="true" />
          </button>
          <div className="w-[145px] max-[520px]:w-full">
            <Select
              ariaLabel="Moeda"
              value={currency}
              options={currencyOptions}
              onChange={(value) => setCurrency(value as SupportedCurrency)}
              disabled={loading}
            />
          </div>
        </div>
      </header>

      <MobileDashboardHeader
        periodValue={periodValue}
        currency={currency}
        loading={loading}
        onPeriodChange={setPeriodValue}
        onCurrencyChange={setCurrency}
      />

      {error && (
        <div role="alert" className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--expense)]/35 bg-[var(--danger-subtle)] p-3">
          <p className="text-sm text-[var(--expense)]">{error}</p>
          <button type="button" onClick={retry} className="min-h-10 rounded-[10px] border border-[var(--border)] px-3 text-sm font-semibold">
            Tentar novamente
          </button>
        </div>
      )}

      <div className="mt-4">
        {loading ? (
          <DashboardLoading />
        ) : data ? (
          <DashboardHome
            home={data}
            showValues={showValues}
            periodicSummaryEnabled={user?.periodicSummaryEnabled === true}
          />
        ) : null}
      </div>
    </ProtectedRoute>
  );
}

function sectionState<T>(section: DashboardSection<T>) {
  return section.status === 'SUCCESS'
    ? { data: section.data, loading: false, error: '' }
    : { data: null, loading: false, error: section.message };
}

function commitmentCountWithinTenDays(
  items: readonly FinancialCommitment[],
  asOf: { year: number; month: number; day: number },
) {
  return items.filter((item) => {
    if (item.state === 'OVERDUE') return true;
    const distance = logicalDateDistance(item.date, asOf);
    return distance >= 0 && distance <= 10;
  }).length;
}

function DashboardHome({
  home,
  showValues,
  periodicSummaryEnabled,
}: {
  home: DashboardHome;
  showValues: boolean;
  periodicSummaryEnabled: boolean;
}) {
  const [forecastOpen, setForecastOpen] = useState(false);
  const data = home.monthly;
  const forecast = sectionState(home.current.forecast);
  const commitments = sectionState(home.current.commitments);
  const recentTransactions = sectionState(home.recentTransactions);
  const netWorth = sectionState(home.netWorth);
  const insights = sectionState(home.insights);
  const periodicSummary = usePeriodicSummary(
    data.currency,
    periodicSummaryEnabled,
  );
  const cashAccounts = home.current.cash.accounts;
  const availableNow = home.current.cash.total;
  const topCategories = [...data.categories]
    .filter((category) => category.realized > 0)
    .sort((left, right) => right.realized - left.realized)
    .slice(0, 5);
  const commitmentItems = commitments.data?.items ?? [];
  const tenDayCommitmentCount = commitmentCountWithinTenDays(
    commitmentItems,
    home.scope.currentAsOf,
  );
  const flowTotal = data.summary.income + data.summary.expense;
  const incomeWidth = flowTotal > 0 ? (data.summary.income / flowTotal) * 100 : 50;
  const expenseWidth = flowTotal > 0 ? (data.summary.expense / flowTotal) * 100 : 50;

  return (
    <>
      {home.scope.selectedPeriodRelation !== 'CURRENT' && (
        <div role="status" className="mb-[14px] rounded-[12px] border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 text-xs text-[var(--text-muted)]">
          <strong className="text-[var(--foreground)]">Mês selecionado: {monthLabel(`${data.period.year}-${String(data.period.month).padStart(2, '0')}`)}.</strong>{' '}
          Resumo, planejamento, categorias e patrimônio usam esse período; saldo atual, compromissos e projeção usam a referência de hoje ({dashboardLogicalDateLabel(home.scope.currentAsOf)}).
        </div>
      )}

      <div className="lg:hidden">
        <MobileDashboardHome
          home={home}
          showValues={showValues}
          forecast={forecast}
          commitments={commitments}
          recentTransactions={recentTransactions}
          topCategories={topCategories}
          netWorth={netWorth}
          insights={insights}
        />
      </div>

      <div className="hidden lg:block">
        <section className="grid gap-[14px] xl:grid-cols-[1.95fr_1fr_1.22fr]">
          <CurrentCashCard
            accounts={cashAccounts}
            total={availableNow}
            showValues={showValues}
            currency={data.currency}
            asOf={home.scope.currentAsOf}
          />
          <AccountsCard accounts={cashAccounts} total={availableNow} showValues={showValues} currency={data.currency} />
          <UpcomingCard
            items={commitmentItems}
            asOf={home.scope.currentAsOf}
            showValues={showValues}
            currency={data.currency}
            loading={commitments.loading}
            error={commitments.error}
          />
        </section>

        {data.cards.length > 0 && (
          <div className="mt-[14px]">
            <CreditCardsCard
              cards={data.cards}
              showValues={showValues}
              currency={data.currency}
            />
          </div>
        )}

        {data.goals.length > 0 && (
          <div className="mt-[14px]">
            <FinancialGoalsCard
              goals={data.goals}
              showValues={showValues}
              currency={data.currency}
            />
          </div>
        )}

        {(data.planning.budget > 0 ||
          data.planning.realized > 0 ||
          data.planning.committed > 0 ||
          data.planning.expectedIncome > 0) && (
          <div className="mt-[14px]">
            <MonthlyPlanningCard
              planning={data.planning}
              showValues={showValues}
              currency={data.currency}
            />
          </div>
        )}

        <div className="mt-[14px]">
          <NetWorthSummaryCard
            currency={data.currency}
            showValues={showValues}
            summary={netWorth}
            period={data.period}
          />
        </div>

        <div className="mt-[14px]">
          <FinancialInsightsCard
            insights={insights}
            showValues={showValues}
            currency={data.currency}
          />
        </div>

        <div className="mt-[14px]">
          <LocalFinancialAssistantCard
            key={`${data.period.year}-${data.period.month}-${data.currency}`}
            dashboard={data}
            insights={insights.data}
            forecast={forecast.data}
            showValues={showValues}
          />
        </div>

        <section className="mt-[14px] grid gap-[14px] xl:grid-cols-[1.15fr_1fr]">
          <MonthOverviewCard
            data={data}
            showValues={showValues}
            incomeWidth={incomeWidth}
            expenseWidth={expenseWidth}
          />
          <CategoriesCard categories={topCategories} showValues={showValues} currency={data.currency} period={data.period} />
        </section>

        <section className="mt-[14px] grid gap-[14px] xl:grid-cols-[1.36fr_1fr]">
          <RecentTransactionsCard
            items={recentTransactions.data ?? []}
            loading={recentTransactions.loading}
            error={recentTransactions.error}
            showValues={showValues}
            currency={data.currency}
          />
          <ProjectedBalanceCard
            safeToSpend={forecast.data?.safeToSpend ?? null}
            showValues={showValues}
            currency={data.currency}
            loading={forecast.loading}
            error={forecast.error}
            commitmentCount={tenDayCommitmentCount}
            horizonEnd={forecast.data?.horizonEnd ?? null}
            onOpen={() => setForecastOpen(true)}
            enabled={Boolean(forecast.data) && !forecast.loading}
          />
        </section>
      </div>

      {periodicSummaryEnabled && (
        <div className="mt-[14px]">
          <PeriodicSummaryCard
            state={periodicSummary.data}
            loading={periodicSummary.loading}
            error={periodicSummary.error}
            showValues={showValues}
          />
        </div>
      )}

      {forecastOpen && forecast.data && (
        <ForecastDialog
          currency={data.currency}
          initialData={forecast.data}
          onClose={() => setForecastOpen(false)}
        />
      )}
    </>
  );
}

function NetWorthSummaryCard({
  currency,
  showValues,
  summary,
  period,
}: {
  currency: SupportedCurrency;
  showValues: boolean;
  summary: {
    data: DashboardNetWorthSummary | null;
    loading: boolean;
    error: string;
  };
  period: MonthlyDashboard['period'];
}) {
  const value = summary.loading
    ? 'Carregando…'
    : summary.error
      ? 'Indisponível'
      : summary.data?.total === null || summary.data?.total === undefined
        ? 'Sem saldo realizado'
        : displayMoney(summary.data.total, showValues, currency);

  return (
    <Link
      href="/patrimonio"
      className="flex min-h-[88px] items-center justify-between gap-4 rounded-[18px] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-surface)] transition hover:border-[var(--orbit-primary)]/45 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)] sm:p-5"
      aria-label="Ver patrimônio"
    >
      <span className="min-w-0">
        <span className="block text-xs font-bold uppercase tracking-[0.08em] text-[var(--text-muted)]">
          Patrimônio no fim de {compactMonthLabel(period.month, period.year)} · {currency}
        </span>
        <strong className={`mt-1 block truncate text-xl font-extrabold ${summary.error ? 'text-[var(--expense)]' : 'text-[var(--foreground)]'}`}>
          {value}
        </strong>
        <span className="mt-1 block text-xs text-[var(--text-muted)]">
          {summary.loading
            ? 'Atualizando resumo'
            : summary.error
              ? summary.error
              : (summary.data?.accountCount ?? 0) === 0
                ? 'Nenhuma conta elegível com saldo realizado'
                : `${summary.data?.accountCount} ${summary.data?.accountCount === 1 ? 'conta elegível' : 'contas elegíveis'}`}
        </span>
      </span>
      <span className="flex shrink-0 items-center gap-2 text-sm font-bold text-[var(--orbit-primary)]">
        Ver patrimônio
        <FaArrowRight aria-hidden="true" />
      </span>
    </Link>
  );
}

function insightIcon(type: FinancialInsight['type']) {
  if (type === 'CATEGORY_BUDGET') return FaChartPie;
  if (type === 'UPCOMING_PENDING') return FaCalendarAlt;
  if (
    type === 'RECURRING_SHARE' ||
    type === 'SUBSCRIPTION_PRICE_CHANGE' ||
    type === 'POSSIBLE_SUBSCRIPTION'
  ) {
    return FaSyncAlt;
  }
  if (type === 'INCOME_CHANGE') return FaArrowDown;
  if (type === 'GOAL_DELAYED') return FaBullseye;
  return FaChartLine;
}

function insightDetail(
  insight: FinancialInsight,
  showValues: boolean,
  currency: SupportedCurrency,
) {
  if (insight.type === 'CATEGORY_BUDGET') {
    return `${displayMoney(insight.data.consumption, showValues, currency)} de ${displayMoney(insight.data.budget, showValues, currency)}`;
  }

  if (insight.type === 'UPCOMING_PENDING') {
    return `${displayMoney(insight.data.amount, showValues, currency)} até ${dashboardLogicalDateLabel(insight.data.through)}`;
  }

  if (insight.type === 'RECURRING_SHARE') {
    return `${displayMoney(insight.data.monthlyEquivalent, showValues, currency)} equivalente mensal`;
  }

  if (insight.type === 'SPENDING_ANOMALY') {
    return `${displayMoney(insight.data.currentAmount, showValues, currency)} vs. mediana de ${displayMoney(insight.data.baselineMedian, showValues, currency)}`;
  }

  if (insight.type === 'SAFE_TO_SPEND') {
    return `${displayMoney(insight.data.safeToSpend, showValues, currency)} disponíveis em 30 dias`;
  }

  if (insight.type === 'SUBSCRIPTION_PRICE_CHANGE') {
    return `${displayMoney(insight.data.previousAmount, showValues, currency)} → ${displayMoney(insight.data.currentAmount, showValues, currency)}`;
  }

  if (insight.type === 'POSSIBLE_SUBSCRIPTION') {
    return `${displayMoney(insight.data.monthlyEquivalent, showValues, currency)}/mês · ${insight.data.occurrenceCount} ocorrências`;
  }

  if (insight.type === 'INCOME_CHANGE') {
    return `${displayMoney(insight.data.currentIncome, showValues, currency)} vs. ${displayMoney(insight.data.previousIncome, showValues, currency)} no período anterior`;
  }

  if (insight.type === 'GOAL_DELAYED') {
    return `${displayMoney(insight.data.currentAmount, showValues, currency)} de ${displayMoney(insight.data.targetAmount, showValues, currency)}`;
  }

  return `${signedMoney(insight.data.difference, showValues, currency)} em 30 dias`;
}

function FinancialInsightsCard({
  insights,
  showValues,
  currency,
  compact = false,
}: {
  insights: {
    data: FinancialInsightsData | null;
    loading: boolean;
    error: string;
  };
  showValues: boolean;
  currency: SupportedCurrency;
  compact?: boolean;
}) {
  const items = insights.data?.items ?? [];

  if (!insights.loading && !insights.error && items.length === 0) {
    return null;
  }

  return (
    <section
      className={`border border-[var(--border)] bg-[var(--surface)] ${compact ? 'rounded-[16px] p-4' : 'rounded-[14px] p-[14px] sm:p-5'}`}
      aria-labelledby={compact ? 'mobile-insights-title' : 'desktop-insights-title'}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2
            id={compact ? 'mobile-insights-title' : 'desktop-insights-title'}
            className={compact ? 'text-base font-bold' : 'text-lg font-bold'}
          >
            Insights do período
          </h2>
          <p className="mt-0.5 text-xs text-[var(--text-muted)]">
            Cálculos determinísticos com base nos seus dados.
          </p>
        </div>
        <span className="rounded-full border border-[var(--border)] px-2 py-1 text-[10px] font-semibold text-[var(--text-muted)]">
          {currency}
        </span>
      </div>

      {insights.loading ? (
        <div className="mt-3 grid gap-2 sm:grid-cols-2" role="status" aria-label="Carregando insights financeiros">
          {[1, 2].map((item) => (
            <div key={item} className="h-16 animate-pulse rounded-[11px] bg-[var(--skeleton)]" />
          ))}
        </div>
      ) : insights.error ? (
        <p className="mt-3 text-sm text-[var(--text-muted)]">
          Não foi possível carregar os insights deste período.
        </p>
      ) : (
        <div className={`mt-3 grid gap-2 ${compact ? '' : 'sm:grid-cols-2'}`}>
          {items.map((insight) => {
            const Icon = insightIcon(insight.type);
            const content = (
              <>
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[9px] bg-[var(--orbit-primary-subtle)] text-[var(--orbit-primary)]">
                  <Icon aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <strong className="block text-sm leading-snug text-[var(--foreground)]">
                    {insight.message}
                  </strong>
                  <span className="mt-1 block text-xs text-[var(--text-muted)]">
                    {insightDetail(insight, showValues, currency)}
                  </span>
                </span>
                {insight.href && (
                  <FaChevronRight className="shrink-0 text-[10px] text-[var(--text-muted)]" aria-hidden="true" />
                )}
              </>
            );

            return insight.href ? (
              <Link
                key={insight.id}
                href={insight.href}
                className="flex min-h-[64px] items-center gap-3 rounded-[11px] border border-[var(--border)] bg-[var(--surface-raised)]/45 px-3 py-2 transition-colors hover:bg-[var(--surface-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]"
              >
                {content}
              </Link>
            ) : (
              <div
                key={insight.id}
                className="flex min-h-[64px] items-center gap-3 rounded-[11px] border border-[var(--border)] bg-[var(--surface-raised)]/45 px-3 py-2"
              >
                {content}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function MobileDashboardHeader({
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
    <section className="lg:hidden">
      <h1 className="sr-only">Dashboard financeiro</h1>
      <div className="grid grid-cols-[minmax(0,1fr)_132px] gap-2">
        <label className="relative flex min-h-11 cursor-pointer items-center gap-2.5 rounded-[11px] border border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-semibold capitalize focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[var(--focus)]">
          <FaCalendarAlt className="shrink-0 text-[var(--text-muted)]" aria-hidden="true" />
          <span className="min-w-0 flex-1 truncate">{monthLabel(periodValue)}</span>
          <FaChevronDown className="shrink-0 text-[10px] text-[var(--text-muted)]" aria-hidden="true" />
          <span className="sr-only">Escolher mês do dashboard</span>
          <input
            type="month"
            value={periodValue}
            min="2000-01"
            max="2100-12"
            onChange={(event) => event.currentTarget.value && onPeriodChange(event.currentTarget.value)}
            disabled={loading}
            className="absolute inset-0 cursor-pointer opacity-0"
          />
        </label>

        <div className="min-w-0 [&_.ds-control]:!min-h-11 [&_.ds-control]:!rounded-[11px]">
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

function MobileDashboardHome({
  home,
  showValues,
  forecast,
  commitments,
  recentTransactions,
  topCategories,
  netWorth,
  insights,
}: {
  home: DashboardHome;
  showValues: boolean;
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
      />

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

      {(data.planning.budget > 0 ||
        data.planning.realized > 0 ||
        data.planning.committed > 0 ||
        data.planning.expectedIncome > 0) && (
        <MobileMonthlyPlanningCard
          planning={data.planning}
          showValues={showValues}
          currency={data.currency}
        />
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
      />

      <MobileUpcomingCard
        items={commitments.data?.items ?? []}
        asOf={home.scope.currentAsOf}
        showValues={showValues}
        currency={data.currency}
        loading={commitments.loading}
        error={commitments.error}
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

function MobileSafeToSpendCard({
  safeToSpend,
  horizonEnd,
  showValues,
  currency,
  loading,
  error,
}: {
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
          <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--orbit-primary)]">Próximos 30 dias</p>
          <h2 id="mobile-safe-to-spend-title" className="mt-1 text-sm font-bold">Disponível para gastar</h2>
        </div>
        <span className="text-[10px] text-[var(--text-muted)]">até {horizonLabel}</span>
      </div>

      {error ? (
        <p className="mt-3 text-sm text-[var(--expense)]">{error}</p>
      ) : loading ? (
        <div className="mt-3 h-16 animate-pulse rounded-xl bg-[var(--skeleton)]" role="status" aria-label="Carregando disponível para gastar" />
      ) : safeToSpend ? (
        <>
          <strong className={`mt-2 block text-2xl font-black ${safeToSpend.safeToSpend < 0 ? 'text-[var(--expense)]' : 'text-[var(--foreground)]'}`}>
            {displayMoney(safeToSpend.safeToSpend, showValues, currency)}
          </strong>
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-[10px] bg-[var(--surface-subtle)] p-2.5">
              <span className="block text-[var(--text-muted)]">Pendências</span>
              <strong className="mt-0.5 block text-[var(--expense)]">
                {safeToSpend.pendingExpenses > 0 ? '- ' : ''}{displayMoney(safeToSpend.pendingExpenses, showValues, currency)}
              </strong>
            </div>
            <div className="rounded-[10px] bg-[var(--surface-subtle)] p-2.5">
              <span className="block text-[var(--text-muted)]">Faturas</span>
              <strong className="mt-0.5 block text-[var(--expense)]">
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

function MobileBalanceCard({
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
      <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--orbit-primary)]">
        Hoje · {dashboardLogicalDateLabel(asOf)}
      </p>
      <p id="mobile-balance-title" className="mt-1 flex items-center gap-2 text-sm text-[var(--text-muted)]">
        Saldo realizado em contas correntes <FaEye className="text-xs" aria-hidden="true" />
      </p>

      <strong className={`mt-1 block text-[40px] font-black leading-none tracking-tight ${cashTotal < 0 ? 'text-[var(--expense)]' : 'text-[var(--foreground)]'}`}>
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
          <span className="mt-0.5 block truncate text-[10px] text-[var(--text-muted)]">
            Investimentos ficam no patrimônio e não entram neste saldo.
          </span>
        </span>
        <FaChevronRight className="shrink-0 text-[10px] text-[var(--text-muted)]" aria-hidden="true" />
      </Link>

      <div className="mt-4 grid grid-cols-3 divide-x divide-[var(--border)] border-t border-[var(--border)] pt-4">
        <div className="min-w-0 pr-2.5">
          <p className="text-[10px] text-[var(--text-muted)]">Receitas do mês</p>
          <strong className="mt-1 block truncate text-[13px] font-extrabold text-[var(--income)] min-[360px]:text-[14px]">
            {displayMoney(summary.income, showValues, currency)}
          </strong>
        </div>
        <div className="min-w-0 px-2.5">
          <p className="text-[10px] text-[var(--text-muted)]">Despesas do mês</p>
          <strong className="mt-1 block truncate text-[13px] font-extrabold text-[var(--expense)] min-[360px]:text-[14px]">
            {displayMoney(summary.expense, showValues, currency)}
          </strong>
        </div>
        <div className="min-w-0 pl-2.5">
          <p className="text-[10px] text-[var(--text-muted)]">Saldo do mês</p>
          <strong className={`mt-1 block truncate text-[13px] font-extrabold min-[360px]:text-[14px] ${summary.balance < 0 ? 'text-[var(--expense)]' : 'text-[var(--income)]'}`}>
            {signedMoney(summary.balance, showValues, currency)}
          </strong>
        </div>
      </div>
    </section>
  );
}

function MobileQuickActions() {
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
          <FaChevronRight className="shrink-0 text-xs opacity-70" aria-hidden="true" />
        </Link>
      ))}
    </section>
  );
}

function MobileUpcomingCard({
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
    <article className="rounded-[16px] border border-[var(--border)] bg-[var(--surface)] p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-base font-bold">
          <FaCalendarAlt className="text-[var(--orbit-primary)]" aria-hidden="true" />
          Compromissos · hoje
        </h2>
        <Link href="/compromissos" className="text-xs font-semibold text-[var(--orbit-primary)]">Ver todos</Link>
      </div>

      {loading ? (
        <div className="mt-3 h-16 animate-pulse rounded-[10px] bg-[var(--skeleton)]" role="status" aria-label="Carregando compromissos" />
      ) : error ? (
        <p className="mt-3 rounded-[10px] bg-[var(--danger-subtle)] p-3 text-sm text-[var(--expense)]">{error}</p>
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
        <div className="mt-3 divide-y divide-[var(--border)]">
          {items.slice(0, 3).map((item) => (
            <Link
              key={item.id}
              href={item.href}
              className="grid min-h-[54px] grid-cols-[42px_minmax(0,1fr)_auto] items-center gap-3 py-2"
            >
              <span className="grid h-10 w-10 place-content-center rounded-[9px] border border-[var(--border)] text-center">
                <strong className="text-xs leading-none">{String(item.date.day).padStart(2, '0')}</strong>
                <span className="mt-1 text-[8px] uppercase leading-none text-[var(--text-muted)]">{compactMonthLabel(item.date.month, item.date.year)}</span>
              </span>
              <span className="min-w-0">
                <strong className="block truncate text-xs">{item.title}</strong>
                <span className="mt-1 block text-[11px] text-[var(--text-muted)]">
                  {item.amount === null ? 'Marco sem valor financeiro' : displayMoney(item.amount, showValues, currency)}
                </span>
              </span>
              <span className={`rounded-full px-2 py-1 text-[9px] font-semibold ${item.state === 'OVERDUE' ? 'bg-[var(--danger-subtle)] text-[var(--expense)]' : 'bg-[var(--orbit-primary-subtle)] text-[var(--orbit-primary)]'}`}>
                {item.state === 'OVERDUE' ? 'Vencido' : commitmentBadge(item.date, asOf)}
              </span>
            </Link>
          ))}
        </div>
      )}
    </article>
  );
}

function MobileCategoriesCard({
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
        <Link href="/categorias" className="text-xs font-semibold text-[var(--orbit-primary)]">Ver todas</Link>
      </div>

      <div className="mt-2 divide-y divide-[var(--border)]">
        {categories.length === 0 ? (
          <p className="py-4 text-sm text-[var(--text-muted)]">Nenhuma despesa categorizada neste período.</p>
        ) : (
          categories.slice(0, 5).map((category) => (
            <Link
              key={category.id}
              href="/categorias"
              className="grid min-h-10 grid-cols-[minmax(0,1fr)_auto_12px] items-center gap-2 py-1.5"
            >
              <span className="flex min-w-0 items-center gap-2.5">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-white" style={{ backgroundColor: category.color }}>
                  <IconRenderer iconName={category.icon || 'tag'} size={13} />
                </span>
                <span className="truncate text-sm font-semibold">{category.name}</span>
              </span>
              <strong className="text-right text-sm">{displayMoney(category.realized, showValues, currency)}</strong>
              <FaChevronRight className="text-[10px] text-[var(--text-muted)]" aria-hidden="true" />
            </Link>
          ))
        )}
      </div>
    </article>
  );
}

function MobileRecentTransactionsCard({
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
    <article className="rounded-[16px] border border-[var(--border)] bg-[var(--surface)] p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-bold">Últimas transações do mês</h2>
        <Link href="/transacoes" className="text-xs font-semibold text-[var(--orbit-primary)]">Ver todas</Link>
      </div>

      <div className="mt-2 divide-y divide-[var(--border)]">
        {loading ? (
          <div className="space-y-2 py-2" role="status" aria-label="Carregando transações recentes">
            {[1, 2, 3, 4].map((item) => <div key={item} className="h-10 animate-pulse rounded-lg bg-[var(--skeleton)]" />)}
          </div>
        ) : error ? (
          <p className="py-4 text-sm text-[var(--expense)]">{error}</p>
        ) : items.length === 0 ? (
          <p className="py-4 text-sm text-[var(--text-muted)]">Nenhuma transação encontrada neste mês.</p>
        ) : (
          items.slice(0, 4).map((transaction) => {
            const isIncome = transaction.type === 'INCOME';
            const isTransfer = transaction.kind === 'TRANSFER';
            const tone = isTransfer ? 'text-[var(--orbit-primary)]' : isIncome ? 'text-[var(--income)]' : 'text-[var(--expense)]';
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
                    {isTransfer ? <FaExchangeAlt size={12} aria-hidden="true" /> : <IconRenderer iconName={transaction.category?.icon || (isIncome ? 'income-up' : 'tag')} size={12} />}
                  </span>
                  <span className="min-w-0">
                    <strong className="block truncate text-xs">{transaction.description}</strong>
                    <span className="mt-0.5 block truncate text-[10px] text-[var(--text-muted)]">
                      {transactionDateLabel(transaction)}
                      {isTransfer && transaction.counterpartAccount ? ` · para ${transaction.counterpartAccount.name}` : ''}
                      {statusLabel ? ` · ${statusLabel}` : ''}
                    </span>
                  </span>
                </span>
                <strong className={`shrink-0 text-xs ${tone}`}>
                  {showValues ? `${isIncome ? '+' : isTransfer ? '' : '-'} ${formatCurrency(transaction.amount, currency)}` : '••••'}
                </strong>
                <FaChevronRight className="text-[10px] text-[var(--text-muted)]" aria-hidden="true" />
              </Link>
            );
          })
        )}
      </div>
    </article>
  );
}

function CurrentCashCard({
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

function AccountsCard({
  accounts,
  total,
  showValues,
  currency,
}: {
  accounts: MonthlyDashboard['accounts'];
  total: number;
  showValues: boolean;
  currency: string;
}) {
  return (
    <article className="min-h-[278px] rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-[14px]">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.04em] text-[var(--text-muted)]">
        Meu dinheiro <FaEye aria-hidden="true" />
      </div>
      <strong className={`mt-2 block text-[30px] font-extrabold leading-none tracking-tight ${total < 0 ? 'text-[var(--expense)]' : 'text-[var(--income)]'}`}>
        {displayMoney(total, showValues, currency)}
      </strong>
      <p className="mt-1 text-xs text-[var(--text-muted)]">Total disponível em todas as contas</p>

      <div className="mt-2 divide-y divide-[var(--border)] border-t border-[var(--border)]">
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
                <FaChevronRight className="text-[9px] text-[var(--text-muted)]" aria-hidden="true" />
              </span>
            </Link>
          ))
        )}
      </div>
    </article>
  );
}

function MonthlyPlanningCard({
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

function MobileMonthlyPlanningCard({
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

      <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
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

function PlanningMetric({
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
      <p className="text-[11px] text-[var(--text-muted)]">{label}</p>
      <strong className={`mt-1 block text-sm ${danger ? 'text-[var(--expense)]' : 'text-[var(--foreground)]'}`}>
        {value}
      </strong>
    </div>
  );
}

function FinancialGoalsCard({
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
            Progresso virtual. Nenhum valor altera o saldo das contas.
          </p>
        </div>
        <Link href="/metas" className="text-xs font-semibold text-[var(--orbit-primary)]">
          Ver todas
        </Link>
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
        {goals.slice(0, 3).map((goal) => {
          const percentage = Math.max(0, Math.min(100, goal.percentage));

          return (
            <Link
              key={goal.id}
              href="/metas"
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

function MobileFinancialGoalsCard({
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
        <Link href="/metas" className="text-xs font-semibold text-[var(--orbit-primary)]">
          Ver todas
        </Link>
      </div>

      <div className="mt-2 divide-y divide-[var(--border)]">
        {goals.slice(0, 3).map((goal) => (
          <Link
            key={goal.id}
            href="/metas"
            className="grid min-h-[66px] grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-2"
          >
            <span className="min-w-0">
              <strong className="block truncate text-sm">{goal.name}</strong>
              <span className="mt-1 block text-[11px] text-[var(--text-muted)]">
                {displayMoney(goal.currentAmount, showValues, currency)} de {displayMoney(goal.targetAmount, showValues, currency)}
              </span>
            </span>
            <span className="text-right">
              <strong className="block text-xs text-[var(--orbit-primary)]">
                {goal.percentage.toLocaleString('pt-BR')}%
              </strong>
              <span className="mt-1 block text-[10px] text-[var(--text-muted)]">
                falta {displayMoney(goal.remainingAmount, showValues, currency)}
              </span>
            </span>
          </Link>
        ))}
      </div>
    </article>
  );
}

function CreditCardsCard({
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
            Limite e próxima fatura sem somar crédito ao saldo disponível.
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
                <FaChevronRight className="text-[10px] text-[var(--text-muted)]" aria-hidden="true" />
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

function MobileCreditCardsCard({
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
        <Link href="/contas" className="text-xs font-semibold text-[var(--orbit-primary)]">
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
              <span className="mt-1 block truncate text-[11px] text-[var(--text-muted)]">
                Disponível {displayMoney(card.availableLimit, showValues, currency)}
              </span>
            </span>
            <span className="text-right">
              <strong className="block text-xs text-[var(--foreground)]">
                {card.nextStatement
                  ? displayMoney(card.nextStatement.amount, showValues, currency)
                  : 'Sem fatura'}
              </strong>
              {card.nextStatement && (
                <span className="mt-1 block text-[10px] text-[var(--text-muted)]">
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

function UpcomingCard({
  items,
  asOf,
  showValues,
  currency,
  loading,
}: {
  items: ForecastItem[];
  asOf: ForecastData['asOf'] | null;
  showValues: boolean;
  currency: string;
  loading: boolean;
}) {
  return (
    <article className="min-h-[278px] rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-[14px]">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-[0.04em] text-[var(--text-muted)]">Próximos compromissos</h2>
        <Link href="/calendario" className="text-xs font-semibold text-[var(--orbit-primary)]">Ver todos</Link>
      </div>

      <div className="mt-2 divide-y divide-[var(--border)]">
        {loading ? (
          <div className="space-y-2 py-2" role="status" aria-label="Carregando compromissos">
            {[1, 2, 3, 4].map((item) => <div key={item} className="h-[46px] animate-pulse rounded-lg bg-[var(--skeleton)]" />)}
          </div>
        ) : items.length === 0 ? (
          <p className="py-4 text-sm text-[var(--text-muted)]">Nenhum compromisso pendente nos próximos 30 dias.</p>
        ) : (
          items.slice(0, 4).map((item) => (
            <div key={item.id} className="grid min-h-[52px] grid-cols-[46px_minmax(0,1fr)_auto] items-center gap-3 py-1">
              <span className="grid h-[43px] w-[43px] place-content-center rounded-[9px] border border-[var(--border-strong)] text-center">
                <strong className="text-sm leading-none">{String(item.day).padStart(2, '0')}</strong>
                <span className="mt-1 text-[9px] font-medium uppercase leading-none text-[var(--text-muted)]">{compactMonthLabel(item.month, item.year)}</span>
              </span>
              <div className="min-w-0">
                <p className="truncate text-xs font-bold">{item.description}</p>
                <p className="mt-1 text-xs text-[var(--text-muted)]">{displayMoney(item.amount, showValues, currency)}</p>
              </div>
              <span className="rounded-[8px] bg-[var(--orbit-primary-subtle)] px-2.5 py-1.5 text-[10px] font-semibold text-[var(--orbit-primary)]">
                {commitmentBadge(item, asOf)}
              </span>
            </div>
          ))
        )}
      </div>
    </article>
  );
}

function MonthOverviewCard({
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
        <span className="inline-flex min-h-9 items-center gap-2 rounded-[9px] border border-[var(--border)] bg-[var(--surface-raised)] px-3 text-xs font-semibold capitalize">
          {monthLabel(`${data.period.year}-${String(data.period.month).padStart(2, '0')}`)}
          <FaChevronDown className="text-[10px] text-[var(--text-muted)]" aria-hidden="true" />
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

function MonthMetric({
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

function CategoriesCard({
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
        <span className="hidden text-xs font-semibold capitalize text-[var(--text-muted)] sm:inline">{monthLabel(`${period.year}-${String(period.month).padStart(2, '0')}`)}</span>
      </div>
      <div className="mt-2 divide-y divide-[var(--border)]">
        {categories.length === 0 ? (
          <p className="py-4 text-sm text-[var(--text-muted)]">Nenhuma despesa categorizada neste período.</p>
        ) : (
          categories.map((category) => (
            <div key={category.id} className="grid min-h-7 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-0.5 sm:grid-cols-[minmax(0,1.1fr)_120px_minmax(90px,.8fr)_44px]">
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-white" style={{ backgroundColor: category.color }}><IconRenderer iconName={category.icon || 'tag'} size={14} /></span>
                <span className="truncate text-sm font-semibold">{category.name}</span>
              </div>
              <strong className="text-right text-sm sm:text-left">{displayMoney(category.realized, showValues, currency)}</strong>
              <div className="hidden h-2 overflow-hidden rounded-full bg-[var(--surface-subtle)] sm:block">
                <span className="block h-full rounded-full bg-[var(--orbit-primary)]" style={{ width: `${Math.min(100, category.sharePercentage)}%` }} />
              </div>
              <span className="hidden text-right text-xs font-semibold text-[var(--text-muted)] sm:block">{category.sharePercentage.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%</span>
            </div>
          ))
        )}
      </div>
      <Link href="/categorias" className="mt-2 flex min-h-9 items-center justify-between rounded-[10px] border border-[var(--border-strong)] px-3 text-sm font-semibold">
        Ver todas as categorias <FaChevronRight aria-hidden="true" />
      </Link>
    </article>
  );
}

function RecentTransactionsCard({
  items,
  loading,
  showValues,
  currency,
}: {
  items: TransactionDTO[];
  loading: boolean;
  showValues: boolean;
  currency: string;
}) {
  return (
    <article className="min-h-[244px] rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-[14px]">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold">Últimas transações</h2>
        <Link href="/transacoes" className="text-xs font-semibold text-[var(--orbit-primary)]">Ver todas</Link>
      </div>

      <div className="mt-2 divide-y divide-[var(--border)]">
        {loading ? (
          <div className="space-y-2 py-2" role="status" aria-label="Carregando transações recentes">
            {[1, 2, 3, 4].map((item) => <div key={item} className="h-[38px] animate-pulse rounded-lg bg-[var(--skeleton)]" />)}
          </div>
        ) : items.length === 0 ? (
          <p className="py-5 text-sm text-[var(--text-muted)]">Nenhuma transação encontrada neste mês.</p>
        ) : (
          items.map((transaction) => {
            const isIncome = transaction.type === 'INCOME';
            const isTransfer = transaction.kind === 'TRANSFER';
            const tone = isTransfer ? 'text-[var(--orbit-primary)]' : isIncome ? 'text-[var(--income)]' : 'text-[var(--expense)]';

            return (
              <Link key={transaction.id} href={`/transacoes/show/${transaction.id}`} className="grid min-h-9 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-1 sm:grid-cols-[minmax(0,1.25fr)_130px_105px_auto]">
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-white ${isTransfer ? 'bg-[var(--orbit-primary)]' : isIncome ? 'bg-[var(--income)]' : ''}`}
                    style={!isTransfer && !isIncome && transaction.category ? { backgroundColor: transaction.category.color } : undefined}
                  >
                    {isTransfer ? <FaExchangeAlt size={12} aria-hidden="true" /> : <IconRenderer iconName={transaction.category?.icon || (isIncome ? 'income-up' : 'tag')} size={12} />}
                  </span>
                  <p className="truncate text-xs font-semibold">{transaction.description}</p>
                </div>
                <span className="hidden text-xs text-[var(--text-muted)] sm:block">{transactionDateLabel(transaction)}</span>
                <span className="hidden truncate text-xs text-[var(--text-muted)] sm:block">{transaction.account.name}</span>
                <strong className={`shrink-0 text-xs ${tone}`}>
                  {showValues ? `${isIncome ? '+' : isTransfer ? '' : '-'} ${formatCurrency(transaction.amount, currency)}` : '••••'}
                </strong>
              </Link>
            );
          })
        )}
      </div>
    </article>
  );
}

function ProjectedBalanceCard({
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
        <span className="rounded-full border border-[var(--orbit-primary)]/35 bg-[var(--orbit-primary-subtle)] px-2.5 py-1 text-[10px] font-semibold text-[var(--orbit-primary)]">Cálculo conservador</span>
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
          <p className="mt-1 text-[10px] leading-relaxed text-[var(--text-muted)]">
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
            {commitmentCount === 0 ? 'Nenhum compromisso nos próximos 10 dias.' : `Você tem ${commitmentCount} compromisso${commitmentCount === 1 ? '' : 's'} nos próximos 10 dias.`}
          </strong>
          <span className="mt-1 block text-xs text-[var(--text-muted)]">Mantenha seu saldo em dia e evite imprevistos.</span>
        </span>
      </button>
    </article>
  );
}

function ProjectionRow({ label, value, tone = 'neutral' }: { label: string; value: string; tone?: 'income' | 'expense' | 'neutral' }) {
  return (
    <div className="flex items-center justify-between gap-3 py-0.5">
      <span className="text-sm text-[var(--text-muted)]">{label}</span>
      <strong className={tone === 'income' ? 'text-[var(--income)]' : tone === 'expense' ? 'text-[var(--expense)]' : ''}>{value}</strong>
    </div>
  );
}

function ForecastDialog({ currency, onClose }: { currency: SupportedCurrency; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const frame = window.requestAnimationFrame(() => closeRef.current?.focus());
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      onCloseRef.current();
    };
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      window.cancelAnimationFrame(frame);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
      window.requestAnimationFrame(() => previousFocus?.focus());
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-[var(--overlay)] p-3 sm:p-4" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section role="dialog" aria-modal="true" aria-labelledby="forecast-title" className="relative max-h-[90dvh] w-full max-w-[920px] overflow-y-auto rounded-[18px] border border-[var(--border-strong)] bg-[var(--background)] p-3 shadow-[var(--shadow-surface)] sm:p-4">
        <button ref={closeRef} type="button" onClick={onClose} aria-label="Fechar projeção" className="absolute right-4 top-4 z-10 grid h-11 w-11 place-items-center rounded-[10px] border border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)] hover:bg-[var(--surface-hover)]">
          <FaTimes aria-hidden="true" />
        </button>
        <ForecastPanel embedded initialCurrency={currency} />
      </section>
    </div>
  );
}

function DashboardLoading() {
  return (
    <div role="status" aria-label="Carregando dashboard">
      <div className="space-y-3 lg:hidden">
        <div className="h-[205px] animate-pulse rounded-[18px] bg-[var(--skeleton)]" />
        <div className="grid grid-cols-2 gap-2">
          {[1, 2, 3, 4].map((item) => <div key={item} className="h-[62px] animate-pulse rounded-[12px] bg-[var(--skeleton)]" />)}
        </div>
        <div className="h-[118px] animate-pulse rounded-[16px] bg-[var(--skeleton)]" />
        <div className="h-[250px] animate-pulse rounded-[16px] bg-[var(--skeleton)]" />
        <div className="h-[220px] animate-pulse rounded-[16px] bg-[var(--skeleton)]" />
      </div>

      <div className="hidden space-y-[14px] lg:block">
        <div className="grid gap-[14px] xl:grid-cols-[1.95fr_1fr_1.22fr]">
          <div className="h-[278px] animate-pulse rounded-[14px] bg-[var(--skeleton)]" />
          <div className="h-[278px] animate-pulse rounded-[14px] bg-[var(--skeleton)]" />
          <div className="h-[278px] animate-pulse rounded-[14px] bg-[var(--skeleton)]" />
        </div>
        <div className="grid gap-[14px] xl:grid-cols-[1.15fr_1fr]">
          <div className="h-[252px] animate-pulse rounded-[14px] bg-[var(--skeleton)]" />
          <div className="h-[252px] animate-pulse rounded-[14px] bg-[var(--skeleton)]" />
        </div>
        <div className="grid gap-[14px] xl:grid-cols-[1.36fr_1fr]">
          <div className="h-[244px] animate-pulse rounded-[14px] bg-[var(--skeleton)]" />
          <div className="h-[244px] animate-pulse rounded-[14px] bg-[var(--skeleton)]" />
        </div>
      </div>
    </div>
  );
}
