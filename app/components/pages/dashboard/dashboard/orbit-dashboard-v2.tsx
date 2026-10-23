'use client';

import { pageTitleClassName } from '@/app/components/base-pages/page-title';

import { useMediaQuery } from '@/app/hooks/use-media-query';

import dynamic from 'next/dynamic';
import { useState } from 'react';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';

import { ProtectedRoute } from '@/app/components/layout';

import { Button, IconButton, Select } from '@/app/components/ui';
import { useAuth } from '@/app/context';
import { useDashboardHome } from '@/app/hooks/dashboard/use-dashboard-home';
import { usePeriodicSummary } from '@/app/hooks/dashboard/use-periodic-summary';
import { currencyOptions } from '@/app/lib/constants/account.constants';

import type { DashboardHome } from '@/app/types/dashboard';
import type { SupportedCurrency } from '@/app/types/financial-summary';

import { currentDateLabel, dashboardLogicalDateLabel, monthLabel, periodOffset, sectionState } from '@/app/components/pages/dashboard/dashboard/dashboard-helpers';
import { MobileDashboardHeader, MobileDashboardHome } from '@/app/components/pages/dashboard/dashboard/mobile-dashboard';
import { AttentionCard } from '@/app/components/pages/dashboard/dashboard/cards/attention-card';
import { SafeToSpendHero } from '@/app/components/pages/dashboard/dashboard/cards/safe-to-spend-hero';
import { buildAttentionItems } from '@/app/components/pages/dashboard/dashboard/dashboard-attention';
import { UpcomingCard } from '@/app/components/pages/dashboard/dashboard/cards/upcoming-card';

// Cards abaixo da dobra (desktop) e o diálogo de projeção carregam sob demanda; os três cards
// de cima ficam no bundle inicial para não atrasar o LCP.
function cardFallback(height: number) {
  return function CardFallback() {
    return <div aria-hidden="true" style={{ minHeight: height }} className="animate-pulse rounded-[14px] bg-[var(--skeleton)]" />;
  };
}
const CreditCardsCard = dynamic(() => import('@/app/components/pages/dashboard/dashboard/cards/credit-cards-card').then((m) => m.CreditCardsCard), { ssr: false, loading: cardFallback(160) });
const FinancialGoalsCard = dynamic(() => import('@/app/components/pages/dashboard/dashboard/cards/financial-goals-card').then((m) => m.FinancialGoalsCard), { ssr: false, loading: cardFallback(160) });
const MonthPaceCard = dynamic(() => import('@/app/components/pages/dashboard/dashboard/cards/month-pace-card').then((m) => m.MonthPaceCard), { ssr: false, loading: cardFallback(420) });
const CategoriesCard = dynamic(() => import('@/app/components/pages/dashboard/dashboard/cards/categories-card').then((m) => m.CategoriesCard), { ssr: false, loading: cardFallback(252) });
const RecentTransactionsCard = dynamic(() => import('@/app/components/pages/dashboard/dashboard/cards/recent-transactions-card').then((m) => m.RecentTransactionsCard), { ssr: false, loading: cardFallback(244) });
const ForecastDialog = dynamic(() => import('@/app/components/pages/dashboard/dashboard/cards/forecast-dialog').then((m) => m.ForecastDialog), { ssr: false });
const NetWorthSummaryCard = dynamic(() => import('@/app/components/pages/dashboard/dashboard/insight-cards').then((m) => m.NetWorthSummaryCard), { ssr: false, loading: cardFallback(180) });
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
          <IconButton
            label="Mês anterior"
            icon={<FaChevronLeft />}
            onClick={() => setPeriodValue(periodOffset(periodValue, -1))}
            disabled={loading}
            className="border border-[var(--border)] bg-[var(--surface)]"
          />
          <label className="relative min-h-11 flex min-h-11 min-w-[180px] cursor-pointer items-center justify-center rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-3 text-center text-sm font-semibold focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[var(--focus)]">
            {monthLabel(periodValue)}
            <span className="sr-only">Escolher mês do dashboard</span>
            <input
              type="month"
              value={periodValue}
              min="2000-01"
              max="2100-12"
              onChange={(event) => event.currentTarget.value && setPeriodValue(event.currentTarget.value)}
              disabled={loading}
              className="absolute -inset-px cursor-pointer opacity-0"
            />
          </label>
          <IconButton
            label="Próximo mês"
            icon={<FaChevronRight />}
            onClick={() => setPeriodValue(periodOffset(periodValue, 1))}
            disabled={loading}
            className="border border-[var(--border)] bg-[var(--surface)]"
          />
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
          <Button type="button" size="sm" variant="outline" onClick={onRetry}>
            Tentar novamente
          </Button>
        </div>
      )}
      {home.scope.selectedPeriodRelation !== 'CURRENT' && (
        <div role="status" className="mb-[14px] rounded-[12px] border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 text-xs text-[var(--text-muted)]">
          <strong className="text-[var(--foreground)]">Mês selecionado: {monthLabel(`${data.period.year}-${String(data.period.month).padStart(2, '0')}`)}.</strong>{' '}
          Resumo, planejamento, categorias, transações recentes e patrimônio usam esse período; saldo de caixa, cartões, metas, compromissos e projeção usam a referência atual ({dashboardLogicalDateLabel(home.scope.currentAsOf)}).
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

      {!isDesktop && (
        <div className="mt-[14px]">
          <MobileDashboardHome
            home={home}
            showValues={showValues}
            commitments={commitments}
            recentTransactions={recentTransactions}
            topCategories={topCategories}
            netWorth={netWorth}
            onRetry={onRetry}
          />
        </div>
      )}

      {isDesktop && (
        <>
        <section className="mt-[14px] grid gap-[14px] xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
          <MonthPaceCard
            data={data}
            relation={home.scope.selectedPeriodRelation}
            today={home.scope.currentAsOf.day}
            showValues={showValues}
          />
          <CategoriesCard categories={topCategories} limits={data.limits} showValues={showValues} currency={data.currency} period={data.period} />
        </section>

        <section className="mt-[14px] grid gap-[14px] xl:grid-cols-[minmax(0,1fr)_minmax(0,1.36fr)]">
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
        </section>

        <section className="mt-[14px] grid items-start gap-[14px] xl:grid-cols-3" aria-label="Visão geral">
          {data.cards.length > 0 && (
            <div className="min-w-0">
              <CreditCardsCard
                cards={data.cards}
                showValues={showValues}
                currency={data.currency}
              />
            </div>
          )}
          {data.goals.length > 0 && (
            <div className="min-w-0">
              <FinancialGoalsCard
                goals={data.goals}
                showValues={showValues}
                currency={data.currency}
              />
            </div>
          )}
          <div className="min-w-0">
            <NetWorthSummaryCard
              currency={data.currency}
              showValues={showValues}
              summary={netWorth}
              period={data.period}
            />
          </div>
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
        <div className="h-[330px] animate-pulse rounded-[14px] bg-[var(--skeleton)]" />
        <div className="h-[250px] animate-pulse rounded-[14px] bg-[var(--skeleton)]" />
        <div className="h-[420px] animate-pulse rounded-[14px] bg-[var(--skeleton)]" />
        <div className="h-[220px] animate-pulse rounded-[14px] bg-[var(--skeleton)]" />
      </div>

      <div className="hidden space-y-[14px] lg:block">
        <div className="grid gap-[14px] xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <div className="h-[330px] animate-pulse rounded-[14px] bg-[var(--skeleton)]" />
          <div className="h-[330px] animate-pulse rounded-[14px] bg-[var(--skeleton)]" />
        </div>
        <div className="grid gap-[14px] xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
          <div className="h-[420px] animate-pulse rounded-[14px] bg-[var(--skeleton)]" />
          <div className="h-[420px] animate-pulse rounded-[14px] bg-[var(--skeleton)]" />
        </div>
        <div className="grid gap-[14px] xl:grid-cols-[minmax(0,1fr)_minmax(0,1.36fr)]">
          <div className="h-[278px] animate-pulse rounded-[14px] bg-[var(--skeleton)]" />
          <div className="h-[278px] animate-pulse rounded-[14px] bg-[var(--skeleton)]" />
        </div>
      </div>
    </div>
  );
}
