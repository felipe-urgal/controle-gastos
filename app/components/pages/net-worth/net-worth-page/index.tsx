'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  FaChartLine,
  FaChevronRight,
  FaEye,
} from 'react-icons/fa';

import { PageEmpty, PageLoading } from '@/app/components/feedback';
import { ProtectedRoute } from '@/app/components/layout';
import { IconRenderer } from '@/app/components/ui';
import { useAuth } from '@/app/context';
import { formatCurrency } from '@/app/lib/currency/format-currency';
import { netWorthService } from '@/app/services/net-worth-service';
import type { SupportedCurrency } from '@/app/types/financial-summary';
import type { NetWorthAccount, NetWorthData } from '@/app/types/net-worth';

const currencies: SupportedCurrency[] = ['BRL', 'USD', 'EUR'];

function currentPeriod() {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

function displayMoney(amount: number, showValues: boolean, currency: string) {
  return showValues ? formatCurrency(amount, currency) : '••••';
}

function monthShort(year: number, month: number) {
  return new Intl.DateTimeFormat('pt-BR', {
    month: 'short',
    year: '2-digit',
  })
    .format(new Date(year, month - 1, 1))
    .replace('.', '');
}

export default function NetWorthPage() {
  const { user } = useAuth();
  const showValues = user?.showValues !== false;

  const [{ year, month }] = useState(currentPeriod);
  const [months, setMonths] = useState(12);
  const [data, setData] = useState<NetWorthData | null>(null);
  const [selectedCurrency, setSelectedCurrency] =
    useState<SupportedCurrency>('BRL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    void netWorthService
      .get({ year, month, months })
      .then((response) => {
        if (cancelled) return;
        setData(response.data);
        setError('');
        const firstAvailable = currencies.find(
          (currency) =>
            response.data.byCurrency.some((item) => item.currency === currency),
        );
        if (firstAvailable) {
          setSelectedCurrency((current) =>
            response.data.byCurrency.some((item) => item.currency === current)
              ? current
              : firstAvailable,
          );
        }
      })
      .catch((requestError) => {
        if (cancelled) return;
        setError(
          requestError instanceof Error
            ? requestError.message
            : 'Não foi possível carregar o patrimônio',
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [month, months, year]);

  const selected = useMemo(
    () =>
      data?.byCurrency.find((item) => item.currency === selectedCurrency) ??
      null,
    [data, selectedCurrency],
  );

  const history = useMemo(
    () =>
      data?.history.map((point) => ({
        ...point,
        value: point.totals[selectedCurrency] ?? 0,
      })) ?? [],
    [data, selectedCurrency],
  );

  return (
    <ProtectedRoute>
      <section className="mx-auto w-full max-w-6xl pb-6">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-[34px] font-extrabold tracking-tight text-[var(--foreground)]">
              Patrimônio
            </h1>
            <p className="mt-1 text-sm text-[var(--text-muted)] sm:text-base">
              Saldos realizados por moeda, sem conversão cambial.
            </p>
          </div>

          <label className="block min-w-[150px]">
            <span className="ds-label mb-2 block">Histórico</span>
            <select
              value={months}
              onChange={(event) => setMonths(Number(event.target.value))}
              className="ds-control min-h-11 w-full px-3"
              aria-label="Período do histórico"
            >
              <option value={6}>6 meses</option>
              <option value={12}>12 meses</option>
              <option value={24}>24 meses</option>
              <option value={36}>36 meses</option>
              <option value={60}>60 meses</option>
            </select>
          </label>
        </header>

        {error && (
          <p
            role="alert"
            className="mt-4 rounded-[14px] border border-[var(--expense)]/30 bg-[var(--danger-subtle)] p-3 text-sm text-[var(--expense)]"
          >
            {error}
          </p>
        )}

        {loading ? (
          <div className="mt-5">
            <PageLoading />
          </div>
        ) : !data || data.byCurrency.length === 0 ? (
          <div className="mt-5 ds-panel p-8">
            <PageEmpty title="Nenhum patrimônio disponível" />
            <p className="mt-2 text-center text-sm text-[var(--text-muted)]">
              Adicione transações concluídas em contas correntes ou investimentos
              para começar a acompanhar a evolução.
            </p>
            <Link
              href="/contas"
              className="mx-auto mt-4 flex min-h-11 w-fit items-center gap-2 rounded-full bg-[var(--orbit-primary)] px-5 font-bold text-white"
            >
              Ver contas
              <FaChevronRight aria-hidden="true" />
            </Link>
          </div>
        ) : (
          <>
            <nav
              className="mt-5 flex gap-2 overflow-x-auto pb-1"
              aria-label="Selecionar moeda do patrimônio"
            >
              {currencies.map((currency) => {
                const available = data.byCurrency.some(
                  (item) => item.currency === currency,
                );
                return (
                  <button
                    key={currency}
                    type="button"
                    disabled={!available}
                    onClick={() => setSelectedCurrency(currency)}
                    aria-pressed={selectedCurrency === currency}
                    className={`min-h-10 shrink-0 rounded-full border px-4 text-sm font-bold disabled:opacity-35 ${
                      selectedCurrency === currency
                        ? 'border-[var(--orbit-primary)] bg-[var(--orbit-primary-subtle)] text-[var(--orbit-primary)]'
                        : 'border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)]'
                    }`}
                  >
                    {currency}
                  </button>
                );
              })}
            </nav>

            {selected && (
              <div className="mt-5 space-y-4">
                <NetWorthHero
                  total={selected.total}
                  currency={selected.currency}
                  showValues={showValues}
                  accountCount={selected.accounts.length}
                />

                <div className="grid gap-4 xl:grid-cols-[1.35fr_1fr]">
                  <HistoryCard
                    history={history}
                    currency={selected.currency}
                    showValues={showValues}
                  />
                  <DistributionCard
                    accounts={selected.accounts}
                    currency={selected.currency}
                    showValues={showValues}
                  />
                </div>
              </div>
            )}
          </>
        )}
      </section>
    </ProtectedRoute>
  );
}

function NetWorthHero({
  total,
  currency,
  showValues,
  accountCount,
}: {
  total: number;
  currency: SupportedCurrency;
  showValues: boolean;
  accountCount: number;
}) {
  return (
    <article className="relative overflow-hidden rounded-[22px] border border-[var(--orbit-primary)]/45 bg-[linear-gradient(135deg,color-mix(in_srgb,var(--orbit-primary)_34%,var(--surface))_0%,color-mix(in_srgb,#312e81_40%,var(--surface))_55%,color-mix(in_srgb,#111827_90%,var(--surface))_100%)] p-5 text-white shadow-[var(--shadow-surface)] sm:p-6">
      <FaChartLine
        className="pointer-events-none absolute -right-3 -top-1 text-[110px] text-white/5"
        aria-hidden="true"
      />
      <div className="relative z-[1]">
        <div className="flex items-center gap-2 text-sm font-semibold text-white/75">
          <FaEye aria-hidden="true" />
          Patrimônio em {currency}
        </div>
        <strong className="mt-3 block break-words text-[38px] font-extrabold leading-none tracking-tight sm:text-[44px]">
          {displayMoney(total, showValues, currency)}
        </strong>
        <p className="mt-2 text-sm text-white/65">
          {accountCount} {accountCount === 1 ? 'conta elegível' : 'contas elegíveis'} · valores realizados
        </p>
      </div>
    </article>
  );
}

function HistoryCard({
  history,
  currency,
  showValues,
}: {
  history: Array<{ year: number; month: number; value: number }>;
  currency: SupportedCurrency;
  showValues: boolean;
}) {
  const values = history.map((item) => item.value);
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 0);
  const range = Math.max(1, max - min);
  const width = 720;
  const height = 250;
  const paddingX = 28;
  const paddingY = 28;

  const points = history.map((item, index) => {
    const x =
      history.length <= 1
        ? width / 2
        : paddingX +
          (index / (history.length - 1)) * (width - paddingX * 2);
    const y =
      height -
      paddingY -
      ((item.value - min) / range) * (height - paddingY * 2);
    return { ...item, x, y };
  });

  const path =
    points.length === 0
      ? ''
      : points
          .map((point, index) =>
            `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`,
          )
          .join(' ');

  const first = history[0]?.value ?? 0;
  const last = history.at(-1)?.value ?? 0;
  const variation = last - first;

  return (
    <article className="rounded-[18px] border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-[var(--foreground)]">
            Evolução mensal
          </h2>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Fechamento de cada mês, com saldo realizado.
          </p>
        </div>
        <div className="text-right">
          <span className="block text-xs text-[var(--text-muted)]">
            Variação no período
          </span>
          <strong
            className={
              variation < 0
                ? 'text-[var(--expense)]'
                : variation > 0
                  ? 'text-[var(--income)]'
                  : 'text-[var(--foreground)]'
            }
          >
            {showValues
              ? `${variation > 0 ? '+' : ''}${formatCurrency(variation, currency)}`
              : '••••'}
          </strong>
        </div>
      </div>

      <div className="mt-4 overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-[250px] min-w-[620px] w-full"
          role="img"
          aria-label={`Evolução mensal do patrimônio em ${currency}`}
        >
          <line
            x1={paddingX}
            y1={height - paddingY}
            x2={width - paddingX}
            y2={height - paddingY}
            stroke="currentColor"
            className="text-[var(--border)]"
          />
          {path && (
            <path
              d={path}
              fill="none"
              stroke="currentColor"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-[var(--orbit-primary)]"
            />
          )}
          {points.map((point) => (
            <g key={`${point.year}-${point.month}`}>
              <circle
                cx={point.x}
                cy={point.y}
                r="5"
                fill="currentColor"
                className="text-[var(--orbit-primary)]"
              />
              <title>
                {monthShort(point.year, point.month)}: {displayMoney(point.value, showValues, currency)}
              </title>
            </g>
          ))}
        </svg>
      </div>

      <div className="mt-2 grid grid-cols-3 gap-2 text-xs text-[var(--text-muted)]">
        <span>{history[0] ? monthShort(history[0].year, history[0].month) : '—'}</span>
        <span className="text-center">
          {history[Math.floor(history.length / 2)]
            ? monthShort(
                history[Math.floor(history.length / 2)].year,
                history[Math.floor(history.length / 2)].month,
              )
            : '—'}
        </span>
        <span className="text-right">
          {history.at(-1)
            ? monthShort(history.at(-1)!.year, history.at(-1)!.month)
            : '—'}
        </span>
      </div>
    </article>
  );
}

function DistributionCard({
  accounts,
  currency,
  showValues,
}: {
  accounts: NetWorthAccount[];
  currency: SupportedCurrency;
  showValues: boolean;
}) {
  const totalAbsolute = accounts.reduce(
    (sum, account) => sum + Math.abs(account.balance),
    0,
  );

  return (
    <article className="rounded-[18px] border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5">
      <div>
        <h2 className="text-lg font-bold text-[var(--foreground)]">
          Distribuição por conta
        </h2>
        <p className="mt-1 text-xs text-[var(--text-muted)]">
          Correntes e investimentos, incluindo contas inativas no histórico.
        </p>
      </div>

      <div className="mt-4 divide-y divide-[var(--border)]">
        {accounts.map((account) => {
          const share =
            totalAbsolute === 0
              ? 0
              : Math.round((Math.abs(account.balance) / totalAbsolute) * 1000) /
                10;
          return (
            <Link
              key={account.id}
              href={`/contas/show/${account.id}`}
              className="grid min-h-[72px] grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-3 py-2.5"
            >
              <span
                className="grid h-11 w-11 place-items-center rounded-[11px] text-white"
                style={{ backgroundColor: account.color || '#64748B' }}
                aria-hidden="true"
              >
                <IconRenderer
                  iconName={
                    account.icon ||
                    (account.type === 'INVESTMENT' ? 'chart-line' : 'wallet')
                  }
                  size={18}
                />
              </span>

              <span className="min-w-0">
                <strong className="block truncate text-sm text-[var(--foreground)]">
                  {account.name}
                </strong>
                <span className="mt-1 block text-xs text-[var(--text-muted)]">
                  {account.type === 'INVESTMENT' ? 'Investimento' : 'Conta corrente'}
                  {!account.isActive ? ' · Inativa' : ''}
                </span>
              </span>

              <span className="text-right">
                <strong
                  className={
                    account.balance < 0
                      ? 'block text-sm text-[var(--expense)]'
                      : 'block text-sm text-[var(--foreground)]'
                  }
                >
                  {displayMoney(account.balance, showValues, currency)}
                </strong>
                <span className="mt-1 block text-xs text-[var(--text-muted)]">
                  {share.toLocaleString('pt-BR')}%
                </span>
              </span>
            </Link>
          );
        })}
      </div>

      <div className="mt-4 rounded-[12px] bg-[var(--surface-raised)] p-3 text-xs leading-relaxed text-[var(--text-muted)]">
        Transferências entre suas contas não alteram o total consolidado. Elas
        apenas redistribuem o patrimônio entre contas.
      </div>
    </article>
  );
}
