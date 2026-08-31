'use client';

import { FaArrowDown, FaArrowUp, FaChartLine, FaWallet } from 'react-icons/fa';

import { PageHeader } from '@/app/components/base-pages';
import { ProtectedRoute } from '@/app/components/layout';
import { IconRenderer, Input } from '@/app/components/ui';
import { useAuth } from '@/app/context';
import { useMonthlyDashboard } from '@/app/hooks/dashboard/use-monthly-dashboard';
import { formatCurrency } from '@/app/lib/currency/format-currency';
import type {
  DashboardComparisonMetric,
  DashboardSummary,
} from '@/app/types/dashboard';

const monthFormatter = new Intl.DateTimeFormat('pt-BR', {
  month: 'short',
  year: '2-digit',
  timeZone: 'UTC',
});

function displayMoney(amount: number, showValues: boolean, currency = 'BRL') {
  return showValues ? formatCurrency(amount, currency) : '••••';
}

function periodLabel(year: number, month: number) {
  return monthFormatter.format(new Date(Date.UTC(year, month - 1, 1))).replace('.', '');
}

function comparisonLabel(metric: DashboardComparisonMetric) {
  if (metric.percentage === null) return 'Sem base comparável no mês anterior';

  const signal = metric.percentage > 0 ? '+' : '';
  return `${signal}${metric.percentage.toLocaleString('pt-BR')}% vs. mês anterior`;
}

export default function Dashboard() {
  const { user } = useAuth();
  const { data, loading, error, periodValue, setPeriodValue } = useMonthlyDashboard();
  const showValues = user?.showValues !== false;

  return (
    <ProtectedRoute>
      <PageHeader
        title="Dashboard"
        description="Acompanhe o realizado do mês, saldos atuais, categorias e evolução recente em uma única visão."
      />

      <div className="mb-5 flex justify-end">
        <div className="w-full sm:w-56">
          <Input
            id="dashboard-period"
            type="month"
            label="Mês de referência"
            value={periodValue}
            onChange={(event) => setPeriodValue(event.currentTarget.value)}
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

      {loading || !data ? (
        <DashboardLoading />
      ) : (
        <div className="space-y-5">
          <SummaryGrid
            summary={data.summary}
            comparison={data.comparison}
            showValues={showValues}
          />

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
            <MonthlyFlow
              flow={data.flow}
              showValues={showValues}
            />
            <AccountBalances
              accounts={data.accounts}
              showValues={showValues}
            />
          </div>

          <div className="grid gap-5 xl:grid-cols-2">
            <CategorySpending
              categories={data.categories}
              totalExpense={data.summary.expense}
              showValues={showValues}
            />
            <CategoryLimits
              limits={data.limits}
              showValues={showValues}
            />
          </div>
        </div>
      )}
    </ProtectedRoute>
  );
}

function SummaryGrid({
  summary,
  comparison,
  showValues,
}: {
  summary: DashboardSummary;
  comparison: {
    income: DashboardComparisonMetric;
    expense: DashboardComparisonMetric;
    balance: DashboardComparisonMetric;
  };
  showValues: boolean;
}) {
  const cards = [
    {
      label: 'Receitas realizadas',
      value: summary.income,
      metric: comparison.income,
      className: 'text-[var(--income)]',
      icon: <FaArrowUp aria-hidden="true" />,
    },
    {
      label: 'Despesas realizadas',
      value: summary.expense,
      metric: comparison.expense,
      className: 'text-[var(--expense)]',
      icon: <FaArrowDown aria-hidden="true" />,
    },
    {
      label: 'Saldo do período',
      value: summary.balance,
      metric: comparison.balance,
      className:
        summary.balance < 0 ? 'text-[var(--expense)]' : 'text-[var(--foreground)]',
      icon: <FaChartLine aria-hidden="true" />,
    },
  ];

  return (
    <section aria-label="Resumo financeiro do mês" className="grid gap-4 lg:grid-cols-3">
      {cards.map((card) => (
        <article key={card.label} className="ds-panel p-5 sm:p-6">
          <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text-muted)]">
            <span className="text-[var(--primary)]">{card.icon}</span>
            <span>{card.label}</span>
          </div>
          <p className={`mt-3 text-2xl font-bold tracking-tight sm:text-3xl ${card.className}`}>
            {displayMoney(card.value, showValues)}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-[var(--text-muted)]">
            {comparisonLabel(card.metric)}
          </p>
        </article>
      ))}
    </section>
  );
}

function MonthlyFlow({
  flow,
  showValues,
}: {
  flow: Array<DashboardSummary & { year: number; month: number }>;
  showValues: boolean;
}) {
  const maxValue = Math.max(
    1,
    ...flow.flatMap((item) => [item.income, item.expense]),
  );

  return (
    <section className="ds-panel p-5 sm:p-6" aria-labelledby="dashboard-flow-title">
      <div>
        <h2 id="dashboard-flow-title" className="text-xl font-semibold text-[var(--foreground)]">
          Fluxo dos últimos 6 meses
        </h2>
        <p className="mt-1 text-sm leading-relaxed text-[var(--text-muted)]">
          Somente transações concluídas entram no realizado.
        </p>
      </div>

      <ul className="mt-5 space-y-4">
        {flow.map((item) => {
          const incomeWidth = Math.round((item.income / maxValue) * 100);
          const expenseWidth = Math.round((item.expense / maxValue) * 100);

          return (
            <li key={`${item.year}-${item.month}`} className="grid gap-2 sm:grid-cols-[88px_minmax(0,1fr)] sm:items-center">
              <p className="text-sm font-semibold capitalize text-[var(--foreground)]">
                {periodLabel(item.year, item.month)}
              </p>
              <div className="space-y-2">
                <FlowBar
                  label="Receitas"
                  value={item.income}
                  width={incomeWidth}
                  className="bg-[var(--income)]"
                  showValues={showValues}
                />
                <FlowBar
                  label="Despesas"
                  value={item.expense}
                  width={expenseWidth}
                  className="bg-[var(--expense)]"
                  showValues={showValues}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function FlowBar({
  label,
  value,
  width,
  className,
  showValues,
}: {
  label: string;
  value: number;
  width: number;
  className: string;
  showValues: boolean;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-3 text-sm">
        <span className="text-[var(--text-muted)]">{label}</span>
        <span className="font-medium text-[var(--foreground)]">
          {displayMoney(value, showValues)}
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
  accounts: Array<{
    id: string;
    name: string;
    currency: string;
    isActive: boolean;
    color: string;
    icon: string;
    balance: number;
  }>;
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
        Derivados de todas as transações concluídas de cada conta.
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
                  <p className="truncate text-base font-semibold text-[var(--foreground)]">
                    {account.name}
                  </p>
                  {!account.isActive && (
                    <span className="rounded-full border border-[var(--border-strong)] px-2 py-0.5 text-sm text-[var(--text-muted)]">
                      Inativa
                    </span>
                  )}
                </div>
                <p className="text-sm text-[var(--text-muted)]">{account.currency}</p>
              </div>
              <p className={`text-base font-bold ${account.balance < 0 ? 'text-[var(--expense)]' : 'text-[var(--foreground)]'}`}>
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
  showValues,
}: {
  categories: Array<{
    id: string;
    name: string;
    color: string;
    icon: string;
    realized: number;
    sharePercentage: number;
  }>;
  totalExpense: number;
  showValues: boolean;
}) {
  return (
    <section className="ds-panel p-5 sm:p-6" aria-labelledby="dashboard-categories-title">
      <h2 id="dashboard-categories-title" className="text-xl font-semibold text-[var(--foreground)]">
        Despesas por categoria
      </h2>
      <p className="mt-1 text-sm leading-relaxed text-[var(--text-muted)]">
        Participação no total realizado de {displayMoney(totalExpense, showValues)}.
      </p>

      {categories.length === 0 ? (
        <EmptyState text="Nenhuma despesa concluída neste mês." />
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
                    <p className="truncate text-base font-semibold text-[var(--foreground)]">
                      {category.name}
                    </p>
                    <p className="text-sm font-medium text-[var(--foreground)]">
                      {displayMoney(category.realized, showValues)} · {category.sharePercentage.toLocaleString('pt-BR')}%
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
  showValues,
}: {
  limits: Array<{
    category: { id: string; name: string; color: string; icon: string };
    amount: number;
    realized: number;
    remaining: number;
    percentage: number;
  }>;
  showValues: boolean;
}) {
  return (
    <section className="ds-panel p-5 sm:p-6" aria-labelledby="dashboard-limits-title">
      <h2 id="dashboard-limits-title" className="text-xl font-semibold text-[var(--foreground)]">
        Limites do mês
      </h2>
      <p className="mt-1 text-sm leading-relaxed text-[var(--text-muted)]">
        Progresso dos limites definidos em Categorias, sem alterar o realizado.
      </p>

      {limits.length === 0 ? (
        <EmptyState text="Nenhum limite definido para este mês." />
      ) : (
        <ul className="mt-5 space-y-4">
          {limits.map((limit) => {
            const exceeded = limit.percentage > 100;
            const attention = limit.percentage >= 80 && limit.percentage <= 100;
            const progress = Math.min(100, Math.max(0, limit.percentage));

            return (
              <li key={limit.category.id}>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-base font-semibold text-[var(--foreground)]">
                    {limit.category.name}
                  </p>
                  <p className={`text-sm font-semibold ${exceeded ? 'text-[var(--expense)]' : attention ? 'text-[var(--warning)]' : 'text-[var(--text-muted)]'}`}>
                    {limit.percentage.toLocaleString('pt-BR')}% utilizado
                  </p>
                </div>
                <div
                  className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--surface-subtle)]"
                  role="progressbar"
                  aria-label={`Uso do limite de ${limit.category.name}`}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(progress)}
                  aria-valuetext={`${limit.percentage.toLocaleString('pt-BR')}% utilizado`}
                >
                  <div
                    className={`h-full rounded-full ${exceeded ? 'bg-[var(--danger)]' : attention ? 'bg-[var(--warning)]' : 'bg-[var(--primary)]'}`}
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="mt-2 flex flex-wrap justify-between gap-2 text-sm text-[var(--text-muted)]">
                  <span>Realizado: {displayMoney(limit.realized, showValues)}</span>
                  <span>
                    {limit.remaining < 0 ? 'Excedido em' : 'Restante'}: {displayMoney(Math.abs(limit.remaining), showValues)}
                  </span>
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
    <div className="mt-5 rounded-[var(--radius-md)] border border-dashed border-[var(--border-strong)] p-5 text-base text-[var(--text-muted)]">
      {text}
    </div>
  );
}

function DashboardLoading() {
  return (
    <div className="space-y-5" role="status" aria-live="polite">
      <p className="text-base text-[var(--text-muted)]">Carregando dashboard financeiro…</p>
      <div className="grid gap-4 lg:grid-cols-3" aria-hidden="true">
        {Array.from({ length: 3 }, (_, index) => (
          <div key={index} className="ds-panel h-36 bg-[var(--surface-subtle)]" />
        ))}
      </div>
      <div className="ds-panel h-72 bg-[var(--surface-subtle)]" aria-hidden="true" />
    </div>
  );
}
