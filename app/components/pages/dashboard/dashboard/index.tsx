'use client';

import Link from 'next/link';
import { useState, type ReactNode } from 'react';
import {
  FaArrowDown,
  FaArrowUp,
  FaChartLine,
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

type OrbitItem = {
  key: string;
  label: string;
  eyebrow: string;
  detail: string;
  href?: string;
  tone: 'primary' | 'income' | 'warning' | 'neutral';
};

const dashboardViews: { key: DashboardView; label: string }[] = [
  { key: 'summary', label: 'Resumo' },
  { key: 'spending', label: 'Gastos' },
  { key: 'limits', label: 'Limites' },
  { key: 'accounts', label: 'Contas' },
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

  return (
    <ProtectedRoute>
      <header className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0 max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--orbit-primary)]">
            Visão financeira Orbit
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-[var(--foreground)]">Dashboard</h1>
          <p className="mt-1 text-sm leading-relaxed text-[var(--text-muted)]">
            Leia o mês por contexto: realizado, destinos do dinheiro e pontos que pedem atenção. Agregados usam somente a moeda selecionada.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:shrink-0">
          <div className="min-w-0 sm:w-44">
            <Select
              id="dashboard-currency"
              label="Moeda"
              value={currency}
              options={currencyOptions}
              onChange={(value) => setCurrency(value as SupportedCurrency)}
              disabled={loading}
            />
          </div>
          <div className="min-w-0 sm:w-52">
            <Input
              id="dashboard-period"
              type="month"
              min="2000-01"
              max="2100-12"
              label="Mês"
              value={periodValue}
              onChange={(event) => {
                if (event.currentTarget.value) setPeriodValue(event.currentTarget.value);
              }}
              disabled={loading}
            />
          </div>
        </div>
      </header>

      <nav
        className="mb-5 flex max-w-full gap-1 overflow-x-auto rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] p-1"
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
              className={`min-h-10 whitespace-nowrap rounded-[var(--radius-sm)] px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)] ${
                active
                  ? 'bg-[var(--primary-subtle)] text-[var(--orbit-primary)]'
                  : 'text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]'
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
          className="mb-5 rounded-[var(--radius-md)] border border-[var(--danger)]/35 bg-[var(--danger-subtle)] p-4 text-base text-[var(--expense)]"
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
      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)]">
        <CategorySpending
          categories={data.categories}
          totalExpense={data.summary.expense}
          currency={data.currency}
          showValues={showValues}
        />
        <MonthlyFlow flow={data.flow} currency={data.currency} showValues={showValues} />
      </div>
    );
  }

  if (activeView === 'limits') {
    return (
      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(340px,0.9fr)]">
        <CategoryLimits limits={data.limits} currency={data.currency} showValues={showValues} />
        <MonthlyStatus data={data} showValues={showValues} />
      </div>
    );
  }

  if (activeView === 'accounts') {
    return <AccountBalances accounts={data.accounts} showValues={showValues} />;
  }

  return (
    <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(340px,0.6fr)]">
      <OrbitOverview data={data} showValues={showValues} />
      <MonthlyStatus data={data} showValues={showValues} />
    </div>
  );
}

function OrbitOverview({ data, showValues }: { data: MonthlyDashboard; showValues: boolean }) {
  const account = data.accounts.find((item) => item.isActive) ?? data.accounts[0];
  const categories = data.categories.slice(0, 2);
  const mostUsedLimit = [...data.limits].sort((a, b) => b.percentage - a.percentage)[0];

  const orbitItems: OrbitItem[] = [
    {
      key: 'balance',
      label: 'Saldo realizado',
      eyebrow: 'Centro do mês',
      detail: `${displayMoney(data.summary.balance, showValues, data.currency)} em ${data.currency}`,
      tone: data.summary.balance < 0 ? 'warning' : 'income',
    },
  ];

  if (account) {
    orbitItems.push({
      key: `account-${account.id}`,
      label: account.name,
      eyebrow: 'Conta em destaque',
      detail: `${displayMoney(account.balance, showValues, account.currency)} · ${account.currency}`,
      href: '/contas',
      tone: 'primary',
    });
  }

  categories.forEach((category) => {
    orbitItems.push({
      key: `category-${category.id}`,
      label: category.name,
      eyebrow: 'Destino do dinheiro',
      detail: `${category.sharePercentage.toLocaleString('pt-BR')}% das despesas · ${displayMoney(category.realized, showValues, data.currency)}`,
      href: '/categorias',
      tone: 'neutral',
    });
  });

  if (mostUsedLimit) {
    orbitItems.push({
      key: `limit-${mostUsedLimit.category.id}`,
      label: mostUsedLimit.category.name,
      eyebrow: 'Limite em destaque',
      detail: `${mostUsedLimit.percentage.toLocaleString('pt-BR')}% usado · restante ${displayMoney(mostUsedLimit.remaining, showValues, data.currency)}`,
      href: '/categorias',
      tone: mostUsedLimit.percentage >= 80 ? 'warning' : 'primary',
    });
  }

  const [selectedKey, setSelectedKey] = useState('balance');
  const selectedItem = orbitItems.find((item) => item.key === selectedKey) ?? orbitItems[0];
  const orbitPoints = orbitItems.filter((item) => item.key !== 'balance').slice(0, 4);
  const positions = [
    'left-[2%] top-[42%]',
    'right-[1%] top-[12%]',
    'right-[5%] bottom-[8%]',
    'left-[16%] top-[4%]',
  ];

  return (
    <section className="ds-panel overflow-hidden p-5 sm:p-6" aria-labelledby="dashboard-orbit-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--orbit-primary)]">
            Mapa do mês
          </p>
          <h2 id="dashboard-orbit-title" className="mt-1 text-xl font-semibold text-[var(--foreground)]">
            Seu dinheiro em órbita
          </h2>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-[var(--text-muted)]">
            Explore os pontos do mês. A geometria é complementar: seleção, rótulo e contexto também funcionam sem depender da posição ou da cor.
          </p>
        </div>
        <span className="rounded-full border border-[var(--border-strong)] px-2.5 py-1 text-sm font-semibold text-[var(--text-muted)]">
          {data.currency}
        </span>
      </div>

      <div className="mt-5 sm:hidden">
        <button
          type="button"
          onClick={() => setSelectedKey('balance')}
          aria-pressed={selectedKey === 'balance'}
          className={`w-full rounded-[var(--radius-lg)] border p-5 text-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)] ${
            selectedKey === 'balance'
              ? 'border-[var(--orbit-primary)] bg-[var(--primary-subtle)]'
              : 'border-[var(--border)] bg-[var(--surface-raised)]'
          }`}
        >
          <span className="text-sm font-medium text-[var(--text-muted)]">Saldo realizado</span>
          <strong
            className={`mt-1 block break-words text-2xl font-bold tracking-tight ${
              data.summary.balance < 0 ? 'text-[var(--expense)]' : 'text-[var(--foreground)]'
            }`}
          >
            {displayMoney(data.summary.balance, showValues, data.currency)}
          </strong>
        </button>

        {orbitPoints.length > 0 && (
          <div className="mt-3 grid grid-cols-2 gap-2">
            {orbitPoints.map((item) => (
              <OrbitPointButton
                key={item.key}
                item={item}
                selected={selectedItem.key === item.key}
                onSelect={() => setSelectedKey(item.key)}
              />
            ))}
          </div>
        )}
      </div>

      <div className="relative mx-auto mt-6 hidden aspect-square w-full max-w-[500px] sm:block">
        <div className="absolute inset-[7%] rounded-full border border-[var(--border-strong)]" aria-hidden="true" />
        <div className="absolute inset-[24%] rounded-full border border-[var(--orbit-primary)]/25" aria-hidden="true" />
        <div className="absolute inset-[38%] rounded-full border border-[var(--income)]/25" aria-hidden="true" />

        <button
          type="button"
          onClick={() => setSelectedKey('balance')}
          aria-pressed={selectedItem.key === 'balance'}
          className={`absolute inset-1/2 flex h-40 w-40 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border bg-[var(--surface-raised)] px-3 text-center shadow-[var(--shadow-surface)] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--focus)] ${
            selectedItem.key === 'balance'
              ? 'border-[var(--orbit-primary)]'
              : 'border-[var(--income)]/35 hover:border-[var(--orbit-primary)]/60'
          }`}
        >
          <span className="text-sm font-medium text-[var(--text-muted)]">Saldo realizado</span>
          <strong
            className={`mt-1 max-w-[130px] break-words text-2xl font-bold tracking-tight ${
              data.summary.balance < 0 ? 'text-[var(--expense)]' : 'text-[var(--foreground)]'
            }`}
          >
            {displayMoney(data.summary.balance, showValues, data.currency)}
          </strong>
          <span className="mt-1 text-sm text-[var(--text-subtle)]">no período</span>
        </button>

        {orbitPoints.map((item, index) => (
          <div key={item.key} className={`absolute ${positions[index] ?? positions[0]} w-36`}>
            <OrbitPointButton
              item={item}
              selected={selectedItem.key === item.key}
              onSelect={() => setSelectedKey(item.key)}
            />
          </div>
        ))}
      </div>

      <div
        className="mt-5 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-subtle)] p-4"
        role="status"
        aria-live="polite"
      >
        <p className="text-sm font-semibold uppercase tracking-[0.1em] text-[var(--text-subtle)]">
          {selectedItem.eyebrow}
        </p>
        <div className="mt-1 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <h3 className="break-words text-lg font-semibold text-[var(--foreground)]">{selectedItem.label}</h3>
            <p className="mt-1 break-words text-sm text-[var(--text-muted)]">{selectedItem.detail}</p>
          </div>
          {selectedItem.href && (
            <Link
              href={selectedItem.href}
              className="inline-flex min-h-11 shrink-0 items-center rounded-[var(--radius-md)] px-3 py-2 text-sm font-semibold text-[var(--orbit-primary)] transition-colors hover:bg-[var(--primary-subtle)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]"
            >
              Explorar detalhe
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}

function OrbitPointButton({
  item,
  selected,
  onSelect,
}: {
  item: OrbitItem;
  selected: boolean;
  onSelect: () => void;
}) {
  const toneClass =
    item.tone === 'warning'
      ? 'text-[var(--warning)]'
      : item.tone === 'income'
        ? 'text-[var(--income)]'
        : item.tone === 'primary'
          ? 'text-[var(--orbit-primary)]'
          : 'text-[var(--foreground)]';

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`min-h-11 w-full rounded-[var(--radius-md)] border bg-[var(--surface)] px-3 py-2 text-left shadow-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)] ${
        selected
          ? 'border-[var(--orbit-primary)] bg-[var(--primary-subtle)]'
          : 'border-[var(--border-strong)] hover:border-[var(--orbit-primary)]/55'
      }`}
    >
      <span className={`block truncate text-sm font-semibold ${toneClass}`}>{item.label}</span>
      <span className="mt-0.5 block truncate text-sm text-[var(--text-muted)]">{item.detail}</span>
    </button>
  );
}

function MonthlyStatus({ data, showValues }: { data: MonthlyDashboard; showValues: boolean }) {
  const criticalLimits = data.limits
    .filter((limit) => limit.percentage >= 80)
    .sort((a, b) => b.percentage - a.percentage)
    .slice(0, 3);

  return (
    <aside className="space-y-4" aria-label="Situação do mês">
      <section className="ds-panel p-5 sm:p-6" aria-labelledby="dashboard-status-title">
        <div className="flex items-center gap-2">
          <FaChartLine className="text-[var(--orbit-primary)]" aria-hidden="true" />
          <h2 id="dashboard-status-title" className="text-xl font-semibold text-[var(--foreground)]">
            Como está o mês
          </h2>
        </div>
        <dl className="mt-5 space-y-4">
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

      <section className="ds-panel p-5 sm:p-6" aria-labelledby="dashboard-attention-title">
        <div className="flex items-center gap-2">
          <FaExclamationTriangle
            className={criticalLimits.length ? 'text-[var(--warning)]' : 'text-[var(--text-muted)]'}
            aria-hidden="true"
          />
          <h2 id="dashboard-attention-title" className="text-lg font-semibold text-[var(--foreground)]">
            Atenção agora
          </h2>
        </div>
        {criticalLimits.length === 0 ? (
          <p className="mt-3 text-sm leading-relaxed text-[var(--text-muted)]">
            Nenhum limite da moeda selecionada chegou a 80% de uso neste mês.
          </p>
        ) : (
          <ul className="mt-3 space-y-3">
            {criticalLimits.map((limit) => (
              <li key={limit.category.id} className="rounded-[var(--radius-md)] bg-[var(--surface-subtle)] p-3">
                <p className="font-semibold text-[var(--foreground)]">{limit.category.name}</p>
                <p className="mt-0.5 text-sm text-[var(--text-muted)]">
                  {limit.percentage.toLocaleString('pt-BR')}% usado · restante{' '}
                  {displayMoney(limit.remaining, showValues, data.currency)}
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
      <dd className={`mt-1 text-2xl font-bold tracking-tight ${className}`}>
        {displayMoney(value, showValues, currency)}
      </dd>
      <dd className="mt-1 text-sm leading-relaxed text-[var(--text-muted)]">
        {comparisonLabel(comparison, showValues, currency)}
      </dd>
    </div>
  );
}

function MonthlyFlow({
  flow,
  currency,
  showValues,
}: {
  flow: MonthlyDashboard['flow'];
  currency: SupportedCurrency;
  showValues: boolean;
}) {
  const maxValue = Math.max(1, ...flow.flatMap((item) => [item.income, item.expense]));

  return (
    <section className="ds-panel p-5 sm:p-6" aria-labelledby="dashboard-flow-title">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.12em] text-[var(--text-subtle)]">
            Análise complementar
          </p>
          <h2 id="dashboard-flow-title" className="mt-1 text-xl font-semibold text-[var(--foreground)]">
            Fluxo dos últimos 6 meses
          </h2>
        </div>
        <span className="text-sm font-semibold text-[var(--text-muted)]">{currency}</span>
      </div>
      <p className="mt-1 text-sm leading-relaxed text-[var(--text-muted)]">
        Somente transações concluídas de contas em {currency} entram neste fluxo.
      </p>

      <ul className="mt-5 space-y-4">
        {flow.map((item) => (
          <li
            key={`${item.year}-${item.month}`}
            className="grid gap-2 sm:grid-cols-[88px_minmax(0,1fr)] sm:items-center"
          >
            <p className="text-sm font-semibold capitalize text-[var(--foreground)]">
              {periodLabel(item.year, item.month)}
            </p>
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
        <span className="font-medium text-[var(--foreground)]">
          {displayMoney(value, showValues, currency)}
        </span>
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
    <section className="ds-panel p-5 sm:p-6" aria-labelledby="dashboard-accounts-title">
      <div className="flex items-center gap-2">
        <FaWallet className="text-[var(--orbit-primary)]" aria-hidden="true" />
        <h2 id="dashboard-accounts-title" className="text-xl font-semibold text-[var(--foreground)]">
          Saldos atuais
        </h2>
      </div>
      <p className="mt-1 text-sm leading-relaxed text-[var(--text-muted)]">
        Cada conta mantém sua própria moeda; estes saldos nunca são somados entre si.
      </p>

      {accounts.length === 0 ? (
        <EmptyState text="Nenhuma conta cadastrada." />
      ) : (
        <ul className="mt-5 divide-y divide-[var(--border)]">
          {accounts.map((account) => (
            <li key={account.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
              <span
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-md)] text-white"
                style={{ backgroundColor: account.color }}
                aria-hidden="true"
              >
                <IconRenderer iconName={account.icon} size={18} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate text-base font-semibold text-[var(--foreground)]">{account.name}</p>
                  {!account.isActive && (
                    <span className="rounded-full border border-[var(--border-strong)] px-2 py-0.5 text-sm text-[var(--text-muted)]">
                      Inativa
                    </span>
                  )}
                </div>
                <p className="text-sm text-[var(--text-muted)]">{account.currency}</p>
              </div>
              <p
                className={`shrink-0 text-right text-base font-bold ${
                  account.balance < 0 ? 'text-[var(--expense)]' : 'text-[var(--foreground)]'
                }`}
              >
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
    <section className="ds-panel p-5 sm:p-6" aria-labelledby="dashboard-categories-title">
      <h2 id="dashboard-categories-title" className="text-xl font-semibold text-[var(--foreground)]">
        Onde o dinheiro saiu
      </h2>
      <p className="mt-1 text-sm leading-relaxed text-[var(--text-muted)]">
        Participação no total de {displayMoney(totalExpense, showValues, currency)} em {currency}.
      </p>

      {categories.length === 0 ? (
        <EmptyState text={`Nenhuma despesa concluída em ${currency} neste mês.`} />
      ) : (
        <ul className="mt-5 space-y-4">
          {categories.map((category) => (
            <li key={category.id}>
              <div className="flex items-center gap-3">
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] text-white"
                  style={{ backgroundColor: category.color }}
                  aria-hidden="true"
                >
                  <IconRenderer iconName={category.icon} size={16} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                    <p className="truncate text-base font-semibold text-[var(--foreground)]">{category.name}</p>
                    <p className="text-sm font-medium text-[var(--foreground)]">
                      {displayMoney(category.realized, showValues, currency)} ·{' '}
                      {category.sharePercentage.toLocaleString('pt-BR')}%
                    </p>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--surface-subtle)]" aria-hidden="true">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.min(100, category.sharePercentage)}%`,
                        backgroundColor: category.color,
                      }}
                    />
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
}: {
  limits: MonthlyDashboard['limits'];
  currency: SupportedCurrency;
  showValues: boolean;
}) {
  const sortedLimits = [...limits].sort((a, b) => b.percentage - a.percentage);

  return (
    <section className="ds-panel p-5 sm:p-6" aria-labelledby="dashboard-limits-title">
      <h2 id="dashboard-limits-title" className="text-xl font-semibold text-[var(--foreground)]">
        O que precisa de atenção
      </h2>
      <p className="mt-1 text-sm leading-relaxed text-[var(--text-muted)]">
        Limites de {currency} ordenados por maior utilização para reduzir ruído no primeiro olhar.
      </p>

      {sortedLimits.length === 0 ? (
        <EmptyState text={`Nenhum limite em ${currency} definido para este mês.`} />
      ) : (
        <ul className="mt-5 space-y-4">
          {sortedLimits.map((limit) => {
            const exceeded = limit.percentage > 100;
            const attention = limit.percentage >= 80 && limit.percentage <= 100;
            const progress = Math.min(100, Math.max(0, limit.percentage));

            return (
              <li key={limit.category.id}>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-base font-semibold text-[var(--foreground)]">{limit.category.name}</p>
                  <p
                    className={`text-sm font-semibold ${
                      exceeded
                        ? 'text-[var(--expense)]'
                        : attention
                          ? 'text-[var(--warning)]'
                          : 'text-[var(--text-muted)]'
                    }`}
                  >
                    {limit.percentage.toLocaleString('pt-BR')}% ·{' '}
                    {displayMoney(limit.realized, showValues, currency)} de{' '}
                    {displayMoney(limit.amount, showValues, currency)}
                  </p>
                </div>
                <div
                  className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--surface-subtle)]"
                  role="progressbar"
                  aria-label={`Uso do limite de ${limit.category.name} em ${currency}`}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(progress)}
                  aria-valuetext={`${limit.percentage.toLocaleString('pt-BR')}% utilizado em ${currency}`}
                >
                  <div
                    className={`h-full rounded-full ${
                      exceeded
                        ? 'bg-[var(--danger)]'
                        : attention
                          ? 'bg-[var(--warning)]'
                          : 'bg-[var(--orbit-primary)]'
                    }`}
                    style={{ width: `${progress}%` }}
                  />
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
  return (
    <p className="mt-5 rounded-[var(--radius-md)] border border-dashed border-[var(--border-strong)] p-4 text-sm text-[var(--text-muted)]">
      {text}
    </p>
  );
}

function DashboardLoading() {
  return (
    <div className="space-y-5" role="status" aria-label="Carregando dashboard financeiro">
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.55fr)]">
        <div className="ds-panel h-[32rem] animate-pulse bg-[var(--skeleton)]" />
        <div className="space-y-4">
          <div className="ds-panel h-72 animate-pulse bg-[var(--skeleton)]" />
          <div className="ds-panel h-40 animate-pulse bg-[var(--skeleton)]" />
        </div>
      </div>
    </div>
  );
}
