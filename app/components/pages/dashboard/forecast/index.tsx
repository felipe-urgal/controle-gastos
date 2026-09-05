'use client';

import { useMemo } from 'react';
import { FaArrowDown, FaArrowUp, FaChartLine, FaClock, FaExclamationTriangle } from 'react-icons/fa';

import { ProtectedRoute } from '@/app/components/layout';
import { Select } from '@/app/components/ui';
import { useAuth } from '@/app/context';
import { useForecast } from '@/app/hooks/dashboard/use-forecast';
import { currencyOptions } from '@/app/lib/constants/account.constants';
import { formatCurrency } from '@/app/lib/currency/format-currency';
import type { SupportedCurrency } from '@/app/types/financial-summary';
import type {
  ForecastAccount,
  ForecastHorizonDays,
  ForecastItem,
  ForecastLogicalDate,
} from '@/app/types/forecast';

const horizonOptions: ForecastHorizonDays[] = [30, 60, 90];
const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});

function formatLogicalDate(date: ForecastLogicalDate) {
  return dateFormatter
    .format(new Date(Date.UTC(date.year, date.month - 1, date.day)))
    .replace('.', '');
}

function displayMoney(amount: number, showValues: boolean, currency: string) {
  return showValues ? formatCurrency(amount, currency) : '••••';
}

export default function ForecastPanel() {
  const { user } = useAuth();
  const showValues = user?.showValues !== false;
  const {
    currency,
    days,
    data,
    loading,
    error,
    setCurrency,
    setDays,
  } = useForecast();

  const accountNames = useMemo(
    () => new Map(data?.accounts.map((account) => [account.id, account.name]) ?? []),
    [data?.accounts],
  );

  return (
    <ProtectedRoute>
      <section className="mt-5 space-y-4" aria-labelledby="forecast-title">
        <div className="ds-panel p-5 sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--orbit-primary)]">
                Próximos movimentos
              </p>
              <div className="mt-1 flex items-center gap-2">
                <FaChartLine className="text-[var(--orbit-primary)]" aria-hidden="true" />
                <h2 id="forecast-title" className="text-xl font-semibold text-[var(--foreground)]">
                  Saldo projetado
                </h2>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-[var(--text-muted)]">
                Leitura dos lançamentos pendentes já cadastrados. O realizado não muda e nenhuma ocorrência é criada por esta visualização.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-[180px_auto] sm:items-end">
              <Select
                id="forecast-currency"
                label="Moeda"
                value={currency}
                options={currencyOptions}
                onChange={(value) => setCurrency(value as SupportedCurrency)}
                disabled={loading}
              />
              <fieldset className="min-w-0">
                <legend className="mb-2 text-sm font-medium text-[var(--foreground)]">Horizonte</legend>
                <div className="flex rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-subtle)] p-1">
                  {horizonOptions.map((option) => (
                    <button
                      key={option}
                      type="button"
                      aria-pressed={days === option}
                      onClick={() => setDays(option)}
                      disabled={loading}
                      className={`min-h-11 flex-1 rounded-[var(--radius-md)] px-3 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)] ${
                        days === option
                          ? 'bg-[var(--surface)] text-[var(--orbit-primary)] shadow-sm'
                          : 'text-[var(--text-muted)] hover:text-[var(--foreground)]'
                      }`}
                    >
                      {option}d
                    </button>
                  ))}
                </div>
              </fieldset>
            </div>
          </div>
        </div>

        {error ? (
          <div
            role="alert"
            className="rounded-[var(--radius-md)] border border-[var(--danger)]/35 bg-[var(--danger-subtle)] p-4 text-sm text-[var(--expense)]"
          >
            {error}
          </div>
        ) : loading ? (
          <ForecastLoading />
        ) : data ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-sm text-[var(--text-muted)]">
              <span>
                Referência {formatLogicalDate(data.asOf)} · até {formatLogicalDate(data.horizonEnd)}
              </span>
              <span>{data.currency} · {data.horizonDays} dias</span>
            </div>

            {data.accounts.length === 0 ? (
              <div className="ds-panel p-5 text-sm text-[var(--text-muted)]">
                Nenhuma conta ativa em {data.currency} para projetar.
              </div>
            ) : (
              <div className="grid gap-4 lg:grid-cols-2">
                {data.accounts.map((account) => (
                  <ForecastAccountCard
                    key={account.id}
                    account={account}
                    currency={data.currency}
                    showValues={showValues}
                  />
                ))}
              </div>
            )}

            <div className="grid gap-4 xl:grid-cols-2">
              <ForecastList
                id="forecast-overdue"
                title="Pendências vencidas"
                description="Continuam pendentes; esta leitura não muda data nem status."
                items={data.overdue}
                accountNames={accountNames}
                currency={data.currency}
                showValues={showValues}
                tone="warning"
              />
              <ForecastList
                id="forecast-upcoming"
                title="Próximos lançamentos"
                description={`Pendências concretas dentro dos próximos ${data.horizonDays} dias.`}
                items={data.upcoming}
                accountNames={accountNames}
                currency={data.currency}
                showValues={showValues}
                tone="default"
              />
            </div>
          </div>
        ) : null}
      </section>
    </ProtectedRoute>
  );
}

function ForecastAccountCard({
  account,
  currency,
  showValues,
}: {
  account: ForecastAccount;
  currency: string;
  showValues: boolean;
}) {
  return (
    <article className="ds-panel p-5" aria-labelledby={`forecast-account-${account.id}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-[var(--text-muted)]">Conta</p>
          <h3 id={`forecast-account-${account.id}`} className="font-semibold text-[var(--foreground)]">
            {account.name}
          </h3>
        </div>
        <span className="rounded-full border border-[var(--border)] px-2.5 py-1 text-sm text-[var(--text-muted)]">
          {currency}
        </span>
      </div>

      <dl className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-[var(--radius-md)] bg-[var(--surface-subtle)] p-3">
          <dt className="text-sm text-[var(--text-muted)]">Realizado</dt>
          <dd className="mt-1 font-semibold text-[var(--foreground)]">
            {displayMoney(account.realizedBalance, showValues, currency)}
          </dd>
        </div>
        <div className="rounded-[var(--radius-md)] bg-[var(--surface-subtle)] p-3">
          <dt className="text-sm text-[var(--text-muted)]">Projetado</dt>
          <dd className={`mt-1 font-semibold ${account.projectedBalance < 0 ? 'text-[var(--expense)]' : 'text-[var(--foreground)]'}`}>
            {displayMoney(account.projectedBalance, showValues, currency)}
          </dd>
        </div>
        <div className="rounded-[var(--radius-md)] border border-[var(--border)] p-3">
          <dt className="flex items-center gap-1.5 text-sm text-[var(--text-muted)]">
            <FaArrowUp className="text-[var(--income)]" aria-hidden="true" /> Pendências de entrada
          </dt>
          <dd className="mt-1 font-medium text-[var(--income)]">
            {displayMoney(account.pendingIncome, showValues, currency)}
          </dd>
        </div>
        <div className="rounded-[var(--radius-md)] border border-[var(--border)] p-3">
          <dt className="flex items-center gap-1.5 text-sm text-[var(--text-muted)]">
            <FaArrowDown className="text-[var(--expense)]" aria-hidden="true" /> Pendências de saída
          </dt>
          <dd className="mt-1 font-medium text-[var(--expense)]">
            {displayMoney(account.pendingExpense, showValues, currency)}
          </dd>
        </div>
      </dl>

      <div className="mt-4 rounded-[var(--radius-md)] border border-[var(--border)] p-3 text-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-[var(--text-muted)]">Menor saldo projetado</span>
          <strong className={account.lowestProjectedBalance < 0 ? 'text-[var(--expense)]' : 'text-[var(--foreground)]'}>
            {displayMoney(account.lowestProjectedBalance, showValues, currency)}
          </strong>
        </div>
        <p className="mt-1 text-[var(--text-subtle)]">
          em {formatLogicalDate(account.lowestProjectedBalanceDate)}
        </p>
      </div>
    </article>
  );
}

function ForecastList({
  id,
  title,
  description,
  items,
  accountNames,
  currency,
  showValues,
  tone,
}: {
  id: string;
  title: string;
  description: string;
  items: ForecastItem[];
  accountNames: Map<string, string>;
  currency: string;
  showValues: boolean;
  tone: 'warning' | 'default';
}) {
  const visibleItems = items.slice(0, 6);

  return (
    <section className="ds-panel p-5" aria-labelledby={id}>
      <div className="flex items-start gap-2">
        {tone === 'warning' ? (
          <FaExclamationTriangle className="mt-1 text-[var(--warning)]" aria-hidden="true" />
        ) : (
          <FaClock className="mt-1 text-[var(--orbit-primary)]" aria-hidden="true" />
        )}
        <div>
          <h3 id={id} className="font-semibold text-[var(--foreground)]">{title}</h3>
          <p className="mt-1 text-sm text-[var(--text-muted)]">{description}</p>
        </div>
      </div>

      {items.length === 0 ? (
        <p className="mt-4 rounded-[var(--radius-md)] bg-[var(--surface-subtle)] p-3 text-sm text-[var(--text-muted)]">
          Nenhum lançamento neste grupo.
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-[var(--border)]">
          {visibleItems.map((item) => (
            <li key={item.id} className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
              <div className="min-w-0">
                <p className="break-words text-sm font-medium text-[var(--foreground)]">{item.description}</p>
                <p className="mt-0.5 text-sm text-[var(--text-muted)]">
                  {formatLogicalDate(item)} · {accountNames.get(item.accountId) ?? 'Conta'}
                  {item.kind === 'TRANSFER' ? ' · Transferência' : ''}
                </p>
              </div>
              <span className={`shrink-0 text-sm font-semibold ${item.type === 'INCOME' ? 'text-[var(--income)]' : 'text-[var(--expense)]'}`}>
                {item.type === 'INCOME' ? '+' : '-'}{displayMoney(item.amount, showValues, currency)}
              </span>
            </li>
          ))}
        </ul>
      )}

      {items.length > visibleItems.length ? (
        <p className="mt-4 text-sm text-[var(--text-muted)]">
          +{items.length - visibleItems.length} lançamento(s) no horizonte. A lista visual é resumida; o cálculo usa todos.
        </p>
      ) : null}
    </section>
  );
}

function ForecastLoading() {
  return (
    <div className="grid gap-4 lg:grid-cols-2" aria-label="Carregando projeção financeira" aria-busy="true">
      {[0, 1].map((item) => (
        <div key={item} className="ds-panel p-5">
          <div className="h-4 w-32 animate-pulse rounded bg-[var(--surface-subtle)]" />
          <div className="mt-4 grid grid-cols-2 gap-3">
            {[0, 1, 2, 3].map((cell) => (
              <div key={cell} className="h-16 animate-pulse rounded-[var(--radius-md)] bg-[var(--surface-subtle)]" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
