'use client';

import { pageTitleClassName } from '@/app/components/base-pages/page-title';

import { useMediaQuery } from '@/app/hooks/use-media-query';

import { useState } from 'react';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';

import { ProtectedRoute } from '@/app/components/layout';

import { LocalFinancialAssistantCard } from '@/app/components/pages/dashboard/dashboard/local-financial-assistant-card';
import { PeriodicSummaryCard } from '@/app/components/pages/dashboard/dashboard/periodic-summary-card';
import { Select } from '@/app/components/ui';
import { useAuth } from '@/app/context';
import { useDashboardHome } from '@/app/hooks/dashboard/use-dashboard-home';
import { usePeriodicSummary } from '@/app/hooks/dashboard/use-periodic-summary';
import { currencyOptions } from '@/app/lib/constants/account.constants';

import type { DashboardHome } from '@/app/types/dashboard';
import type { SupportedCurrency } from '@/app/types/financial-summary';

import { commitmentCountWithinTenDays, currentDateLabel, dashboardLogicalDateLabel, monthLabel, periodOffset, sectionState } from '@/app/components/pages/dashboard/dashboard/dashboard-helpers';
import { MobileDashboardHeader, MobileDashboardHome } from '@/app/components/pages/dashboard/dashboard/mobile-dashboard';
import { AccountsCard, CategoriesCard, CreditCardsCard, CurrentCashCard, FinancialGoalsCard, ForecastDialog, MonthOverviewCard, MonthlyPlanningCard, ProjectedBalanceCard, RecentTransactionsCard, UpcomingCard } from '@/app/components/pages/dashboard/dashboard/desktop-cards';
import { FinancialInsightsCard, NetWorthSummaryCard } from '@/app/components/pages/dashboard/dashboard/insight-cards';

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
  const isDesktop = useMediaQuery('(min-width: 1024px)');

  return (
    <ProtectedRoute>
      {isDesktop && (
      <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p suppressHydrationWarning className="min-h-4 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">{currentDateLabel()}</p>
          <h1 className={`mt-1 ${pageTitleClassName}`}>Seu dinheiro, no seu controle</h1>
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
          <label className="relative min-h-11 min-w-[180px] cursor-pointer rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-3 py-3 text-center text-sm font-semibold focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[var(--focus)]">
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
          <div className="w-full sm:w-[145px]">
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
      )}

      {!isDesktop && (
      <MobileDashboardHeader
        periodValue={periodValue}
        currency={currency}
        loading={loading}
        onPeriodChange={setPeriodValue}
        onCurrencyChange={setCurrency}
      />
      )}

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
            onRetry={retry}
          />
        ) : null}
      </div>
    </ProtectedRoute>
  );
}

function DashboardHome({
  home,
  showValues,
  periodicSummaryEnabled,
  onRetry,
}: {
  home: DashboardHome;
  showValues: boolean;
  periodicSummaryEnabled: boolean;
  onRetry: () => void;
}) {
  const [forecastOpen, setForecastOpen] = useState(false);
  const isDesktop = useMediaQuery('(min-width: 1024px)');
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
  const hasPartialError = [
    home.current.forecast,
    home.current.commitments,
    home.recentTransactions,
    home.netWorth,
    home.insights,
  ].some((section) => section.status === 'ERROR');

  return (
    <>
      {hasPartialError && (
        <div role="alert" className="mb-[14px] flex flex-wrap items-center justify-between gap-3 rounded-[12px] border border-[var(--warning)]/35 bg-[var(--warning-subtle)] px-3 py-2">
          <p className="text-xs text-[var(--foreground)]">
            Parte do Dashboard está indisponível. Os valores conhecidos continuam visíveis sem transformar falha em zero.
          </p>
          <button type="button" onClick={onRetry} className="min-h-11 sm:min-h-9 rounded-[9px] border border-[var(--border)] bg-[var(--surface)] px-3 text-xs font-semibold">
            Tentar novamente
          </button>
        </div>
      )}
      {home.scope.selectedPeriodRelation !== 'CURRENT' && (
        <div role="status" className="mb-[14px] rounded-[12px] border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 text-xs text-[var(--text-muted)]">
          <strong className="text-[var(--foreground)]">Mês selecionado: {monthLabel(`${data.period.year}-${String(data.period.month).padStart(2, '0')}`)}.</strong>{' '}
          Resumo, planejamento, categorias, transações recentes e patrimônio usam esse período; saldo de caixa, cartões, metas, compromissos e projeção usam a referência atual ({dashboardLogicalDateLabel(home.scope.currentAsOf)}).
        </div>
      )}

      {!isDesktop && (
        <MobileDashboardHome
          home={home}
          showValues={showValues}
          forecast={forecast}
          commitments={commitments}
          recentTransactions={recentTransactions}
          topCategories={topCategories}
          netWorth={netWorth}
          insights={insights}
          onOpenForecast={() => setForecastOpen(true)}
        />
      )}

      {isDesktop && (
        <>
        <section className="grid gap-[14px] xl:grid-cols-[1.95fr_1fr_1.22fr]">
          <CurrentCashCard
            accounts={cashAccounts}
            total={availableNow}
            showValues={showValues}
            currency={data.currency}
            asOf={home.scope.currentAsOf}
          />
          <AccountsCard accounts={cashAccounts} showValues={showValues} currency={data.currency} />
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
            contextReady={Boolean(forecast.data) && Boolean(insights.data)}
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
        </>
      )}

      {periodicSummaryEnabled && (
        <div className="mt-[14px]">
          <PeriodicSummaryCard
            state={periodicSummary.data}
            loading={periodicSummary.loading}
            error={periodicSummary.error}
            onRetry={periodicSummary.retry}
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
