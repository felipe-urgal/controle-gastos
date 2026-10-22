'use client';

import { useMemo, useState } from 'react';
import {
  FaArrowDown,
  FaArrowUp,
  FaChartLine,
  FaChevronDown,
  FaCreditCard,
} from 'react-icons/fa';

import { ProtectedRoute } from '@/app/components/layout';
import { Button, Select } from '@/app/components/ui';
import { useAuth } from '@/app/context';
import { useForecast } from '@/app/hooks/dashboard/use-forecast';
import { currencyOptions } from '@/app/lib/constants/account.constants';
import { formatCurrency } from '@/app/lib/currency/format-currency';
import ForecastScenarioPanel from './forecast-scenario-panel';
import { ForecastBalanceChart } from './forecast-balance-chart';
import {
  buildBalanceSeries,
  buildTimelineEntries,
  type BalanceSeries,
  type TimelineEntry,
} from './forecast-series';
import type { SupportedCurrency } from '@/app/types/financial-summary';
import type {
  ForecastAccount,
  ForecastData,
  ForecastHorizonDays,
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

type ForecastPanelProps = {
  embedded?: boolean;
  initialCurrency?: SupportedCurrency;
  initialData?: ForecastData | null;
};

export default function ForecastPanel({
  embedded = false,
  initialCurrency = 'BRL',
  initialData = null,
}: ForecastPanelProps = {}) {
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
  } = useForecast(initialCurrency, initialData);

  const accountNames = useMemo(
    () => new Map(data?.accounts.map((account) => [account.id, account.name]) ?? []),
    [data?.accounts],
  );

  const series = useMemo(() => (data ? buildBalanceSeries(data) : null), [data]);
  const timeline = useMemo(() => (data ? buildTimelineEntries(data, accountNames) : []), [data, accountNames]);

  const content = (
    <section
      className={embedded ? 'space-y-4' : 'mt-5 space-y-4'}
      aria-labelledby={embedded ? undefined : 'forecast-title'}
    >
      <div className="ds-panel p-5 sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          {!embedded && (
            <div className="max-w-2xl pr-10 sm:pr-12">
              <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--orbit-primary)]">
                Próximos movimentos
              </p>
              <div className="mt-1 flex items-center gap-2">
                <FaChartLine
                  className="text-[var(--orbit-primary)]"
                  aria-hidden="true"
                />
                <h2
                  id="forecast-title"
                  className="text-xl font-semibold text-[var(--foreground)]"
                >
                  Saldo projetado
                </h2>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-[var(--text-muted)]">
                Leitura dos lançamentos pendentes já cadastrados. O realizado não muda
                e nenhuma ocorrência é criada por esta visualização.
              </p>
            </div>
          )}

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
              <legend className="mb-2 text-sm font-medium text-[var(--foreground)]">
                Horizonte
              </legend>
              <div className="flex rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-subtle)] p-1">
                {horizonOptions.map((option) => (
                  <Button
                    key={option}
                    variant={days === option ? 'secondary' : 'ghost'}
                    size="sm"
                    aria-pressed={days === option}
                    onClick={() => setDays(option)}
                    disabled={loading}
                    className="flex-1"
                  >
                    {option}d
                  </Button>
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
              Referência {formatLogicalDate(data.asOf)} · até{' '}
              {formatLogicalDate(data.horizonEnd)}
            </span>
            <span>
              {data.currency} · {data.horizonDays} dias
            </span>
          </div>

          {series && (
            <ForecastSummary series={series} currency={data.currency} showValues={showValues} />
          )}

          {series && (
            <section className="ds-panel p-4 sm:p-5" aria-labelledby="forecast-chart-title">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 id="forecast-chart-title" className="font-semibold text-[var(--foreground)]">
                  Como o saldo evolui
                </h3>
                <p className="text-xs text-[var(--text-muted)]">
                  Soma das contas · só lançamentos pendentes já cadastrados
                </p>
              </div>
              <div className="mt-3">
                <ForecastBalanceChart series={series} currency={data.currency} showValues={showValues} />
              </div>
            </section>
          )}

          <ForecastTimeline entries={timeline} currency={data.currency} showValues={showValues} horizonDays={data.horizonDays} />

          <Disclosure title="Por conta" hint={`${data.accounts.length} ${data.accounts.length === 1 ? 'conta' : 'contas'}`}>
            {data.accounts.length === 0 ? (
              <p className="text-sm text-[var(--text-muted)]">
                Nenhuma conta ativa em {data.currency} para projetar.
              </p>
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
          </Disclosure>

          <Disclosure title="Simular um cenário" hint="Não salva nada">
            <ForecastScenarioPanel key={data.currency} data={data} showValues={showValues} />
          </Disclosure>

          <Disclosure title="Como calculamos o disponível para gastar">
            <SafeToSpendCard
              safeToSpend={data.safeToSpend}
              horizonEnd={data.safeToSpend.through ?? data.horizonEnd}
              currency={data.currency}
              showValues={showValues}
            />
          </Disclosure>
        </div>
      ) : null}
    </section>
  );

  return embedded ? content : <ProtectedRoute>{content}</ProtectedRoute>;
}

function SafeToSpendCard({
  safeToSpend,
  horizonEnd,
  currency,
  showValues,
}: {
  safeToSpend: import('@/app/types/forecast').ForecastSafeToSpend;
  horizonEnd: ForecastLogicalDate;
  currency: string;
  showValues: boolean;
}) {
  const transferValue = safeToSpend.transferNet;
  const transferLabel =
    transferValue > 0
      ? `+ ${displayMoney(transferValue, showValues, currency)}`
      : transferValue < 0
        ? `- ${displayMoney(Math.abs(transferValue), showValues, currency)}`
        : displayMoney(0, showValues, currency);

  return (
    <article className="ds-panel p-5" aria-labelledby="safe-to-spend-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.12em] text-[var(--orbit-primary)]">
            Capacidade de gasto
          </p>
          <h3 id="safe-to-spend-title" className="mt-1 text-lg font-semibold text-[var(--foreground)]">
            Disponível para gastar
          </h3>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Saldo realizado menos compromissos conhecidos até {formatLogicalDate(horizonEnd)}.
          </p>
        </div>
        <strong
          className={`text-2xl font-extrabold ${
            safeToSpend.safeToSpend < 0
              ? 'text-[var(--expense)]'
              : 'text-[var(--foreground)]'
          }`}
        >
          <span className="money">{displayMoney(safeToSpend.safeToSpend, showValues, currency)}</span>
        </strong>
      </div>

      <dl className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-[var(--radius-md)] bg-[var(--surface-subtle)] p-3">
          <dt className="text-xs text-[var(--text-muted)]">Saldo realizado</dt>
          <dd className="mt-1 font-semibold text-[var(--foreground)]">
            <span className="money">{displayMoney(safeToSpend.realizedBalance, showValues, currency)}</span>
          </dd>
        </div>
        <div className="rounded-[var(--radius-md)] bg-[var(--surface-subtle)] p-3">
          <dt className="text-xs text-[var(--text-muted)]">Pendências</dt>
          <dd className="mt-1 font-semibold text-[var(--expense)]">
            {safeToSpend.pendingExpenses > 0 ? '- ' : ''}
            <span className="money">{displayMoney(safeToSpend.pendingExpenses, showValues, currency)}</span>
          </dd>
        </div>
        <div className="rounded-[var(--radius-md)] bg-[var(--surface-subtle)] p-3">
          <dt className="text-xs text-[var(--text-muted)]">Faturas em aberto</dt>
          <dd className="mt-1 font-semibold text-[var(--expense)]">
            {safeToSpend.cardCommitments > 0 ? '- ' : ''}
            <span className="money">{displayMoney(safeToSpend.cardCommitments, showValues, currency)}</span>
          </dd>
        </div>
        <div className="rounded-[var(--radius-md)] bg-[var(--surface-subtle)] p-3">
          <dt className="text-xs text-[var(--text-muted)]">Transferências líquidas</dt>
          <dd
            className={`money mt-1 font-semibold ${
              transferValue > 0
                ? 'text-[var(--income)]'
                : transferValue < 0
                  ? 'text-[var(--expense)]'
                  : 'text-[var(--foreground)]'
            }`}
          >
            {transferLabel}
          </dd>
        </div>
      </dl>

      {safeToSpend.accounts.length > 0 ? (
        <div className="mt-4 border-t border-[var(--border)] pt-3">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
            Por conta corrente
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {safeToSpend.accounts.map((account) => (
              <span
                key={account.id}
                className="rounded-full border border-[var(--border)] px-2.5 py-1 text-xs text-[var(--text-muted)]"
              >
                {account.name}: <span className="money">{displayMoney(account.safeToSpend, showValues, currency)}</span>
              </span>
            ))}
          </div>
        </div>
      ) : null}

      <p className="mt-3 text-xs leading-relaxed text-[var(--text-subtle)]">
        Receitas futuras não são antecipadas. Metas, dívidas e contas de investimento só afetam este valor quando já existe um lançamento financeiro concreto.
      </p>
    </article>
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
    <article
      className="ds-panel p-5"
      aria-labelledby={`forecast-account-${account.id}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-[var(--text-muted)]">Conta</p>
          <h3
            id={`forecast-account-${account.id}`}
            className="font-semibold text-[var(--foreground)]"
          >
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
            <span className="money">{displayMoney(account.realizedBalance, showValues, currency)}</span>
          </dd>
        </div>
        <div className="rounded-[var(--radius-md)] bg-[var(--surface-subtle)] p-3">
          <dt className="text-sm text-[var(--text-muted)]">Projetado</dt>
          <dd
            className={`mt-1 font-semibold ${
              account.projectedBalance < 0
                ? 'text-[var(--expense)]'
                : 'text-[var(--foreground)]'
            }`}
          >
            <span className="money">{displayMoney(account.projectedBalance, showValues, currency)}</span>
          </dd>
        </div>
        <div className="rounded-[var(--radius-md)] border border-[var(--border)] p-3">
          <dt className="flex items-center gap-1.5 text-sm text-[var(--text-muted)]">
            <FaArrowUp className="text-[var(--income)]" aria-hidden="true" />
            Pendências de entrada
          </dt>
          <dd className="mt-1 font-medium text-[var(--income)]">
            <span className="money">{displayMoney(account.pendingIncome, showValues, currency)}</span>
          </dd>
        </div>
        <div className="rounded-[var(--radius-md)] border border-[var(--border)] p-3">
          <dt className="flex items-center gap-1.5 text-sm text-[var(--text-muted)]">
            <FaArrowDown className="text-[var(--expense)]" aria-hidden="true" />
            Pendências de saída
          </dt>
          <dd className="mt-1 font-medium text-[var(--expense)]">
            <span className="money">{displayMoney(account.pendingExpense, showValues, currency)}</span>
          </dd>
        </div>
      </dl>

      <div className="mt-4 rounded-[var(--radius-md)] border border-[var(--border)] p-3 text-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-[var(--text-muted)]">Menor saldo projetado</span>
          <strong
            className={
              account.lowestProjectedBalance < 0
                ? 'text-[var(--expense)]'
                : 'text-[var(--foreground)]'
            }
          >
            <span className="money">{displayMoney(account.lowestProjectedBalance, showValues, currency)}</span>
          </strong>
        </div>
        <p className="mt-1 text-[var(--text-subtle)]">
          em {formatLogicalDate(account.lowestProjectedBalanceDate)}
        </p>
      </div>
    </article>
  );
}

function Disclosure({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <details className="group ds-panel">
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 rounded-[var(--radius-lg)] px-4 py-3 font-semibold text-[var(--foreground)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)] sm:px-5 [&::-webkit-details-marker]:hidden">
        <span>{title}</span>
        <span className="flex items-center gap-3 text-sm font-normal text-[var(--text-muted)]">
          {hint}
          <FaChevronDown className="text-xs transition-transform group-open:rotate-180" aria-hidden="true" />
        </span>
      </summary>
      <div className="px-4 pb-4 sm:px-5 sm:pb-5">{children}</div>
    </details>
  );
}

function ForecastSummary({
  series,
  currency,
  showValues,
}: {
  series: BalanceSeries;
  currency: string;
  showValues: boolean;
}) {
  const drops = series.lowest.balance < series.startBalance;
  const change = series.endBalance - series.startBalance;
  const tones = (value: number) => (value < 0 ? 'text-[var(--expense)]' : 'text-[var(--foreground)]');

  return (
    <dl className="grid gap-3 sm:grid-cols-3">
      <div className="ds-panel p-4">
        <dt className="text-sm text-[var(--text-muted)]">Saldo hoje</dt>
        <dd className={`mt-1 text-xl font-semibold tabular-nums ${tones(series.startBalance)}`}>
          <span className="money">{displayMoney(series.startBalance, showValues, currency)}</span>
        </dd>
        <p className="mt-1 text-xs text-[var(--text-muted)]">Realizado, em {formatLogicalDate(series.asOf)}</p>
      </div>
      <div className={`ds-panel p-4 ${series.lowest.balance < 0 ? 'border-[var(--expense)]/45' : ''}`}>
        <dt className="text-sm text-[var(--text-muted)]">Menor saldo no período</dt>
        <dd className={`mt-1 text-xl font-semibold tabular-nums ${tones(series.lowest.balance)}`}>
          <span className="money">{displayMoney(series.lowest.balance, showValues, currency)}</span>
        </dd>
        <p className="mt-1 text-xs text-[var(--text-muted)]">
          {drops
            ? series.lowest.balance < 0
              ? `Fica negativo em ${formatLogicalDate(series.lowest.date)}`
              : `Em ${formatLogicalDate(series.lowest.date)}`
            : 'Sem queda prevista abaixo do saldo de hoje'}
        </p>
      </div>
      <div className="ds-panel p-4">
        <dt className="text-sm text-[var(--text-muted)]">Saldo em {formatLogicalDate(series.horizonEnd)}</dt>
        <dd className={`mt-1 text-xl font-semibold tabular-nums ${tones(series.endBalance)}`}>
          <span className="money">{displayMoney(series.endBalance, showValues, currency)}</span>
        </dd>
        <p className={`mt-1 text-xs ${change < 0 ? 'text-[var(--expense)]' : change > 0 ? 'text-[var(--income)]' : 'text-[var(--text-muted)]'}`}>
          {change === 0
            ? 'Igual ao saldo de hoje'
            : <><span className="money">{change > 0 ? '+' : '−'} {displayMoney(Math.abs(change), showValues, currency)}</span> no período</>}
        </p>
      </div>
    </dl>
  );
}

const TIMELINE_PREVIEW = 8;

function ForecastTimeline({
  entries,
  currency,
  showValues,
  horizonDays,
}: {
  entries: TimelineEntry[];
  currency: string;
  showValues: boolean;
  horizonDays: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? entries : entries.slice(0, TIMELINE_PREVIEW);
  const overdueCount = entries.filter((entry) => entry.overdue).length;

  const groups: Array<{ key: string; label: string; overdue: boolean; items: TimelineEntry[] }> = [];
  for (const entry of visible) {
    const key = entry.overdue ? 'overdue' : `${entry.date.year}-${entry.date.month}-${entry.date.day}`;
    const last = groups[groups.length - 1];
    if (last && last.key === key) {
      last.items.push(entry);
    } else {
      groups.push({ key, label: entry.overdue ? 'Vencidos' : formatLogicalDate(entry.date), overdue: entry.overdue, items: [entry] });
    }
  }

  return (
    <section className="ds-panel p-4 sm:p-5" aria-labelledby="forecast-timeline-title">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 id="forecast-timeline-title" className="font-semibold text-[var(--foreground)]">
          O que vem pela frente
        </h3>
        <p className="text-xs text-[var(--text-muted)]">
          Próximos {horizonDays} dias{overdueCount > 0 ? ` · ${overdueCount} vencido${overdueCount === 1 ? '' : 's'}` : ''}
        </p>
      </div>

      {entries.length === 0 ? (
        <p className="mt-3 rounded-[var(--radius-md)] bg-[var(--surface-subtle)] p-3 text-sm text-[var(--text-muted)]">
          Nenhum lançamento pendente neste período.
        </p>
      ) : (
        <div className="mt-3 space-y-4">
          {groups.map((group) => (
            <div key={group.key}>
              <p className={`text-xs font-semibold uppercase tracking-[0.08em] ${group.overdue ? 'text-[var(--warning)]' : 'text-[var(--text-muted)]'}`}>
                {group.label}
              </p>
              {group.overdue && (
                <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                  Continuam pendentes; esta leitura não muda data nem status.
                </p>
              )}
              <ul className="mt-1 divide-y divide-[var(--border)]">
                {group.items.map((entry) => (
                  <li key={entry.id} className="flex items-start justify-between gap-3 py-2.5">
                    <div className="flex min-w-0 items-start gap-2.5">
                      {entry.kind === 'CARD' && (
                        <FaCreditCard className="mt-1 shrink-0 text-[var(--orbit-primary)]" aria-hidden="true" />
                      )}
                      <div className="min-w-0">
                        <p className="break-words text-sm font-medium text-[var(--foreground)]">{entry.title}</p>
                        <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                          {entry.subtitle}
                          {entry.overdue ? ` · ${formatLogicalDate(entry.date)}` : ''}
                        </p>
                      </div>
                    </div>
                    <span className={`shrink-0 text-sm font-semibold tabular-nums ${entry.amount > 0 ? 'text-[var(--income)]' : 'text-[var(--expense)]'}`}>
                      {entry.amount > 0 ? '+ ' : '− '}
                      <span className="money">{displayMoney(Math.abs(entry.amount), showValues, currency)}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {entries.length > TIMELINE_PREVIEW && (
        <div className="mt-3">
          <Button type="button" size="sm" variant="outline" onClick={() => setExpanded((value) => !value)} aria-expanded={expanded}>
            {expanded ? 'Mostrar menos' : `Mostrar todos (${entries.length})`}
          </Button>
        </div>
      )}
    </section>
  );
}

function ForecastLoading() {
  return (
    <div
      className="grid gap-4 lg:grid-cols-2"
      aria-label="Carregando projeção financeira"
      aria-busy="true"
    >
      {[0, 1].map((item) => (
        <div key={item} className="ds-panel p-5">
          <div className="h-4 w-32 animate-pulse rounded bg-[var(--surface-subtle)]" />
          <div className="mt-4 grid grid-cols-2 gap-3">
            {[0, 1, 2, 3].map((cell) => (
              <div
                key={cell}
                className="h-16 animate-pulse rounded-[var(--radius-md)] bg-[var(--surface-subtle)]"
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
