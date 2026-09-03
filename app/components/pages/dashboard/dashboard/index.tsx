'use client';

import { FaArrowDown, FaArrowUp, FaChartLine, FaWallet } from 'react-icons/fa';

import { PageHeader } from '@/app/components/base-pages';
import { ProtectedRoute } from '@/app/components/layout';
import { IconRenderer, Input, Select } from '@/app/components/ui';
import { useAuth } from '@/app/context';
import { useMonthlyDashboard } from '@/app/hooks/dashboard/use-monthly-dashboard';
import { currencyOptions } from '@/app/lib/constants/account.constants';
import { formatCurrency } from '@/app/lib/currency/format-currency';
import type {
  DashboardComparisonMetric,
  DashboardSummary,
  MonthlyDashboard,
} from '@/app/types/dashboard';
import type { SupportedCurrency } from '@/app/types/financial-summary';

const monthFormatter = new Intl.DateTimeFormat('pt-BR', {
  month: 'short',
  year: '2-digit',
  timeZone: 'UTC',
});

function displayMoney(
  amount: number,
  showValues: boolean,
  currency: string,
) {
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
  const direction = metric.difference > 0 ? 'a mais' : metric.difference < 0 ? 'a menos' : 'sem mudança';
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
        description="Acompanhe o realizado do mês, saldos atuais, categorias e evolução recente sem misturar moedas."
      />

      <div className="mb-5 flex justify-end gap-3 flex-row">
        <div className="w-full sm:w-44">
          <Select
            id="dashboard-currency"
            label="Moeda dos agregados"
            value={currency}
            options={currencyOptions}
            onChange={(value) => setCurrency(value as SupportedCurrency)}
            disabled={loading}
          />
        </div>
        <div className="w-full sm:w-56">
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

function DashboardContent({
  data,
  showValues,
}: {
  data: MonthlyDashboard;
  showValues: boolean;
}) {
  return (
    <div className="space-y-5">
      <SummaryGrid
        summary={data.summary}
        comparison={data.comparison}
        currency={data.currency}
        showValues={showValues}
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
        <MonthlyFlow flow={data.flow} currency={data.currency} showValues={showValues} />
        <AccountBalances accounts={data.accounts} showValues={showValues} />
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <CategorySpending
          categories={data.categories}
          totalExpense={data.summary.expense}
          currency={data.currency}
          showValues={showValues}
        />
        <CategoryLimits
          limits={data.limits}
          currency={data.currency}
          showValues={showValues}
        />
      </div>
    </div>
  );
}

function SummaryGrid({
  summary,
  comparison,
  currency,
  showValues,
}: {
  summary: DashboardSummary;
  comparison: MonthlyDashboard['comparison'];
  currency: SupportedCurrency;
  showValues: boolean;
}) {
  const cards = [
    {
      key: 'income' as const,
      label: 'Receitas realizadas',
      icon: <FaArrowUp aria-hidden="true" />,
      className: 'text-[var(--income)]',
    },
    {
      key: 'expense' as const,
      label: 'Despesas realizadas',
      icon: <FaArrowDown aria-hidden="true" />,
      className: 'text-[var(--expense)]',
    },
    {
      key: 'balance' as const,
      label: 'Saldo do período',
      icon: <FaChartLine aria-hidden="true" />,
      className: summary.balance < 0 ? 'text-[var(--expense)]' : 'text-[var(--foreground)]',
    },
  ];

  return (
    <section aria-label={`Resumo financeiro do mês em ${currency}`} className="grid gap-3 grid-cols-3">
      {cards.map((card) => (
        <article key={card.key} className="ds-panel p-3 sm:p-6">
          <div className="hidden sm:block flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text-muted)]">
              <span className="text-[var(--primary)]">{card.icon}</span>
              <span>{card.label}</span>
            </div>
            <span className="rounded-full border border-[var(--border-strong)] px-2 py-0.5 text-sm font-semibold text-[var(--text-muted)]">
              {currency}
            </span>
          </div>
          <p className={`mt-3 font-bold tracking-tight sm:text-3xl ${card.className}`}>
            {displayMoney(summary[card.key], showValues, currency)}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-[var(--text-muted)]">
            {comparisonLabel(comparison[card.key], showValues, currency)}
          </p>
        </article>
      ))}
    </section>
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
        <h2 id="dashboard-flow-title" className="text-xl font-semibold text-[var(--foreground)]">
          Fluxo dos últimos 6 meses
        </h2>
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
        <FaWallet className="text-[var(--primary)]" aria-hidden="true" />
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
    <section className="ds-panel p-5 sm:p-6" aria-labelledby="dashboard-categories-title">
      <h2 id="dashboard-categories-title" className="text-xl font-semibold text-[var(--foreground)]">
        Despesas por categoria
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
                      {displayMoney(category.realized, showValues, currency)} · {category.sharePercentage.toLocaleString('pt-BR')}%
                    </p>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--surface-subtle)]" aria-hidden="true">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${Math.min(100, category.sharePercentage)}%`, backgroundColor: category.color }}
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
  return (
    <section className="ds-panel p-5 sm:p-6" aria-labelledby="dashboard-limits-title">
      <h2 id="dashboard-limits-title" className="text-xl font-semibold text-[var(--foreground)]">
        Limites do mês
      </h2>
      <p className="mt-1 text-sm leading-relaxed text-[var(--text-muted)]">
        Progresso somente dos limites definidos em {currency}.
      </p>

      {limits.length === 0 ? (
        <EmptyState text={`Nenhum limite em ${currency} definido para este mês.`} />
      ) : (
        <ul className="mt-5 space-y-4">
          {limits.map((limit) => {
            const exceeded = limit.percentage > 100;
            const attention = limit.percentage >= 80 && limit.percentage <= 100;
            const progress = Math.min(100, Math.max(0, limit.percentage));

            return (
              <li key={limit.category.id}>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-base font-semibold text-[var(--foreground)]">{limit.category.name}</p>
                  <p className={`text-sm font-semibold ${exceeded ? 'text-[var(--expense)]' : attention ? 'text-[var(--warning)]' : 'text-[var(--text-muted)]'}`}>
                    {limit.percentage.toLocaleString('pt-BR')}% · {displayMoney(limit.realized, showValues, currency)} de {displayMoney(limit.amount, showValues, currency)}
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
                    className={`h-full rounded-full ${exceeded ? 'bg-[var(--danger)]' : attention ? 'bg-[var(--warning)]' : 'bg-[var(--primary)]'}`}
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
      <div className="grid gap-4 lg:grid-cols-3">
        {[1, 2, 3].map((item) => (
          <div key={item} className="ds-panel h-36 animate-pulse bg-[var(--skeleton)]" />
        ))}
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        <div className="ds-panel h-72 animate-pulse bg-[var(--skeleton)]" />
        <div className="ds-panel h-72 animate-pulse bg-[var(--skeleton)]" />
      </div>
    </div>
  );
}
