'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  FaArrowDown,
  FaArrowRight,
  FaArrowUp,
  FaBarcode,
  FaCalendarAlt,
  FaChevronDown,
  FaChevronLeft,
  FaChevronRight,
  FaExchangeAlt,
  FaEye,
  FaPlus,
  FaQuestionCircle,
  FaTimes,
} from 'react-icons/fa';

import { ProtectedRoute } from '@/app/components/layout';
import ForecastPanel from '@/app/components/pages/dashboard/forecast';
import { IconRenderer, Select } from '@/app/components/ui';
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

function transactionDateLabel(transaction: TransactionDTO) {
  const date = new Date(transaction.year, transaction.month - 1, transaction.day);
  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const difference = Math.round((startOfToday.getTime() - date.getTime()) / 86_400_000);
  const shortDate = date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '');

  if (difference === 0) return `Hoje, ${shortDate}`;
  if (difference === 1) return `Ontem, ${shortDate}`;
  return shortDate;
}

function currentDateLabel() {
  return new Date()
    .toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
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
  const [headerDate, setHeaderDate] = useState('');

  useEffect(() => {
    setHeaderDate(currentDateLabel());
  }, []);

  return (
    <ProtectedRoute>
      <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="min-h-4 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">{headerDate || '\u00A0'}</p>
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

      <div className="mt-4">
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
  const flowTotal = data.summary.income + data.summary.expense;
  const incomeWidth = flowTotal > 0 ? (data.summary.income / flowTotal) * 100 : 50;
  const expenseWidth = flowTotal > 0 ? (data.summary.expense / flowTotal) * 100 : 50;

  return (
    <>
      <section className="grid gap-4 xl:grid-cols-[1.95fr_1fr_1.22fr]">
        <PrimaryAccountCard account={primaryAccount} showValues={showValues} />
        <AccountsCard accounts={activeAccounts} total={availableNow} showValues={showValues} currency={data.currency} />
        <UpcomingCard
          items={forecastItems}
          asOf={forecast.data?.asOf ?? null}
          showValues={showValues}
          currency={data.currency}
          loading={forecast.loading}
        />
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-[1.15fr_1fr]">
        <MonthOverviewCard
          data={data}
          showValues={showValues}
          incomeWidth={incomeWidth}
          expenseWidth={expenseWidth}
        />
        <CategoriesCard categories={topCategories} showValues={showValues} currency={data.currency} period={data.period} />
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-[1.36fr_1fr]">
        <RecentTransactionsCard
          items={recentTransactions.items}
          loading={recentTransactions.loading}
          showValues={showValues}
          currency={data.currency}
        />
        <ProjectedBalanceCard
          currentBalance={availableNow}
          pendingExpenses={pendingExpenses}
          projectedBalance={projectedBalance}
          showValues={showValues}
          currency={data.currency}
          loading={forecast.loading}
          error={forecast.error}
          commitmentCount={forecastItems.filter((item) => forecast.data?.asOf && logicalDateDistance(item, forecast.data.asOf) >= 0 && logicalDateDistance(item, forecast.data.asOf) <= 10).length}
          horizonEnd={forecast.data?.horizonEnd ?? null}
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
    <article
      className="relative min-h-[278px] overflow-hidden rounded-[14px] border border-[var(--orbit-primary)]/55 p-5 sm:p-[22px]"
      style={{
        background:
          'linear-gradient(135deg, color-mix(in srgb, var(--orbit-primary) 32%, var(--surface)) 0%, color-mix(in srgb, var(--orbit-primary) 14%, var(--surface)) 48%, var(--surface) 100%)',
      }}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.04em] text-[var(--text-muted)]">Conta principal</p>
      {account ? (
        <>
          <div className="mt-3 flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="grid h-[46px] w-[46px] shrink-0 place-items-center rounded-[10px] bg-[var(--orbit-primary)] text-[var(--orbit-on-primary)] shadow-sm">
                <IconRenderer iconName={account.icon || 'wallet'} size={20} />
              </span>
              <div className="min-w-0 pt-0.5">
                <h2 className="truncate text-[19px] font-bold leading-tight">{account.name}</h2>
                <p className="mt-1 text-xs text-[var(--text-muted)]">Conta · {account.currency}</p>
              </div>
            </div>
            <Link
              href="/contas"
              className="hidden min-h-11 shrink-0 items-center gap-3 rounded-[10px] border border-[var(--orbit-primary)]/60 bg-[var(--orbit-primary-subtle)] px-4 text-sm font-semibold sm:inline-flex"
            >
              Ver conta <FaArrowRight className="text-[var(--orbit-primary)]" aria-hidden="true" />
            </Link>
          </div>

          <strong className={`mt-5 block text-[36px] font-extrabold leading-none tracking-tight ${account.balance < 0 ? 'text-[var(--expense)]' : 'text-[var(--foreground)]'}`}>
            {displayMoney(account.balance, showValues, account.currency)}
          </strong>
          <p className="mt-2 text-sm text-[var(--text-muted)]">Saldo disponível</p>

          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Link href="/transacoes/nova" className="flex min-h-[68px] flex-col items-center justify-center gap-2 rounded-[9px] bg-[var(--orbit-primary)] px-2 text-center text-xs font-bold text-[var(--orbit-on-primary)] shadow-sm">
              <FaPlus aria-hidden="true" /> Nova transação
            </Link>
            <Link href="/transacoes/nova" className="flex min-h-[68px] flex-col items-center justify-center gap-2 rounded-[9px] border border-[var(--border-strong)] bg-[var(--surface)] px-2 text-center text-xs font-semibold">
              <FaArrowRight aria-hidden="true" /> Transferir
            </Link>
            <Link href="/transacoes/nova" className="flex min-h-[68px] flex-col items-center justify-center gap-2 rounded-[9px] border border-[var(--border-strong)] bg-[var(--surface)] px-2 text-center text-xs font-semibold">
              <FaBarcode aria-hidden="true" /> Pagar conta
            </Link>
            <Link href="/transacoes/nova" className="flex min-h-[68px] flex-col items-center justify-center gap-2 rounded-[9px] border border-[var(--border-strong)] bg-[var(--surface)] px-2 text-center text-xs font-semibold">
              <FaArrowUp aria-hidden="true" /> Adicionar dinheiro
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
    <article className="min-h-[278px] rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-5">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.04em] text-[var(--text-muted)]">
        Meu dinheiro <FaEye aria-hidden="true" />
      </div>
      <strong className={`mt-3 block text-[30px] font-extrabold leading-none tracking-tight ${total < 0 ? 'text-[var(--expense)]' : 'text-[var(--income)]'}`}>
        {displayMoney(total, showValues, currency)}
      </strong>
      <p className="mt-2 text-xs text-[var(--text-muted)]">Total disponível em todas as contas</p>

      <div className="mt-3 divide-y divide-[var(--border)] border-t border-[var(--border)]">
        {accounts.length === 0 ? (
          <p className="py-4 text-sm text-[var(--text-muted)]">Nenhuma conta ativa nesta moeda.</p>
        ) : (
          accounts.slice(0, 4).map((account) => (
            <Link key={account.id} href="/contas" className="flex min-h-[47px] items-center justify-between gap-3 py-2">
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
    <article className="min-h-[278px] rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-5">
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
            <div key={item.id} className="grid min-h-[53px] grid-cols-[46px_minmax(0,1fr)_auto] items-center gap-3 py-1.5">
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
    <article className="rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-[22px]">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold">Principais categorias de gastos</h2>
        <span className="hidden text-xs font-semibold capitalize text-[var(--text-muted)] sm:inline">{monthLabel(`${period.year}-${String(period.month).padStart(2, '0')}`)}</span>
      </div>
      <div className="mt-4 divide-y divide-[var(--border)]">
        {categories.length === 0 ? (
          <p className="py-4 text-sm text-[var(--text-muted)]">Nenhuma despesa categorizada neste período.</p>
        ) : (
          categories.map((category) => (
            <div key={category.id} className="grid min-h-[42px] grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-1.5 sm:grid-cols-[minmax(0,1.1fr)_120px_minmax(90px,.8fr)_44px]">
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-white" style={{ backgroundColor: category.color }}><IconRenderer iconName={category.icon || 'tag'} size={14} /></span>
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
      <Link href="/categorias" className="mt-3 flex min-h-10 items-center justify-between rounded-[10px] border border-[var(--border-strong)] px-3 text-sm font-semibold">
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
    <article className="min-h-[244px] rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-[22px]">
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
              <Link key={transaction.id} href={`/transacoes/show/${transaction.id}`} className="grid min-h-[39px] grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-1.5 sm:grid-cols-[minmax(0,1.25fr)_130px_105px_auto]">
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-white ${isTransfer ? 'bg-[var(--orbit-primary)]' : isIncome ? 'bg-[var(--income)]' : ''}`}
                    style={!isTransfer && !isIncome ? { backgroundColor: transaction.category.color } : undefined}
                  >
                    {isTransfer ? <FaExchangeAlt size={12} aria-hidden="true" /> : <IconRenderer iconName={transaction.category.icon || (isIncome ? 'income-up' : 'tag')} size={12} />}
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
  currentBalance,
  pendingExpenses,
  projectedBalance,
  showValues,
  currency,
  loading,
  error,
  commitmentCount,
  horizonEnd,
  onOpen,
  enabled,
}: {
  currentBalance: number;
  pendingExpenses: number;
  projectedBalance: number | null;
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
    <article className="min-h-[244px] rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-[22px]">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-bold">Saldo projetado</h2>
        <span className="rounded-full border border-[var(--orbit-primary)]/35 bg-[var(--orbit-primary-subtle)] px-2.5 py-1 text-[10px] font-semibold text-[var(--orbit-primary)]">Com base nos compromissos</span>
        <FaQuestionCircle className="ml-auto text-xs text-[var(--text-muted)]" aria-hidden="true" />
      </div>

      {error ? (
        <p className="mt-4 text-sm text-[var(--expense)]">{error}</p>
      ) : loading ? (
        <div className="mt-4 h-28 animate-pulse rounded-xl bg-[var(--skeleton)]" role="status" aria-label="Carregando saldo projetado" />
      ) : (
        <div className="mt-3">
          <ProjectionRow label="Saldo atual" value={displayMoney(currentBalance, showValues, currency)} />
          <ProjectionRow label="(-) Compromissos futuros" value={pendingExpenses > 0 ? `- ${displayMoney(pendingExpenses, showValues, currency)}` : displayMoney(0, showValues, currency)} tone={pendingExpenses > 0 ? 'expense' : 'neutral'} />
          <ProjectionRow label="(-) Gastos recorrentes (estimado)" value="—" tone="expense" />
          <div className="mt-1 flex items-end justify-between gap-3 border-t border-[var(--border)] pt-3">
            <span className="text-sm font-bold">Saldo projetado para {projectedDate}</span>
            <strong className={`text-xl font-extrabold ${projectedBalance !== null && projectedBalance < 0 ? 'text-[var(--expense)]' : 'text-[var(--income)]'}`}>
              {projectedBalance === null ? '—' : displayMoney(projectedBalance, showValues, currency)}
            </strong>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={onOpen}
        disabled={!enabled}
        aria-label="Ver projeção"
        className="mt-3 flex w-full min-h-[58px] items-center gap-3 rounded-[10px] border border-[var(--border-strong)] bg-[var(--surface-raised)] px-3 text-left disabled:opacity-50"
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
    <div className="flex items-center justify-between gap-3 py-1.5">
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
      <div className="grid gap-4 xl:grid-cols-[1.95fr_1fr_1.22fr]">
        <div className="h-[278px] animate-pulse rounded-[14px] bg-[var(--skeleton)]" />
        <div className="h-[278px] animate-pulse rounded-[14px] bg-[var(--skeleton)]" />
        <div className="h-[278px] animate-pulse rounded-[14px] bg-[var(--skeleton)]" />
      </div>
      <div className="grid gap-4 xl:grid-cols-[1.15fr_1fr]">
        <div className="h-[252px] animate-pulse rounded-[14px] bg-[var(--skeleton)]" />
        <div className="h-[252px] animate-pulse rounded-[14px] bg-[var(--skeleton)]" />
      </div>
      <div className="grid gap-4 xl:grid-cols-[1.36fr_1fr]">
        <div className="h-[244px] animate-pulse rounded-[14px] bg-[var(--skeleton)]" />
        <div className="h-[244px] animate-pulse rounded-[14px] bg-[var(--skeleton)]" />
      </div>
    </div>
  );
}
