'use client';

import Link from 'next/link';
import { useState, type ReactNode } from 'react';
import {
  FaArrowDown,
  FaArrowUp,
  FaChartLine,
  FaChevronLeft,
  FaChevronRight,
  FaExclamationTriangle,
  FaWallet,
} from 'react-icons/fa';

import { ProtectedRoute } from '@/app/components/layout';
import { IconRenderer, Input, Select } from '@/app/components/ui';
import { useAuth } from '@/app/context';
import { useMonthlyDashboard } from '@/app/hooks/dashboard/use-monthly-dashboard';
import { currencyOptions } from '@/app/lib/constants/account.constants';
import { formatCurrency } from '@/app/lib/currency/format-currency';
import type { DashboardComparisonMetric, MonthlyDashboard } from '@/app/types/dashboard';
import type { SupportedCurrency } from '@/app/types/financial-summary';

const monthFormatter = new Intl.DateTimeFormat('pt-BR', {
  month: 'short',
  year: '2-digit',
  timeZone: 'UTC',
});

type DashboardView = 'summary' | 'spending' | 'limits' | 'accounts';
type OrbitTone = 'primary' | 'income' | 'warning' | 'expense' | 'neutral';

type OrbitItem = {
  key: string;
  icon: string;
  label: string;
  detail: string;
  href?: string;
  tone: OrbitTone;
};

const dashboardViews: { key: DashboardView; label: string }[] = [
  { key: 'summary', label: 'Resumo' },
  { key: 'spending', label: 'Gastos' },
  { key: 'limits', label: 'Limites' },
  { key: 'accounts', label: 'Contas' },
];

const orbitNodePositions: React.CSSProperties[] = [
  { left: '14%', top: '14%' },
  { right: '10%', top: '22%' },
  { right: '14%', bottom: '16%' },
  { left: '23%', bottom: '9%' },
  { left: '-1%', top: '46%' },
];

function displayMoney(amount: number, showValues: boolean, currency: string) {
  return showValues ? formatCurrency(amount, currency) : '••••';
}

function periodLabel(year: number, month: number) {
  return monthFormatter.format(new Date(Date.UTC(year, month - 1, 1))).replace('.', '');
}

function comparisonLabel(
  metric: DashboardComparisonMetric,
  showValues: boolean,
  currency: string,
) {
  const difference = displayMoney(Math.abs(metric.difference), showValues, currency);

  if (metric.percentage === null) {
    return metric.difference === 0
      ? 'Sem base comparável no mês anterior'
      : `Sem base percentual · diferença de ${difference}`;
  }

  const signal = metric.percentage > 0 ? '+' : '';
  const direction =
    metric.difference > 0 ? 'a mais' : metric.difference < 0 ? 'a menos' : 'sem mudança';
  return `${signal}${metric.percentage.toLocaleString('pt-BR')}% · ${difference} ${direction}`;
}

function toneTextClass(tone: OrbitTone) {
  if (tone === 'income') return 'text-[var(--income)]';
  if (tone === 'warning') return 'text-[var(--warning)]';
  if (tone === 'expense') return 'text-[var(--expense)]';
  if (tone === 'primary') return 'text-[var(--orbit-primary)]';
  return 'text-[var(--foreground)]';
}

export default function Dashboard() {
  const { user } = useAuth();
  const {
    data,
    loading,
    error,
    periodValue,
    currency,
    setPeriodValue,
    setCurrency,
  } = useMonthlyDashboard();
  const showValues = user?.showValues !== false;
  const [activeView, setActiveView] = useState<DashboardView>('summary');

  function shiftPeriod(offset: number) {
    const [year, month] = periodValue.split('-').map(Number);
    const shifted = new Date(year, month - 1 + offset, 1);
    setPeriodValue(
      `${shifted.getFullYear()}-${String(shifted.getMonth() + 1).padStart(2, '0')}`,
    );
  }

  return (
    <ProtectedRoute>
      <header className="flex flex-col gap-4 min-[901px]:flex-row min-[901px]:items-start min-[901px]:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">
            Visão financeira
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-[var(--foreground)] sm:text-[30px]">
            Seu dinheiro em órbita
          </h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Saldo, destinos e compromissos como um único sistema.
          </p>
        </div>

        <div className="flex max-w-full flex-wrap gap-2">
          <button
            type="button"
            onClick={() => shiftPeriod(-1)}
            disabled={loading}
            aria-label="Mês anterior"
            className="grid h-11 w-11 place-items-center rounded-[10px] border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)] disabled:opacity-50"
          >
            <FaChevronLeft aria-hidden="true" />
          </button>
          <div className="w-[170px]">
            <Input
              id="dashboard-period"
              type="month"
              min="2000-01"
              max="2100-12"
              aria-label="Mês do dashboard"
              value={periodValue}
              onChange={(event) => {
                if (event.currentTarget.value) setPeriodValue(event.currentTarget.value);
              }}
              disabled={loading}
            />
          </div>
          <button
            type="button"
            onClick={() => shiftPeriod(1)}
            disabled={loading}
            aria-label="Próximo mês"
            className="grid h-11 w-11 place-items-center rounded-[10px] border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)] disabled:opacity-50"
          >
            <FaChevronRight aria-hidden="true" />
          </button>
          <div className="w-[150px]">
            <Select
              id="dashboard-currency"
              ariaLabel="Moeda do dashboard"
              value={currency}
              options={currencyOptions}
              onChange={(value) => setCurrency(value as SupportedCurrency)}
              disabled={loading}
            />
          </div>
        </div>
      </header>

      <nav
        className="mb-[18px] mt-6 flex max-w-full gap-2 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        aria-label="Visões do dashboard"
      >
        {dashboardViews.map((view) => {
          const active = activeView === view.key;
          return (
            <button
              key={view.key}
              type="button"
              aria-pressed={active}
              aria-controls="dashboard-view-panel"
              onClick={() => setActiveView(view.key)}
              className={`min-h-10 shrink-0 whitespace-nowrap rounded-[10px] border px-3 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)] ${
                active
                  ? 'border-[var(--orbit-primary)]/45 bg-[var(--primary-subtle)] text-[var(--orbit-primary)]'
                  : 'border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)] hover:text-[var(--foreground)]'
              }`}
            >
              {view.label}
            </button>
          );
        })}
      </nav>

      {error && (
        <div
          role="alert"
          className="mb-5 rounded-[12px] border border-[var(--expense)]/35 bg-[var(--danger-subtle)] p-4 text-sm text-[var(--expense)]"
        >
          {error}
        </div>
      )}

      <div id="dashboard-view-panel">
        {loading ? (
          <DashboardLoading />
        ) : data ? (
          <DashboardContent data={data} showValues={showValues} activeView={activeView} />
        ) : null}
      </div>
    </ProtectedRoute>
  );
}

function DashboardContent({
  data,
  showValues,
  activeView,
}: {
  data: MonthlyDashboard;
  showValues: boolean;
  activeView: DashboardView;
}) {
  if (activeView === 'spending') {
    return (
      <div className="grid items-start gap-4 min-[901px]:grid-cols-[1.2fr_1fr_1fr]">
        <CategorySpending
          categories={data.categories}
          totalExpense={data.summary.expense}
          currency={data.currency}
          showValues={showValues}
        />
        <MonthlyFlow
          flow={data.flow}
          currency={data.currency}
          showValues={showValues}
          className="min-[901px]:col-span-2"
        />
      </div>
    );
  }

  if (activeView === 'limits') {
    return (
      <div className="grid items-start gap-4 min-[901px]:grid-cols-[1.2fr_1fr_1fr]">
        <CategoryLimits
          limits={data.limits}
          currency={data.currency}
          showValues={showValues}
          className="min-[901px]:col-span-2"
        />
        <MonthlyStatus data={data} showValues={showValues} />
      </div>
    );
  }

  if (activeView === 'accounts') {
    return <AccountBalances accounts={data.accounts} showValues={showValues} />;
  }

  return <DashboardSummary data={data} showValues={showValues} />;
}

function DashboardSummary({ data, showValues }: { data: MonthlyDashboard; showValues: boolean }) {
  const primaryAccount = data.accounts.find((account) => account.isActive) ?? data.accounts[0] ?? null;
  const criticalLimits = [...data.limits]
    .filter((limit) => limit.percentage >= 80)
    .sort((a, b) => b.percentage - a.percentage);

  return (
    <>
      <div className="grid items-start gap-[18px] min-[901px]:grid-cols-[minmax(520px,1.55fr)_minmax(300px,.8fr)]">
        <OrbitOverview data={data} showValues={showValues} />
        <SummaryRail data={data} showValues={showValues} criticalLimits={criticalLimits} />
      </div>

      <h2 className="mb-3 mt-[26px] text-[15px] font-semibold text-[var(--foreground)]">Fluxo do mês</h2>
      <div className="grid gap-3 min-[901px]:grid-cols-[1.2fr_1fr_1fr] min-[901px]:gap-4">
        <article className="rounded-[18px] border border-[var(--border)] bg-[var(--surface)] p-[18px]">
          <h3 className="text-[15px] font-bold text-[var(--foreground)]">Realizado</h3>
          <p className="mt-1 text-xs text-[var(--text-muted)]">O que já entrou e saiu.</p>
          <MetricRow label="Receitas" value={displayMoney(data.summary.income, showValues, data.currency)} className="text-[var(--income)]" />
          <MetricRow label="Despesas" value={displayMoney(data.summary.expense, showValues, data.currency)} className="text-[var(--expense)]" />
          <MetricRow label="Saldo" value={displayMoney(data.summary.balance, showValues, data.currency)} className={data.summary.balance < 0 ? 'text-[var(--expense)]' : 'text-[var(--income)]'} />
        </article>

        <article className="rounded-[18px] border border-[var(--border)] bg-[var(--surface)] p-[18px]">
          <h3 className="text-[15px] font-bold text-[var(--foreground)]">Limites em atenção</h3>
          <p className="mt-1 text-xs text-[var(--text-muted)]">Categorias a partir de 80% do limite.</p>
          {criticalLimits.length === 0 ? (
            <p className="mt-4 text-sm text-[var(--text-muted)]">Nenhuma categoria crítica neste mês.</p>
          ) : (
            <div className="mt-3 divide-y divide-[var(--border)]">
              {criticalLimits.slice(0, 2).map((limit) => (
                <div key={limit.category.id} className="flex items-center justify-between gap-3 py-3">
                  <span className="min-w-0 truncate text-sm text-[var(--foreground)]">{limit.category.name}</span>
                  <strong className={limit.percentage > 100 ? 'text-[var(--expense)]' : 'text-[var(--warning)]'}>
                    {limit.percentage.toLocaleString('pt-BR')}%
                  </strong>
                </div>
              ))}
            </div>
          )}
          <Link href="/categorias" className="mt-3 inline-flex min-h-10 items-center rounded-[10px] border border-[var(--border)] px-3 text-sm font-semibold text-[var(--foreground)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]">
            Abrir limites
          </Link>
        </article>

        <article className="rounded-[18px] border border-[var(--border)] bg-[var(--surface)] p-[18px]">
          <h3 className="text-[15px] font-bold text-[var(--foreground)]">Conta principal</h3>
          {primaryAccount ? (
            <>
              <p className="mt-1 text-xs text-[var(--text-muted)]">{primaryAccount.name} · {primaryAccount.currency}</p>
              <p className={`my-2 text-[28px] font-extrabold tracking-tight ${primaryAccount.balance < 0 ? 'text-[var(--expense)]' : 'text-[var(--foreground)]'}`}>
                {displayMoney(primaryAccount.balance, showValues, primaryAccount.currency)}
              </p>
              <Link href="/contas" className="inline-flex min-h-10 items-center rounded-[10px] border border-[var(--border)] px-3 text-sm font-semibold text-[var(--foreground)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]">
                Abrir conta
              </Link>
            </>
          ) : (
            <p className="mt-4 text-sm text-[var(--text-muted)]">Nenhuma conta cadastrada.</p>
          )}
        </article>
      </div>
    </>
  );
}

function OrbitOverview({ data, showValues }: { data: MonthlyDashboard; showValues: boolean }) {
  const account = data.accounts.find((item) => item.isActive) ?? data.accounts[0];
  const categories = data.categories.slice(0, 2);
  const mostUsedLimit = [...data.limits].sort((a, b) => b.percentage - a.percentage)[0];

  const orbitItems: OrbitItem[] = [];

  if (categories[0]) {
    orbitItems.push({
      key: `category-${categories[0].id}`,
      icon: '↗',
      label: categories[0].name,
      detail: `${displayMoney(categories[0].realized, showValues, data.currency)} · ${categories[0].sharePercentage.toLocaleString('pt-BR')}% das despesas`,
      href: '/categorias',
      tone: 'primary',
    });
  }

  if (mostUsedLimit) {
    orbitItems.push({
      key: `limit-${mostUsedLimit.category.id}`,
      icon: '◎',
      label: mostUsedLimit.category.name,
      detail: `${mostUsedLimit.percentage.toLocaleString('pt-BR')}% do limite mensal`,
      href: '/categorias',
      tone: mostUsedLimit.percentage > 100 ? 'expense' : mostUsedLimit.percentage >= 80 ? 'warning' : 'income',
    });
  }

  if (categories[1]) {
    orbitItems.push({
      key: `category-${categories[1].id}`,
      icon: '◷',
      label: categories[1].name,
      detail: `${displayMoney(categories[1].realized, showValues, data.currency)} · ${categories[1].sharePercentage.toLocaleString('pt-BR')}% das despesas`,
      href: '/categorias',
      tone: 'warning',
    });
  }

  orbitItems.push({
    key: 'income',
    icon: '↑',
    label: 'Receitas',
    detail: `${displayMoney(data.summary.income, showValues, data.currency)} realizadas no mês`,
    tone: 'income',
  });

  if (account) {
    orbitItems.push({
      key: `account-${account.id}`,
      icon: '▣',
      label: account.name,
      detail: `${displayMoney(account.balance, showValues, account.currency)} · ${account.currency}`,
      href: '/contas',
      tone: 'primary',
    });
  }

  const visibleItems = orbitItems.slice(0, 5);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const selectedItem = visibleItems.find((item) => item.key === selectedKey) ?? null;

  return (
    <section className="min-h-[450px] overflow-hidden rounded-[18px] border border-[var(--border)] bg-[var(--surface)] p-4 sm:min-h-[480px] sm:p-5 min-[901px]:min-h-[535px] min-[901px]:p-[22px]" aria-labelledby="dashboard-orbit-title">
      <h2 id="dashboard-orbit-title" className="text-base font-bold text-[var(--foreground)]">Mapa do mês</h2>
      <p className="mt-1 text-sm text-[var(--text-muted)]">Clique em um ponto para explorar.</p>

      <div className="relative mx-auto mt-5 h-[245px] w-[245px] rounded-full border border-[var(--border-strong)] sm:h-[280px] sm:w-[280px] min-[901px]:mt-6 min-[901px]:h-[340px] min-[901px]:w-[340px]">
        <span className="absolute inset-[13%] rounded-full border border-[var(--border)]" aria-hidden="true" />
        <span className="absolute inset-[27%] rounded-full border border-[var(--income)]/25" aria-hidden="true" />
        <div className="absolute left-1/2 top-1/2 grid h-[116px] w-[116px] -translate-x-1/2 -translate-y-1/2 place-content-center rounded-full border border-[var(--income)]/40 bg-[var(--surface-raised)] px-2 text-center sm:h-32 sm:w-32 min-[901px]:h-[148px] min-[901px]:w-[148px]">
          <strong className={`text-lg font-bold sm:text-xl min-[901px]:text-2xl ${data.summary.balance < 0 ? 'text-[var(--expense)]' : 'text-[var(--income)]'}`}>
            {displayMoney(data.summary.balance, showValues, data.currency)}
          </strong>
          <span className="mt-1 text-[10px] text-[var(--text-muted)] min-[901px]:text-[11px]">saldo realizado</span>
        </div>

        {visibleItems.map((item, index) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setSelectedKey(item.key)}
            aria-pressed={selectedKey === item.key}
            aria-label={`${item.label}. ${item.detail}`}
            className={`absolute grid h-[42px] w-[42px] place-items-center rounded-full border bg-[var(--surface-raised)] text-sm font-extrabold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[var(--focus)] min-[901px]:h-[46px] min-[901px]:w-[46px] ${toneTextClass(item.tone)} ${selectedKey === item.key ? 'ring-2 ring-white ring-offset-3 ring-offset-[var(--surface)]' : ''}`}
            style={orbitNodePositions[index] ?? orbitNodePositions[0]}
          >
            {item.icon}
            <span className="absolute top-[52px] hidden w-[108px] text-center text-[11px] font-semibold leading-tight text-[var(--foreground)] min-[901px]:block">
              {item.label}
              <small className={`mt-0.5 block truncate font-semibold ${toneTextClass(item.tone)}`}>{item.detail.split(' · ')[0]}</small>
            </span>
          </button>
        ))}
      </div>

      {selectedItem && (
        <div className="mt-4 rounded-xl border border-[var(--orbit-primary)]/35 bg-[var(--primary-subtle)] p-3" role="status" aria-live="polite">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-[var(--foreground)]">{selectedItem.label}</p>
              <p className="mt-0.5 break-words text-xs text-[var(--text-muted)]">{selectedItem.detail}</p>
            </div>
            {selectedItem.href && (
              <Link href={selectedItem.href} className="inline-flex min-h-9 shrink-0 items-center rounded-[9px] border border-[var(--border)] px-2.5 text-xs font-semibold text-[var(--foreground)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]">
                Explorar
              </Link>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

function SummaryRail({
  data,
  showValues,
  criticalLimits,
}: {
  data: MonthlyDashboard;
  showValues: boolean;
  criticalLimits: MonthlyDashboard['limits'];
}) {
  const attention = criticalLimits[0] ?? null;

  return (
    <aside className="grid gap-3.5 sm:grid-cols-2 min-[901px]:grid-cols-1" aria-label="Indicadores do mês">
      <article className="rounded-[18px] border border-[var(--border)] bg-[var(--surface)] p-[18px]">
        <p className="text-xs text-[var(--text-muted)]">SALDO DO PERÍODO</p>
        <strong className={`my-2 block text-[28px] font-extrabold ${data.summary.balance < 0 ? 'text-[var(--expense)]' : 'text-[var(--income)]'}`}>
          {displayMoney(data.summary.balance, showValues, data.currency)}
        </strong>
        <small className="text-xs text-[var(--text-muted)]">
          {comparisonLabel(data.comparison.balance, showValues, data.currency)}
        </small>
      </article>

      <article className="rounded-[18px] border border-[var(--border)] bg-[var(--surface)] p-[18px]">
        <p className="text-xs text-[var(--text-muted)]">DESPESAS REALIZADAS</p>
        <strong className="my-2 block text-[28px] font-extrabold text-[var(--expense)]">
          {displayMoney(data.summary.expense, showValues, data.currency)}
        </strong>
        <small className="text-xs text-[var(--text-muted)]">
          {comparisonLabel(data.comparison.expense, showValues, data.currency)}
        </small>
      </article>

      <article className="col-span-full rounded-[18px] border border-[var(--border)] bg-[var(--surface)] p-4 min-[901px]:col-span-1">
        <div className="flex items-center gap-2">
          <FaExclamationTriangle className={attention ? 'text-[var(--warning)]' : 'text-[var(--text-muted)]'} aria-hidden="true" />
          <strong className="text-sm text-[var(--foreground)]">Atenção agora</strong>
        </div>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          {attention
            ? `${attention.category.name} está em ${attention.percentage.toLocaleString('pt-BR')}% do limite.`
            : 'Nenhum limite da moeda selecionada chegou a 80% neste mês.'}
        </p>
        <Link href="/categorias" className="mt-3 inline-flex min-h-10 items-center rounded-[10px] border border-[var(--border)] px-3 text-sm font-semibold text-[var(--foreground)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]">
          Revisar cenário
        </Link>
      </article>
    </aside>
  );
}

function MetricRow({ label, value, className }: { label: string; value: string; className: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-t border-[var(--border)] py-3 first:mt-3">
      <span className="text-sm text-[var(--foreground)]">{label}</span>
      <strong className={`text-sm ${className}`}>{value}</strong>
    </div>
  );
}

function MonthlyStatus({ data, showValues }: { data: MonthlyDashboard; showValues: boolean }) {
  const criticalLimits = data.limits
    .filter((limit) => limit.percentage >= 80)
    .sort((a, b) => b.percentage - a.percentage)
    .slice(0, 3);

  return (
    <aside className="space-y-4" aria-label="Situação do mês">
      <section className="rounded-[18px] border border-[var(--border)] bg-[var(--surface)] p-5" aria-labelledby="dashboard-status-title">
        <div className="flex items-center gap-2">
          <FaChartLine className="text-[var(--orbit-primary)]" aria-hidden="true" />
          <h2 id="dashboard-status-title" className="text-lg font-bold text-[var(--foreground)]">Como está o mês</h2>
        </div>
        <dl className="mt-4 space-y-4">
          <StatusMetric
            label="Receitas realizadas"
            value={data.summary.income}
            comparison={data.comparison.income}
            currency={data.currency}
            showValues={showValues}
            icon={<FaArrowUp aria-hidden="true" />}
            className="text-[var(--income)]"
          />
          <StatusMetric
            label="Despesas realizadas"
            value={data.summary.expense}
            comparison={data.comparison.expense}
            currency={data.currency}
            showValues={showValues}
            icon={<FaArrowDown aria-hidden="true" />}
            className="text-[var(--expense)]"
          />
          <StatusMetric
            label="Saldo do período"
            value={data.summary.balance}
            comparison={data.comparison.balance}
            currency={data.currency}
            showValues={showValues}
            icon={<FaChartLine aria-hidden="true" />}
            className={data.summary.balance < 0 ? 'text-[var(--expense)]' : 'text-[var(--foreground)]'}
          />
        </dl>
      </section>

      <section className="rounded-[18px] border border-[var(--border)] bg-[var(--surface)] p-5" aria-labelledby="dashboard-attention-title">
        <div className="flex items-center gap-2">
          <FaExclamationTriangle className={criticalLimits.length ? 'text-[var(--warning)]' : 'text-[var(--text-muted)]'} aria-hidden="true" />
          <h2 id="dashboard-attention-title" className="text-lg font-bold text-[var(--foreground)]">Atenção agora</h2>
        </div>
        {criticalLimits.length === 0 ? (
          <p className="mt-3 text-sm text-[var(--text-muted)]">Nenhum limite da moeda selecionada chegou a 80% de uso neste mês.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {criticalLimits.map((limit) => (
              <li key={limit.category.id} className="rounded-xl bg-[var(--surface-raised)] p-3">
                <p className="font-semibold text-[var(--foreground)]">{limit.category.name}</p>
                <p className="mt-0.5 text-sm text-[var(--text-muted)]">
                  {limit.percentage.toLocaleString('pt-BR')}% usado · restante {displayMoney(limit.remaining, showValues, data.currency)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </aside>
  );
}

function StatusMetric({
  label,
  value,
  comparison,
  currency,
  showValues,
  icon,
  className,
}: {
  label: string;
  value: number;
  comparison: DashboardComparisonMetric;
  currency: SupportedCurrency;
  showValues: boolean;
  icon: ReactNode;
  className: string;
}) {
  return (
    <div className="border-b border-[var(--border)] pb-4 last:border-0 last:pb-0">
      <dt className="flex items-center gap-2 text-sm font-semibold text-[var(--text-muted)]">
        <span className={className}>{icon}</span>
        {label}
      </dt>
      <dd className={`mt-1 text-2xl font-bold tracking-tight ${className}`}>{displayMoney(value, showValues, currency)}</dd>
      <dd className="mt-1 text-sm text-[var(--text-muted)]">{comparisonLabel(comparison, showValues, currency)}</dd>
    </div>
  );
}

function MonthlyFlow({
  flow,
  currency,
  showValues,
  className = '',
}: {
  flow: MonthlyDashboard['flow'];
  currency: SupportedCurrency;
  showValues: boolean;
  className?: string;
}) {
  const maxValue = Math.max(1, ...flow.flatMap((item) => [item.income, item.expense]));

  return (
    <section className={`rounded-[18px] border border-[var(--border)] bg-[var(--surface)] p-5 ${className}`} aria-labelledby="dashboard-flow-title">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--text-muted)]">Evolução recente</p>
          <h2 id="dashboard-flow-title" className="mt-1 text-lg font-bold text-[var(--foreground)]">Últimos 6 meses</h2>
        </div>
        <span className="text-sm font-semibold text-[var(--text-muted)]">{currency}</span>
      </div>

      <ul className="mt-4 space-y-4">
        {flow.map((item) => (
          <li key={`${item.year}-${item.month}`} className="grid gap-2 sm:grid-cols-[88px_minmax(0,1fr)] sm:items-center">
            <p className="text-sm font-semibold capitalize text-[var(--foreground)]">{periodLabel(item.year, item.month)}</p>
            <div className="space-y-2">
              <FlowBar
                label="Receitas"
                value={item.income}
                width={Math.round((item.income / maxValue) * 100)}
                className="bg-[var(--income)]"
                currency={currency}
                showValues={showValues}
              />
              <FlowBar
                label="Despesas"
                value={item.expense}
                width={Math.round((item.expense / maxValue) * 100)}
                className="bg-[var(--expense)]"
                currency={currency}
                showValues={showValues}
              />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function FlowBar({
  label,
  value,
  width,
  className,
  currency,
  showValues,
}: {
  label: string;
  value: number;
  width: number;
  className: string;
  currency: SupportedCurrency;
  showValues: boolean;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-3 text-sm">
        <span className="text-[var(--text-muted)]">{label}</span>
        <span className="font-medium text-[var(--foreground)]">{displayMoney(value, showValues, currency)}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-[var(--surface-subtle)]" aria-hidden="true">
        <div className={`h-full rounded-full ${className}`} style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

function AccountBalances({
  accounts,
  showValues,
}: {
  accounts: MonthlyDashboard['accounts'];
  showValues: boolean;
}) {
  return (
    <section className="rounded-[18px] border border-[var(--border)] bg-[var(--surface)] p-5" aria-labelledby="dashboard-accounts-title">
      <div className="flex items-center gap-2">
        <FaWallet className="text-[var(--orbit-primary)]" aria-hidden="true" />
        <h2 id="dashboard-accounts-title" className="text-xl font-bold text-[var(--foreground)]">Saldos atuais</h2>
      </div>
      <p className="mt-1 text-sm text-[var(--text-muted)]">Cada conta mantém sua própria moeda; estes saldos nunca são somados entre si.</p>

      {accounts.length === 0 ? (
        <EmptyState text="Nenhuma conta cadastrada." />
      ) : (
        <ul className="mt-5 divide-y divide-[var(--border)]">
          {accounts.map((account) => (
            <li key={account.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[11px] text-white" style={{ backgroundColor: account.color }} aria-hidden="true">
                <IconRenderer iconName={account.icon} size={18} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate text-base font-semibold text-[var(--foreground)]">{account.name}</p>
                  {!account.isActive && <span className="rounded-full border border-[var(--border)] px-2 py-0.5 text-xs text-[var(--text-muted)]">Inativa</span>}
                </div>
                <p className="text-sm text-[var(--text-muted)]">{account.currency}</p>
              </div>
              <p className={`shrink-0 text-right text-base font-bold ${account.balance < 0 ? 'text-[var(--expense)]' : 'text-[var(--foreground)]'}`}>
                {displayMoney(account.balance, showValues, account.currency)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function CategorySpending({
  categories,
  totalExpense,
  currency,
  showValues,
}: {
  categories: MonthlyDashboard['categories'];
  totalExpense: number;
  currency: SupportedCurrency;
  showValues: boolean;
}) {
  return (
    <section className="rounded-[18px] border border-[var(--border)] bg-[var(--surface)] p-5" aria-labelledby="dashboard-categories-title">
      <h2 id="dashboard-categories-title" className="text-lg font-bold text-[var(--foreground)]">Despesas por categoria</h2>
      <p className="mt-1 text-sm text-[var(--text-muted)]">{displayMoney(totalExpense, showValues, currency)} no período.</p>

      {categories.length === 0 ? (
        <EmptyState text={`Nenhuma despesa concluída em ${currency} neste mês.`} />
      ) : (
        <ul className="mt-4 space-y-4">
          {categories.map((category) => (
            <li key={category.id}>
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] text-white" style={{ backgroundColor: category.color }} aria-hidden="true">
                  <IconRenderer iconName={category.icon} size={16} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                    <p className="truncate text-sm font-semibold text-[var(--foreground)]">{category.name}</p>
                    <p className="text-sm font-medium text-[var(--foreground)]">{displayMoney(category.realized, showValues, currency)} · {category.sharePercentage.toLocaleString('pt-BR')}%</p>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--surface-subtle)]" aria-hidden="true">
                    <div className="h-full rounded-full" style={{ width: `${Math.min(100, category.sharePercentage)}%`, backgroundColor: category.color }} />
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function CategoryLimits({
  limits,
  currency,
  showValues,
  className = '',
}: {
  limits: MonthlyDashboard['limits'];
  currency: SupportedCurrency;
  showValues: boolean;
  className?: string;
}) {
  const sortedLimits = [...limits].sort((a, b) => b.percentage - a.percentage);

  return (
    <section className={`rounded-[18px] border border-[var(--border)] bg-[var(--surface)] p-5 ${className}`} aria-labelledby="dashboard-limits-title">
      <h2 id="dashboard-limits-title" className="text-lg font-bold text-[var(--foreground)]">Limites por categoria</h2>
      <p className="mt-1 text-sm text-[var(--text-muted)]">Limites de {currency} ordenados por maior utilização.</p>

      {sortedLimits.length === 0 ? (
        <EmptyState text={`Nenhum limite em ${currency} definido para este mês.`} />
      ) : (
        <ul className="mt-4 space-y-4">
          {sortedLimits.map((limit) => {
            const exceeded = limit.percentage > 100;
            const attention = limit.percentage >= 80 && limit.percentage <= 100;
            const progress = Math.min(100, Math.max(0, limit.percentage));

            return (
              <li key={limit.category.id}>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-sm font-semibold text-[var(--foreground)]">{limit.category.name}</p>
                  <p className={`text-sm font-semibold ${exceeded ? 'text-[var(--expense)]' : attention ? 'text-[var(--warning)]' : 'text-[var(--text-muted)]'}`}>
                    {limit.percentage.toLocaleString('pt-BR')}% · {displayMoney(limit.realized, showValues, currency)} de {displayMoney(limit.amount, showValues, currency)}
                  </p>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--surface-subtle)]" role="progressbar" aria-label={`Uso do limite de ${limit.category.name} em ${currency}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress)} aria-valuetext={`${limit.percentage.toLocaleString('pt-BR')}% utilizado em ${currency}`}>
                  <div className={`h-full rounded-full ${exceeded ? 'bg-[var(--expense)]' : attention ? 'bg-[var(--warning)]' : 'bg-[var(--orbit-primary)]'}`} style={{ width: `${progress}%` }} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function EmptyState({ text }: { text: string }) {
  return <p className="mt-5 rounded-xl border border-dashed border-[var(--border-strong)] p-4 text-sm text-[var(--text-muted)]">{text}</p>;
}

function DashboardLoading() {
  return (
    <div className="space-y-5" role="status" aria-label="Carregando dashboard financeiro">
      <div className="grid gap-[18px] min-[901px]:grid-cols-[minmax(520px,1.55fr)_minmax(300px,.8fr)]">
        <div className="h-[535px] animate-pulse rounded-[18px] border border-[var(--border)] bg-[var(--skeleton)]" />
        <div className="grid gap-3.5">
          <div className="h-40 animate-pulse rounded-[18px] border border-[var(--border)] bg-[var(--skeleton)]" />
          <div className="h-40 animate-pulse rounded-[18px] border border-[var(--border)] bg-[var(--skeleton)]" />
          <div className="h-32 animate-pulse rounded-[18px] border border-[var(--border)] bg-[var(--skeleton)]" />
        </div>
      </div>
    </div>
  );
}
