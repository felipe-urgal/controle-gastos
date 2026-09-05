'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import {
  FaArrowDown,
  FaArrowUp,
  FaChartLine,
  FaExclamationTriangle,
  FaWallet,
} from 'react-icons/fa';

import { PageHeader } from '@/app/components/base-pages';
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

  return (
    <ProtectedRoute>
      <PageHeader
        title="Dashboard"
        description="Leia o mês por contexto: realizado, destinos do dinheiro e pontos que pedem atenção."
      />

      <section
        aria-label="Contexto do dashboard"
        className="mb-5 flex flex-col gap-3 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-4 sm:flex-row sm:items-end sm:justify-between"
      >
        <div className="max-w-xl">
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--orbit-primary)]">
            Visão financeira Orbit
          </p>
          <p className="mt-1 text-sm leading-relaxed text-[var(--text-muted)]">
            Todos os agregados abaixo usam somente dados realizados da moeda selecionada. Saldos de contas
            continuam na moeda própria de cada conta.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="min-w-0 sm:w-44">
            <Select
              id="dashboard-currency"
              label="Moeda dos agregados"
              value={currency}
              options={currencyOptions}
              onChange={(value) => setCurrency(value as SupportedCurrency)}
              disabled={loading}
            />
          </div>
          <div className="min-w-0 sm:w-56">
            <Input
              id="dashboard-period"
              type="month"
              min="2000-01"
              max="2100-12"
              label="Mês de referência"
              value={periodValue}
              onChange={(event) => {
                if (event.currentTarget.value) setPeriodValue(event.currentTarget.value);
              }}
              disabled={loading}
            />
          </div>
        </div>
      </section>

      {error && (
        <div
          role="alert"
          className="mb-5 rounded-[var(--radius-md)] border border-[var(--danger)]/35 bg-[var(--danger-subtle)] p-4 text-base text-[var(--expense)]"
        >
          {error}
        </div>
      )}

      {loading ? (
        <DashboardLoading />
      ) : data ? (
        <DashboardContent data={data} showValues={showValues} />
      ) : null}
    </ProtectedRoute>
  );
}

function DashboardContent({ data, showValues }: { data: MonthlyDashboard; showValues: boolean }) {
  return (
    <div className="space-y-5">
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.55fr)]">
        <OrbitOverview data={data} showValues={showValues} />
        <MonthlyStatus data={data} showValues={showValues} />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
        <CategorySpending
          categories={data.categories}
          totalExpense={data.summary.expense}
          currency={data.currency}
          showValues={showValues}
        />
        <CategoryLimits limits={data.limits} currency={data.currency} showValues={showValues} />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
        <MonthlyFlow flow={data.flow} currency={data.currency} showValues={showValues} />
        <AccountBalances accounts={data.accounts} showValues={showValues} />
      </div>
    </div>
  );
}

function OrbitOverview({ data, showValues }: { data: MonthlyDashboard; showValues: boolean }) {
  const account = data.accounts.find((item) => item.isActive) ?? data.accounts[0];
  const categories = data.categories.slice(0, 2);
  const mostUsedLimit = [...data.limits].sort((a, b) => b.percentage - a.percentage)[0];

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
          <p className="mt-1 text-sm leading-relaxed text-[var(--text-muted)]">
            Um resumo visual do realizado. Os mesmos dados permanecem disponíveis em texto logo abaixo.
          </p>
        </div>
        <span className="rounded-full border border-[var(--border-strong)] px-2.5 py-1 text-sm font-semibold text-[var(--text-muted)]">
          {data.currency}
        </span>
      </div>

      <div className="relative mx-auto mt-6 aspect-square w-full max-w-[430px]" aria-hidden="true">
        <div className="absolute inset-[8%] rounded-full border border-[var(--border-strong)]" />
        <div className="absolute inset-[24%] rounded-full border border-[var(--orbit-primary)]/25" />
        <div className="absolute inset-[38%] rounded-full border border-[var(--income)]/25" />
        <div className="absolute inset-1/2 flex h-36 w-36 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border border-[var(--income)]/35 bg-[var(--surface-raised)] text-center shadow-lg sm:h-40 sm:w-40">
          <span className="text-sm font-medium text-[var(--text-muted)]">Saldo realizado</span>
          <strong
            className={`mt-1 max-w-[130px] break-words text-xl font-bold tracking-tight sm:text-2xl ${
              data.summary.balance < 0 ? 'text-[var(--expense)]' : 'text-[var(--foreground)]'
            }`}
          >
            {displayMoney(data.summary.balance, showValues, data.currency)}
          </strong>
          <span className="mt-1 text-sm text-[var(--text-subtle)]">no período</span>
        </div>

        {account && (
          <div className="absolute left-[4%] top-[42%] max-w-[120px] rounded-[var(--radius-md)] border border-[var(--orbit-primary)]/35 bg-[var(--surface)] px-3 py-2 text-sm shadow-md">
            <span className="font-semibold text-[var(--foreground)]">{account.name}</span>
            <span className="mt-0.5 block text-[var(--text-muted)]">
              {displayMoney(account.balance, showValues, account.currency)} · {account.currency}
            </span>
          </div>
        )}

        {categories[0] && (
          <div className="absolute right-[1%] top-[13%] max-w-[130px] rounded-[var(--radius-md)] border border-[var(--border-strong)] bg-[var(--surface)] px-3 py-2 text-sm shadow-md">
            <span className="font-semibold text-[var(--foreground)]">{categories[0].name}</span>
            <span className="mt-0.5 block text-[var(--text-muted)]">
              {categories[0].sharePercentage.toLocaleString('pt-BR')}% das despesas
            </span>
          </div>
        )}

        {categories[1] && (
          <div className="absolute bottom-[7%] right-[7%] max-w-[130px] rounded-[var(--radius-md)] border border-[var(--border-strong)] bg-[var(--surface)] px-3 py-2 text-sm shadow-md">
            <span className="font-semibold text-[var(--foreground)]">{categories[1].name}</span>
            <span className="mt-0.5 block text-[var(--text-muted)]">
              {categories[1].sharePercentage.toLocaleString('pt-BR')}% das despesas
            </span>
          </div>
        )}

        {mostUsedLimit && (
          <div className="absolute left-[17%] top-[5%] max-w-[130px] rounded-[var(--radius-md)] border border-[var(--warning)]/35 bg-[var(--surface)] px-3 py-2 text-sm shadow-md">
            <span className="font-semibold text-[var(--foreground)]">{mostUsedLimit.category.name}</span>
            <span className="mt-0.5 block text-[var(--text-muted)]">
              {mostUsedLimit.percentage.toLocaleString('pt-BR')}% do limite
            </span>
          </div>
        )}
      </div>

      <div className="mt-5 grid gap-2 sm:grid-cols-2" aria-label="Resumo textual do mapa do mês">
        <Link
          href="/contas"
          className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-subtle)] p-3 transition-colors hover:border-[var(--orbit-primary)]/45 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]"
        >
          <span className="text-sm font-semibold text-[var(--foreground)]">Contas</span>
          <span className="mt-0.5 block text-sm text-[var(--text-muted)]">
            {data.accounts.length} {data.accounts.length === 1 ? 'conta cadastrada' : 'contas cadastradas'}
          </span>
        </Link>
        <Link
          href="/categorias"
          className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-subtle)] p-3 transition-colors hover:border-[var(--orbit-primary)]/45 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]"
        >
          <span className="text-sm font-semibold text-[var(--foreground)]">Categorias e limites</span>
          <span className="mt-0.5 block text-sm text-[var(--text-muted)]">
            {data.categories.length} com despesa realizada · {data.limits.length} com limite
          </span>
        </Link>
      </div>
    </section>
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
      <div className="grid gap-5 xl:grid-cols-2">
        <div className="ds-panel h-72 animate-pulse bg-[var(--skeleton)]" />
        <div className="ds-panel h-72 animate-pulse bg-[var(--skeleton)]" />
      </div>
    </div>
  );
}
