'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  FaArrowDown,
  FaArrowRight,
  FaArrowUp,
  FaCalendarAlt,
  FaChevronLeft,
  FaChevronRight,
  FaEye,
  FaFileInvoiceDollar,
  FaPlus,
  FaReceipt,
  FaTimes,
  FaWallet,
} from 'react-icons/fa';

import { ProtectedRoute } from '@/app/components/layout';
import ForecastPanel from '@/app/components/pages/dashboard/forecast';
import { Select } from '@/app/components/ui';
import { useAuth } from '@/app/context';
import { useMonthlyDashboard } from '@/app/hooks/dashboard/use-monthly-dashboard';
import { currencyOptions } from '@/app/lib/constants/account.constants';
import { formatCurrency } from '@/app/lib/currency/format-currency';
import { forecastService } from '@/app/services/forecast-service';
import { transactionService } from '@/app/services/transaction-service';
import type { MonthlyDashboard } from '@/app/types/dashboard';
import type { SupportedCurrency } from '@/app/types/financial-summary';
import type { ForecastData, ForecastItem } from '@/app/types/forecast';
import type { TransactionDTO } from '@/app/types/transaction';

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

function logicalDateLabel(item: { year: number; month: number; day: number }) {
  return new Date(Date.UTC(item.year, item.month - 1, item.day))
    .toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      timeZone: 'UTC',
    })
    .replace('.', '');
}

function transactionDateLabel(transaction: TransactionDTO) {
  return logicalDateLabel(transaction);
}

function comparisonLabel(percentage: number | null, previousMonth: number, previousYear: number) {
  if (percentage === null) return 'sem base anterior';
  const sign = percentage > 0 ? '+' : '';
  return `${sign}${percentage.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}% vs. ${compactMonthLabel(previousMonth, previousYear)}`;
}

function useForecast(currency: SupportedCurrency) {
  const [data, setData] = useState<ForecastData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError('');

      try {
        const response = await forecastService.get(currency, 30);
        if (active) setData(response.data);
      } catch (caught) {
        if (active) {
          setData(null);
          setError(caught instanceof Error ? caught.message : 'Não foi possível carregar a projeção.');
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [currency]);

  return { data, loading, error };
}

function useRecentTransactions(periodValue: string, currency: SupportedCurrency) {
  const [items, setItems] = useState<TransactionDTO[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const [year, month] = periodValue.split('-').map(Number);
    let active = true;

    async function load() {
      setLoading(true);

      try {
        const response = await transactionService.getAll({
          year,
          month,
          page: 1,
          pageSize: 12,
        });

        if (!active) return;

        const recent = response.data.items
          .filter((item) => item.account.currency === currency)
          .sort((left, right) => {
            const leftKey = left.year * 10000 + left.month * 100 + left.day;
            const rightKey = right.year * 10000 + right.month * 100 + right.day;
            if (leftKey !== rightKey) return rightKey - leftKey;
            return right.createdAt.localeCompare(left.createdAt);
          })
          .slice(0, 5);

        setItems(recent);
      } catch {
        if (active) setItems([]);
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [currency, periodValue]);

  return { items, loading };
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
  } = useMonthlyDashboard();
  const forecast = useForecast(currency);
  const recentTransactions = useRecentTransactions(periodValue, currency);

  return (
    <ProtectedRoute>
      <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">Visão financeira pessoal</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-[var(--foreground)] min-[901px]:text-[32px]">Seu dinheiro, no seu controle</h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">Acompanhe suas contas, compromissos e gastos em um só lugar.</p>
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

      {error && (
        <p role="alert" className="mt-4 rounded-xl border border-[var(--expense)]/35 bg-[var(--danger-subtle)] p-3 text-sm text-[var(--expense)]">
          {error}
        </p>
      )}

      <div className="mt-5">
        {loading ? (
          <DashboardLoading />
        ) : data ? (
          <DashboardHome
            data={data}
            showValues={showValues}
            forecast={forecast}
            recentTransactions={recentTransactions}
          />
        ) : null}
      </div>
    </ProtectedRoute>
  );
}

function DashboardHome({
  data,
  showValues,
  forecast,
  recentTransactions,
}: {
  data: MonthlyDashboard;
  showValues: boolean;
  forecast: ReturnType<typeof useForecast>;
  recentTransactions: ReturnType<typeof useRecentTransactions>;
}) {
  const [forecastOpen, setForecastOpen] = useState(false);
  const activeAccounts = data.accounts.filter((account) => account.isActive && account.currency === data.currency);
  const primaryAccount = activeAccounts[0] ?? data.accounts.find((account) => account.currency === data.currency) ?? null;
  const availableNow = activeAccounts.reduce((sum, account) => sum + account.balance, 0);
  const topCategories = [...data.categories]
    .filter((category) => category.realized > 0)
    .sort((left, right) => right.realized - left.realized)
    .slice(0, 5);
  const projectedBalance = forecast.data?.accounts.reduce((sum, account) => sum + account.projectedBalance, 0) ?? null;
  const forecastItems = [...(forecast.data?.overdue ?? []), ...(forecast.data?.upcoming ?? [])]
    .sort((left, right) => {
      const leftKey = left.year * 10000 + left.month * 100 + left.day;
      const rightKey = right.year * 10000 + right.month * 100 + right.day;
      return leftKey - rightKey;
    });
  const pendingExpenses = forecastItems
    .filter((item) => item.type === 'EXPENSE')
    .reduce((sum, item) => sum + item.amount, 0);
  const pendingIncome = forecastItems
    .filter((item) => item.type === 'INCOME')
    .reduce((sum, item) => sum + item.amount, 0);
  const flowTotal = data.summary.income + data.summary.expense;
  const incomeWidth = flowTotal > 0 ? (data.summary.income / flowTotal) * 100 : 50;
  const expenseWidth = flowTotal > 0 ? (data.summary.expense / flowTotal) * 100 : 50;

  return (
    <>
      <section className="grid gap-4 xl:grid-cols-[1.35fr_.78fr_.92fr]">
        <PrimaryAccountCard account={primaryAccount} showValues={showValues} />
        <AccountsCard accounts={activeAccounts} total={availableNow} showValues={showValues} currency={data.currency} />
        <UpcomingCard items={forecastItems} accounts={activeAccounts} showValues={showValues} currency={data.currency} loading={forecast.loading} />
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-[1.05fr_.95fr]">
        <MonthOverviewCard
          data={data}
          showValues={showValues}
          incomeWidth={incomeWidth}
          expenseWidth={expenseWidth}
        />
        <CategoriesCard categories={topCategories} showValues={showValues} currency={data.currency} period={data.period} />
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-[1.15fr_.85fr]">
        <RecentTransactionsCard
          items={recentTransactions.items}
          loading={recentTransactions.loading}
          showValues={showValues}
          currency={data.currency}
        />
        <ProjectedBalanceCard
          currentBalance={availableNow}
          pendingExpenses={pendingExpenses}
          pendingIncome={pendingIncome}
          projectedBalance={projectedBalance}
          showValues={showValues}
          currency={data.currency}
          loading={forecast.loading}
          error={forecast.error}
          commitmentCount={forecastItems.length}
          onOpen={() => setForecastOpen(true)}
          enabled={Boolean(forecast.data) && !forecast.loading}
        />
      </section>

      {forecastOpen && forecast.data && (
        <ForecastDialog currency={data.currency} onClose={() => setForecastOpen(false)} />
      )}
    </>
  );
}

function PrimaryAccountCard({
  account,
  showValues,
}: {
  account: MonthlyDashboard['accounts'][number] | null;
  showValues: boolean;
}) {
  return (
    <article className="rounded-[18px] border border-[var(--orbit-primary)]/35 bg-[var(--orbit-primary-subtle)] p-5 sm:p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">Conta principal</p>
      {account ? (
        <>
          <div className="mt-3 flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[var(--orbit-primary)] text-[var(--orbit-on-primary)]">
                <FaWallet aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <h2 className="truncate text-xl font-bold">{account.name}</h2>
                <p className="mt-0.5 text-xs text-[var(--text-muted)]">{account.currency} · saldo disponível</p>
              </div>
            </div>
            <Link href="/contas" className="hidden min-h-11 shrink-0 items-center gap-2 rounded-[10px] border border-[var(--orbit-primary)]/45 px-3 text-sm font-semibold text-[var(--orbit-primary)] sm:inline-flex">
              Ver conta <FaArrowRight aria-hidden="true" />
            </Link>
          </div>
          <strong className={`mt-6 block text-[34px] font-extrabold tracking-tight ${account.balance < 0 ? 'text-[var(--expense)]' : 'text-[var(--foreground)]'}`}>
            {displayMoney(account.balance, showValues, account.currency)}
          </strong>
          <p className="mt-1 text-sm text-[var(--text-muted)]">Saldo atual desta conta</p>
          <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Link href="/transacoes/nova" className="flex min-h-[62px] flex-col items-center justify-center gap-1.5 rounded-[11px] bg-[var(--orbit-primary)] px-2 text-center text-xs font-bold text-[var(--orbit-on-primary)]">
              <FaPlus aria-hidden="true" /> Nova transação
            </Link>
            <Link href="/transacoes" className="flex min-h-[62px] flex-col items-center justify-center gap-1.5 rounded-[11px] border border-[var(--border-strong)] bg-[var(--surface)] px-2 text-center text-xs font-semibold">
              <FaReceipt aria-hidden="true" /> Transações
            </Link>
            <Link href="/calendario" className="flex min-h-[62px] flex-col items-center justify-center gap-1.5 rounded-[11px] border border-[var(--border-strong)] bg-[var(--surface)] px-2 text-center text-xs font-semibold">
              <FaCalendarAlt aria-hidden="true" /> Calendário
            </Link>
            <Link href="/categorias" className="flex min-h-[62px] flex-col items-center justify-center gap-1.5 rounded-[11px] border border-[var(--border-strong)] bg-[var(--surface)] px-2 text-center text-xs font-semibold">
              <FaFileInvoiceDollar aria-hidden="true" /> Categorias
            </Link>
          </div>
        </>
      ) : (
        <div className="mt-5">
          <strong className="text-2xl">Nenhuma conta nesta moeda</strong>
          <p className="mt-2 text-sm text-[var(--text-muted)]">Crie ou ative uma conta para começar a acompanhar seu saldo.</p>
          <Link href="/contas" className="mt-4 inline-flex min-h-11 items-center rounded-[10px] border border-[var(--orbit-primary)] px-3 text-sm font-semibold text-[var(--orbit-primary)]">Abrir contas</Link>
        </div>
      )}
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
    <article className="rounded-[18px] border border-[var(--border)] bg-[var(--surface)] p-5">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
        Meu dinheiro <FaEye aria-hidden="true" />
      </div>
      <strong className={`mt-3 block text-[28px] font-extrabold ${total < 0 ? 'text-[var(--expense)]' : 'text-[var(--income)]'}`}>
        {displayMoney(total, showValues, currency)}
      </strong>
      <p className="mt-1 text-xs text-[var(--text-muted)]">Total disponível nas contas em {currency}</p>
      <div className="mt-4 divide-y divide-[var(--border)]">
        {accounts.length === 0 ? (
          <p className="py-3 text-sm text-[var(--text-muted)]">Nenhuma conta ativa nesta moeda.</p>
        ) : (
          accounts.slice(0, 4).map((account) => (
            <Link key={account.id} href="/contas" className="flex min-h-12 items-center justify-between gap-3 py-2.5">
              <span className="flex min-w-0 items-center gap-2.5">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-[var(--border)]" style={{ color: account.color }}>
                  <FaWallet aria-hidden="true" />
                </span>
                <span className="truncate text-sm font-semibold">{account.name}</span>
              </span>
              <span className="flex shrink-0 items-center gap-2 text-sm font-semibold">
                {displayMoney(account.balance, showValues, account.currency)} <FaChevronRight className="text-[10px] text-[var(--text-muted)]" aria-hidden="true" />
              </span>
            </Link>
          ))
        )}
      </div>
    </article>
  );
}

function UpcomingCard({
  items,
  accounts,
  showValues,
  currency,
  loading,
}: {
  items: ForecastItem[];
  accounts: MonthlyDashboard['accounts'];
  showValues: boolean;
  currency: string;
  loading: boolean;
}) {
  const accountNames = new Map(accounts.map((account) => [account.id, account.name]));

  return (
    <article className="rounded-[18px] border border-[var(--border)] bg-[var(--surface)] p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">Próximos compromissos</h2>
        <Link href="/calendario" className="text-xs font-semibold text-[var(--orbit-primary)]">Ver todos</Link>
      </div>
      <div className="mt-3 divide-y divide-[var(--border)]">
        {loading ? (
          <div className="space-y-2 py-2" role="status" aria-label="Carregando compromissos">
            {[1, 2, 3].map((item) => <div key={item} className="h-12 animate-pulse rounded-lg bg-[var(--skeleton)]" />)}
          </div>
        ) : items.length === 0 ? (
          <p className="py-4 text-sm text-[var(--text-muted)]">Nenhum compromisso pendente nos próximos 30 dias.</p>
        ) : (
          items.slice(0, 4).map((item) => (
            <div key={item.id} className="flex min-h-[58px] items-center justify-between gap-3 py-2.5">
              <div className="flex min-w-0 items-center gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-[var(--border-strong)] text-center text-[11px] font-bold leading-tight">
                  {String(item.day).padStart(2, '0')}<span className="text-[9px] font-medium uppercase text-[var(--text-muted)]">{compactMonthLabel(item.month, item.year)}</span>
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{item.description}</p>
                  <p className="mt-0.5 truncate text-xs text-[var(--text-muted)]">{accountNames.get(item.accountId) ?? 'Conta'}</p>
                </div>
              </div>
              <strong className={`shrink-0 text-sm ${item.type === 'INCOME' ? 'text-[var(--income)]' : 'text-[var(--expense)]'}`}>
                {showValues ? `${item.type === 'INCOME' ? '+' : '-'}${formatCurrency(item.amount, currency)}` : '••••'}
              </strong>
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
    <article className="rounded-[18px] border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">Visão do mês</h2>
          <p className="mt-1 text-sm text-[var(--text-muted)]">Seu dinheiro em {monthLabel(`${data.period.year}-${String(data.period.month).padStart(2, '0')}`)}.</p>
        </div>
        <span className="text-xs font-semibold capitalize text-[var(--text-muted)]">{monthLabel(`${data.period.year}-${String(data.period.month).padStart(2, '0')}`)}</span>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-3 sm:divide-x sm:divide-[var(--border)]">
        <MonthMetric
          icon={<FaArrowUp aria-hidden="true" />}
          label="Receitas"
          value={displayMoney(data.summary.income, showValues, data.currency)}
          detail={comparisonLabel(data.comparison.income.percentage, previous.month, previous.year)}
          tone="income"
        />
        <MonthMetric
          icon={<FaArrowDown aria-hidden="true" />}
          label="Despesas"
          value={displayMoney(data.summary.expense, showValues, data.currency)}
          detail={comparisonLabel(data.comparison.expense.percentage, previous.month, previous.year)}
          tone="expense"
        />
        <MonthMetric
          icon={<span aria-hidden="true">−</span>}
          label="Saldo do mês"
          value={signedMoney(data.summary.balance, showValues, data.currency)}
          detail={data.summary.balance < 0 ? 'Você gastou mais que recebeu.' : 'O mês está positivo até aqui.'}
          tone={data.summary.balance < 0 ? 'expense' : 'income'}
        />
      </div>

      <div className="mt-6 flex h-3 overflow-hidden rounded-full bg-[var(--surface-subtle)]" aria-label="Proporção entre receitas e despesas">
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
}: {
  icon: ReactNode;
  label: string;
  value: string;
  detail: string;
  tone: 'income' | 'expense';
}) {
  const toneClass = tone === 'income' ? 'text-[var(--income)]' : 'text-[var(--expense)]';
  const toneBackground = tone === 'income' ? 'bg-[var(--primary-subtle)]' : 'bg-[var(--danger-subtle)]';

  return (
    <div className="min-w-0 sm:px-4 sm:first:pl-0 sm:last:pr-0">
      <div className="flex items-center gap-2">
        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${toneBackground} ${toneClass}`}>{icon}</span>
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
    <article className="rounded-[18px] border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold">Principais categorias de gastos</h2>
        <span className="hidden text-xs font-semibold capitalize text-[var(--text-muted)] sm:inline">{monthLabel(`${period.year}-${String(period.month).padStart(2, '0')}`)}</span>
      </div>
      <div className="mt-4 divide-y divide-[var(--border)]">
        {categories.length === 0 ? (
          <p className="py-4 text-sm text-[var(--text-muted)]">Nenhuma despesa categorizada neste período.</p>
        ) : (
          categories.map((category) => (
            <div key={category.id} className="grid min-h-[48px] grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-2.5 sm:grid-cols-[minmax(0,1.1fr)_120px_minmax(90px,.8fr)_44px]">
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-white" style={{ backgroundColor: category.color }}><FaReceipt aria-hidden="true" /></span>
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
      <Link href="/categorias" className="mt-4 flex min-h-11 items-center justify-between rounded-[10px] border border-[var(--border-strong)] px-3 text-sm font-semibold">
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
    <article className="rounded-[18px] border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold">Últimas transações</h2>
        <Link href="/transacoes" className="text-xs font-semibold text-[var(--orbit-primary)]">Ver todas</Link>
      </div>
      <div className="mt-3 divide-y divide-[var(--border)]">
        {loading ? (
          <div className="space-y-2 py-2" role="status" aria-label="Carregando transações recentes">
            {[1, 2, 3, 4].map((item) => <div key={item} className="h-12 animate-pulse rounded-lg bg-[var(--skeleton)]" />)}
          </div>
        ) : items.length === 0 ? (
          <p className="py-5 text-sm text-[var(--text-muted)]">Nenhuma transação encontrada neste mês.</p>
        ) : (
          items.map((transaction) => {
            const isIncome = transaction.type === 'INCOME';
            const isTransfer = transaction.kind === 'TRANSFER';
            const tone = isTransfer ? 'text-[var(--orbit-primary)]' : isIncome ? 'text-[var(--income)]' : 'text-[var(--expense)]';

            return (
              <Link key={transaction.id} href={`/transacoes/show/${transaction.id}`} className="grid min-h-[56px] grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-2.5 sm:grid-cols-[minmax(0,1.2fr)_100px_120px_auto]">
                <div className="flex min-w-0 items-center gap-3">
                  <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[var(--border)] ${tone}`}>
                    {isIncome ? <FaArrowUp aria-hidden="true" /> : isTransfer ? <FaArrowRight aria-hidden="true" /> : <FaArrowDown aria-hidden="true" />}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{transaction.description}</p>
                    <p className="mt-0.5 truncate text-xs text-[var(--text-muted)] sm:hidden">{transaction.account.name} · {transactionDateLabel(transaction)}</p>
                  </div>
                </div>
                <span className="hidden text-xs text-[var(--text-muted)] sm:block">{transactionDateLabel(transaction)}</span>
                <span className="hidden truncate text-xs text-[var(--text-muted)] sm:block">{transaction.account.name}</span>
                <strong className={`shrink-0 text-sm ${tone}`}>
                  {showValues ? `${isIncome ? '+' : isTransfer ? '' : '-'}${formatCurrency(transaction.amount, currency)}` : '••••'}
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
  currentBalance,
  pendingExpenses,
  pendingIncome,
  projectedBalance,
  showValues,
  currency,
  loading,
  error,
  commitmentCount,
  onOpen,
  enabled,
}: {
  currentBalance: number;
  pendingExpenses: number;
  pendingIncome: number;
  projectedBalance: number | null;
  showValues: boolean;
  currency: string;
  loading: boolean;
  error: string;
  commitmentCount: number;
  onOpen: () => void;
  enabled: boolean;
}) {
  return (
    <article className="rounded-[18px] border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-bold">Saldo projetado</h2>
        <span className="rounded-full border border-[var(--orbit-primary)]/35 bg-[var(--orbit-primary-subtle)] px-2.5 py-1 text-[11px] font-semibold text-[var(--orbit-primary)]">Com base nos compromissos</span>
      </div>

      {error ? (
        <p className="mt-4 text-sm text-[var(--expense)]">{error}</p>
      ) : loading ? (
        <div className="mt-5 h-36 animate-pulse rounded-xl bg-[var(--skeleton)]" role="status" aria-label="Carregando saldo projetado" />
      ) : (
        <div className="mt-5 divide-y divide-[var(--border)]">
          <ProjectionRow label="Saldo atual" value={displayMoney(currentBalance, showValues, currency)} />
          <ProjectionRow label="(-) Compromissos futuros" value={pendingExpenses > 0 ? `- ${displayMoney(pendingExpenses, showValues, currency)}` : displayMoney(0, showValues, currency)} tone={pendingExpenses > 0 ? 'expense' : 'neutral'} />
          <ProjectionRow label="(+) Receitas previstas" value={pendingIncome > 0 ? `+ ${displayMoney(pendingIncome, showValues, currency)}` : displayMoney(0, showValues, currency)} tone={pendingIncome > 0 ? 'income' : 'neutral'} />
          <div className="flex items-end justify-between gap-3 py-4">
            <span className="text-sm font-bold">Saldo projetado em 30 dias</span>
            <strong className={`text-xl font-extrabold ${projectedBalance !== null && projectedBalance < 0 ? 'text-[var(--expense)]' : 'text-[var(--income)]'}`}>
              {projectedBalance === null ? '—' : displayMoney(projectedBalance, showValues, currency)}
            </strong>
          </div>
        </div>
      )}

      <div className="mt-4 flex flex-col gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] p-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs leading-relaxed text-[var(--text-muted)]">
          {commitmentCount === 0 ? 'Nenhum compromisso pendente no horizonte atual.' : `Você tem ${commitmentCount} compromisso${commitmentCount === 1 ? '' : 's'} no horizonte dos próximos 30 dias.`}
        </p>
        <button type="button" onClick={onOpen} disabled={!enabled} className="min-h-11 shrink-0 rounded-[10px] border border-[var(--orbit-primary)]/45 px-3 text-sm font-bold text-[var(--orbit-primary)] disabled:opacity-50">
          Ver projeção
        </button>
      </div>
    </article>
  );
}

function ProjectionRow({ label, value, tone = 'neutral' }: { label: string; value: string; tone?: 'income' | 'expense' | 'neutral' }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
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
    <div className="space-y-4" role="status" aria-label="Carregando dashboard">
      <div className="grid gap-4 xl:grid-cols-[1.35fr_.78fr_.92fr]">
        <div className="h-[310px] animate-pulse rounded-[18px] bg-[var(--skeleton)]" />
        <div className="h-[310px] animate-pulse rounded-[18px] bg-[var(--skeleton)]" />
        <div className="h-[310px] animate-pulse rounded-[18px] bg-[var(--skeleton)]" />
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <div className="h-[300px] animate-pulse rounded-[18px] bg-[var(--skeleton)]" />
        <div className="h-[300px] animate-pulse rounded-[18px] bg-[var(--skeleton)]" />
      </div>
      <div className="grid gap-4 xl:grid-cols-[1.15fr_.85fr]">
        <div className="h-[300px] animate-pulse rounded-[18px] bg-[var(--skeleton)]" />
        <div className="h-[300px] animate-pulse rounded-[18px] bg-[var(--skeleton)]" />
      </div>
    </div>
  );
}
