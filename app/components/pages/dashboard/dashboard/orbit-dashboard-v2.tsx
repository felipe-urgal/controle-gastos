'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';

import { PageTitle } from '@/app/components/base-pages';
import { ProtectedRoute } from '@/app/components/layout';

import { Button, CurrencySelect, PeriodSwitcher, ShowBelow, ShowFrom } from '@/app/components/ui';
import { useAuth } from '@/app/context';
import { useDashboardHome } from '@/app/hooks/dashboard/use-dashboard-home';
import { usePeriodicSummary } from '@/app/hooks/dashboard/use-periodic-summary';

import type { DashboardHome } from '@/app/types/dashboard';

import { dashboardLogicalDateLabel, monthLabel, periodOffset, sectionState } from '@/app/components/pages/dashboard/dashboard/dashboard-helpers';
import { AttentionCard } from '@/app/components/pages/dashboard/dashboard/cards/attention-card';
import { SafeToSpendHero } from '@/app/components/pages/dashboard/dashboard/cards/safe-to-spend-hero';
import { buildAttentionItems } from '@/app/components/pages/dashboard/dashboard/dashboard-attention';
import { GettingStartedCard, gettingStartedSteps } from '@/app/components/pages/dashboard/dashboard/cards/getting-started-card';
import { UpcomingCard } from '@/app/components/pages/dashboard/dashboard/cards/upcoming-card';

// Cards abaixo da dobra e o diálogo de projeção carregam sob demanda; os dois cards
// de cima ficam no bundle inicial para não atrasar o LCP.
function cardFallback(height: number) {
  return function CardFallback() {
    return <div aria-hidden="true" style={{ minHeight: height }} className="animate-pulse rounded-[var(--radius-lg)] bg-[var(--skeleton)]" />;
  };
}
const MonthPaceCard = dynamic(() => import('@/app/components/pages/dashboard/dashboard/cards/month-pace-card').then((m) => m.MonthPaceCard), { ssr: false, loading: cardFallback(420) });
const CategoriesCard = dynamic(() => import('@/app/components/pages/dashboard/dashboard/cards/categories-card').then((m) => m.CategoriesCard), { ssr: false, loading: cardFallback(252) });
const RecentTransactionsCard = dynamic(() => import('@/app/components/pages/dashboard/dashboard/cards/recent-transactions-card').then((m) => m.RecentTransactionsCard), { ssr: false, loading: cardFallback(244) });
const MonthlyFlowCard = dynamic(() => import('@/app/components/pages/dashboard/dashboard/cards/monthly-flow-card').then((m) => m.MonthlyFlowCard), { ssr: false, loading: cardFallback(300) });
const OverviewStrip = dynamic(() => import('@/app/components/pages/dashboard/dashboard/cards/overview-strip').then((m) => m.OverviewStrip), { ssr: false, loading: cardFallback(76) });
const ForecastDialog = dynamic(() => import('@/app/components/pages/dashboard/dashboard/cards/forecast-dialog').then((m) => m.ForecastDialog), { ssr: false });
const PeriodicSummaryCard = dynamic(() => import('@/app/components/pages/dashboard/dashboard/periodic-summary-card').then((m) => m.PeriodicSummaryCard), { ssr: false, loading: cardFallback(140) });

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

  const periodControls = (
    <div className="flex min-w-0 flex-1 items-center gap-2 lg:flex-none">
      <CurrencySelect value={currency} onChange={setCurrency} disabled={loading} />
      <PeriodSwitcher
        className="min-w-0 flex-1 lg:flex-none"
        month={Number(periodValue.slice(5, 7))}
        year={Number(periodValue.slice(0, 4))}
        onPrevious={() => setPeriodValue(periodOffset(periodValue, -1))}
        onNext={() => setPeriodValue(periodOffset(periodValue, 1))}
        disabled={loading}
      />
    </div>
  );

  return (
    <ProtectedRoute>
      <PageTitle
        title="Dashboard"
        sidebarAligned
        actions={<ShowFrom breakpoint="lg">{periodControls}</ShowFrom>}
      />
      <ShowBelow breakpoint="lg">
        <div className="mt-4">{periodControls}</div>
      </ShowBelow>

      {error && (
        <div role="alert" className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--expense)]/35 bg-[var(--danger-subtle)] p-3">
          <p className="text-sm text-[var(--expense)]">{error}</p>
          <Button type="button" size="sm" variant="outline" onClick={retry}>
            Tentar novamente
          </Button>
        </div>
      )}

      {/* Na troca de mês ou moeda os dados anteriores ficam esmaecidos até os novos chegarem. */}
      <div className={`mt-4 transition-opacity ${loading && data ? 'pointer-events-none opacity-50' : ''}`} aria-busy={loading}>
        {data ? (
          <DashboardHome
            home={data}
            showValues={showValues}
            periodicSummaryEnabled={user?.periodicSummaryEnabled === true}
            onRetry={retry}
          />
        ) : loading ? (
          <DashboardLoading />
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
  const topCategories = [...data.categories]
    .filter((category) => category.realized > 0)
    .sort((left, right) => right.realized - left.realized)
    .slice(0, 5);
  const commitmentItems = commitments.data?.items ?? [];
  const attentionItems = buildAttentionItems({
    cards: data.cards,
    recentTransactions: recentTransactions.data ?? [],
    insights: insights.data?.items ?? [],
    asOf: home.scope.currentAsOf,
    showValues,
    currency: data.currency,
    commitments: commitments.data ? commitments.data.items : null,
    budgetMissing: home.scope.selectedPeriodRelation === 'CURRENT' && data.planning.budget <= 0,
  });
  const startSteps = gettingStartedSteps({
    hasAccount: data.accounts.length > 0,
    hasTransactions: data.flow.some((month) => month.income > 0 || month.expense > 0) || (recentTransactions.data?.length ?? 0) > 0,
    hasBudget: data.planning.budget > 0,
  });
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
        <div role="alert" className="mb-[14px] flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-md)] border border-[var(--warning)]/35 bg-[var(--warning-subtle)] px-3 py-2">
          <p className="text-xs text-[var(--foreground)]">
            Parte do Dashboard está indisponível. Os valores conhecidos continuam visíveis sem transformar falha em zero.
          </p>
          <Button type="button" size="sm" variant="outline" onClick={onRetry}>
            Tentar novamente
          </Button>
        </div>
      )}
      {home.scope.selectedPeriodRelation !== 'CURRENT' && (
        <div role="status" className="mb-[14px] rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 text-xs text-[var(--text-muted)]">
          <strong className="text-[var(--foreground)]">Mês selecionado: {monthLabel(`${data.period.year}-${String(data.period.month).padStart(2, '0')}`)}.</strong>{' '}
          Resumo, planejamento, categorias, transações recentes e patrimônio usam esse período; saldo de caixa, cartões, metas, compromissos e projeção usam a referência atual ({dashboardLogicalDateLabel(home.scope.currentAsOf)}).
        </div>
      )}

      {startSteps.length > 0 && (
        <div className="mb-[14px]">
          <GettingStartedCard steps={startSteps} />
        </div>
      )}

      <section className="grid gap-[14px] xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <SafeToSpendHero
          cashAccounts={cashAccounts}
          asOf={home.scope.currentAsOf}
          summary={data.summary}
          comparison={data.comparison}
          safeToSpend={forecast.data?.safeToSpend ?? null}
          horizonEnd={forecast.data?.horizonEnd ?? null}
          loading={forecast.loading}
          error={forecast.error}
          showValues={showValues}
          currency={data.currency}
          onOpenForecast={() => setForecastOpen(true)}
          forecastEnabled={Boolean(forecast.data) && !forecast.loading}
          onRetry={onRetry}
        />
        <AttentionCard
          items={attentionItems}
          loading={insights.loading || recentTransactions.loading}
          insightsError={insights.error}
        />
      </section>

      <section className="mt-[14px] grid gap-[14px] lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <MonthPaceCard
          data={data}
          relation={home.scope.selectedPeriodRelation}
          today={home.scope.currentAsOf.day}
          showValues={showValues}
        />
        <MonthlyFlowCard
          flow={data.flow}
          relation={home.scope.selectedPeriodRelation}
          showValues={showValues}
          currency={data.currency}
        />
      </section>

      <section className="mt-[14px] grid gap-[14px] md:grid-cols-2 xl:grid-cols-3">
        <UpcomingCard
          items={commitmentItems}
          asOf={home.scope.currentAsOf}
          showValues={showValues}
          currency={data.currency}
          loading={commitments.loading}
          error={commitments.error}
          onRetry={onRetry}
        />
        <RecentTransactionsCard
          items={recentTransactions.data ?? []}
          loading={recentTransactions.loading}
          error={recentTransactions.error}
          showValues={showValues}
          currency={data.currency}
          onRetry={onRetry}
        />
        <div className="min-w-0 md:col-span-2 xl:col-span-1">
          <CategoriesCard categories={topCategories} limits={data.limits} showValues={showValues} currency={data.currency} period={data.period} />
        </div>
      </section>

      <div className="mt-[14px]">
        <OverviewStrip
          cards={data.cards}
          goals={data.goals}
          netWorth={netWorth}
          period={data.period}
          currency={data.currency}
          showValues={showValues}
        />
      </div>

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
        <div className="h-[330px] animate-pulse rounded-[var(--radius-lg)] bg-[var(--skeleton)]" />
        <div className="h-[250px] animate-pulse rounded-[var(--radius-lg)] bg-[var(--skeleton)]" />
        <div className="h-[420px] animate-pulse rounded-[var(--radius-lg)] bg-[var(--skeleton)]" />
        <div className="h-[220px] animate-pulse rounded-[var(--radius-lg)] bg-[var(--skeleton)]" />
      </div>

      <div className="hidden space-y-[14px] lg:block">
        <div className="grid gap-[14px] xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <div className="h-[330px] animate-pulse rounded-[var(--radius-lg)] bg-[var(--skeleton)]" />
          <div className="h-[330px] animate-pulse rounded-[var(--radius-lg)] bg-[var(--skeleton)]" />
        </div>
        <div className="grid gap-[14px] lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
          <div className="h-[420px] animate-pulse rounded-[var(--radius-lg)] bg-[var(--skeleton)]" />
          <div className="h-[420px] animate-pulse rounded-[var(--radius-lg)] bg-[var(--skeleton)]" />
        </div>
        <div className="grid gap-[14px] md:grid-cols-2 xl:grid-cols-3">
          <div className="h-[278px] animate-pulse rounded-[var(--radius-lg)] bg-[var(--skeleton)]" />
          <div className="h-[278px] animate-pulse rounded-[var(--radius-lg)] bg-[var(--skeleton)]" />
          <div className="h-[278px] animate-pulse rounded-[var(--radius-lg)] bg-[var(--skeleton)] md:col-span-2 xl:col-span-1" />
        </div>
      </div>
    </div>
  );
}
