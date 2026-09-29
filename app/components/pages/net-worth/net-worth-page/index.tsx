'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  FaChartLine,
  FaChevronRight,
  FaEye,
  FaExchangeAlt,
  FaTrash,
} from 'react-icons/fa';

import { PageEmpty, PageLoading } from '@/app/components/feedback';
import { ProtectedRoute } from '@/app/components/layout';
import { IconRenderer } from '@/app/components/ui';
import { useAuth } from '@/app/context';
import { formatCurrency } from '@/app/lib/currency/format-currency';
import { exchangeRateService } from '@/app/services/exchange-rate-service';
import { netWorthService } from '@/app/services/net-worth-service';
import type { ExchangeRateModel } from '@/app/types/exchange-rate';
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

function currentIsoDate() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

function logicalDateLabel(date: { year: number; month: number; day: number }) {
  return `${String(date.day).padStart(2, '0')}/${String(date.month).padStart(2, '0')}/${date.year}`;
}

function rateRatioLabel(rate: { numerator: number; denominator: number }) {
  return (rate.numerator / rate.denominator).toLocaleString('pt-BR', {
    maximumFractionDigits: 6,
  });
}

function decimalRateToRatio(value: string) {
  const normalized = value.trim().replace(',', '.');
  if (!/^\d+(?:\.\d{1,6})?$/.test(normalized)) return null;

  const [integerPart, fractionPart = ''] = normalized.split('.');
  const denominator = 10 ** fractionPart.length;
  const numerator = Number(`${integerPart}${fractionPart}`);

  if (!Number.isSafeInteger(numerator) || numerator <= 0) return null;

  const gcd = (left: number, right: number): number =>
    right === 0 ? left : gcd(right, left % right);
  const divisor = gcd(numerator, denominator);

  return {
    numerator: numerator / divisor,
    denominator: denominator / divisor,
  };
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
  const [baseCurrency, setBaseCurrency] = useState<SupportedCurrency | ''>('');
  const [rates, setRates] = useState<ExchangeRateModel[]>([]);
  const [ratesLoading, setRatesLoading] = useState(true);
  const [rateError, setRateError] = useState('');
  const [rateSaving, setRateSaving] = useState(false);
  const [rateFrom, setRateFrom] = useState<SupportedCurrency>('USD');
  const [rateTo, setRateTo] = useState<SupportedCurrency>('BRL');
  const [rateValue, setRateValue] = useState('');
  const [rateDate, setRateDate] = useState(currentIsoDate);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    void netWorthService
      .get({
        year,
        month,
        months,
        ...(baseCurrency ? { baseCurrency } : {}),
      })
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
  }, [baseCurrency, month, months, refreshNonce, year]);

  useEffect(() => {
    let cancelled = false;

    void exchangeRateService
      .getAll()
      .then((response) => {
        if (!cancelled) {
          setRates(response.data.items);
          setRateError('');
        }
      })
      .catch((requestError) => {
        if (!cancelled) {
          setRateError(
            requestError instanceof Error
              ? requestError.message
              : 'Não foi possível carregar as taxas manuais',
          );
        }
      })
      .finally(() => {
        if (!cancelled) setRatesLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [refreshNonce]);

  async function handleRateSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setRateError('');

    if (rateFrom === rateTo) {
      setRateError('Escolha moedas diferentes para a taxa.');
      return;
    }

    const ratio = decimalRateToRatio(rateValue);
    if (!ratio) {
      setRateError('Informe uma taxa positiva com até 6 casas decimais.');
      return;
    }

    const [dateYear, dateMonth, dateDay] = rateDate.split('-').map(Number);
    if (!dateYear || !dateMonth || !dateDay) {
      setRateError('Informe uma data de referência válida.');
      return;
    }

    setRateSaving(true);
    try {
      await exchangeRateService.save({
        from: rateFrom,
        to: rateTo,
        ...ratio,
        referenceDate: {
          year: dateYear,
          month: dateMonth,
          day: dateDay,
        },
      });
      setRateValue('');
      setRefreshNonce((current) => current + 1);
    } catch (requestError) {
      setRateError(
        requestError instanceof Error
          ? requestError.message
          : 'Não foi possível salvar a taxa manual',
      );
    } finally {
      setRateSaving(false);
    }
  }

  async function handleRateRemove(id: string) {
    setRateError('');
    try {
      await exchangeRateService.remove(id);
      setRefreshNonce((current) => current + 1);
    } catch (requestError) {
      setRateError(
        requestError instanceof Error
          ? requestError.message
          : 'Não foi possível remover a taxa manual',
      );
    }
  }

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

            <div className="mt-5 space-y-4">
              <ConsolidationCard
                consolidation={data.consolidation}
                baseCurrency={baseCurrency}
                onBaseCurrencyChange={setBaseCurrency}
                showValues={showValues}
              />

              <ExchangeRatesCard
                rates={rates}
                loading={ratesLoading}
                error={rateError}
                saving={rateSaving}
                from={rateFrom}
                to={rateTo}
                value={rateValue}
                referenceDate={rateDate}
                showValues={showValues}
                onFromChange={setRateFrom}
                onToChange={setRateTo}
                onValueChange={setRateValue}
                onReferenceDateChange={setRateDate}
                onSave={handleRateSave}
                onRemove={handleRateRemove}
              />

              {selected && (
                <>
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
                </>
              )}
            </div>
          </>
        )}
      </section>
    </ProtectedRoute>
  );
}

function ConsolidationCard({
  consolidation,
  baseCurrency,
  onBaseCurrencyChange,
  showValues,
}: {
  consolidation: NetWorthData['consolidation'];
  baseCurrency: SupportedCurrency | '';
  onBaseCurrencyChange: (currency: SupportedCurrency | '') => void;
  showValues: boolean;
}) {
  return (
    <article className="rounded-[18px] border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <FaExchangeAlt className="text-[var(--orbit-primary)]" aria-hidden="true" />
            <h2 className="text-lg font-bold text-[var(--foreground)]">
              Consolidação opcional
            </h2>
          </div>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Por padrão, o patrimônio continua separado por moeda. A conversão só acontece quando você escolhe uma moeda base.
          </p>
        </div>

        <label className="block min-w-[210px]">
          <span className="ds-label mb-2 block">Consolidar patrimônio em</span>
          <select
            value={baseCurrency}
            onChange={(event) =>
              onBaseCurrencyChange(event.target.value as SupportedCurrency | '')
            }
            className="ds-control min-h-11 w-full px-3"
            aria-label="Consolidar patrimônio em"
          >
            <option value="">Sem consolidação</option>
            {currencies.map((currency) => (
              <option key={currency} value={currency}>
                {currency}
              </option>
            ))}
          </select>
        </label>
      </div>

      {!baseCurrency ? (
        <div className="mt-4 rounded-[12px] bg-[var(--surface-raised)] p-3 text-sm text-[var(--text-muted)]">
          Nenhuma moeda está sendo convertida. Os totais nominais abaixo permanecem a fonte original.
        </div>
      ) : consolidation ? (
        <div className="mt-4 space-y-3">
          <div
            className={`rounded-[14px] border p-4 ${
              consolidation.complete
                ? 'border-[var(--income)]/30 bg-[var(--primary-subtle)]'
                : 'border-[var(--expense)]/30 bg-[var(--danger-subtle)]'
            }`}
          >
            <span className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
              {consolidation.complete ? 'Patrimônio convertido' : 'Consolidação incompleta'}
            </span>
            <strong className="mt-1 block text-2xl font-extrabold text-[var(--foreground)]">
              {consolidation.total === null
                ? '—'
                : displayMoney(
                    consolidation.total,
                    showValues,
                    consolidation.baseCurrency,
                  )}
            </strong>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              Base {consolidation.baseCurrency} · referência {logicalDateLabel(consolidation.referenceDate)}
            </p>
          </div>

          {consolidation.missingRates.length > 0 && (
            <div className="rounded-[12px] border border-[var(--expense)]/25 p-3">
              <strong className="text-sm text-[var(--expense)]">
                Faltam taxas para concluir a conversão:
              </strong>
              <p className="mt-1 text-sm text-[var(--text-muted)]">
                {consolidation.missingRates
                  .map((item) => `${item.from} → ${item.to}`)
                  .join(', ')}
              </p>
            </div>
          )}

          <div className="divide-y divide-[var(--border)] rounded-[12px] border border-[var(--border)] px-3">
            {consolidation.convertedItems.map((item) => (
              <div
                key={item.original.currency}
                className="grid gap-1 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
              >
                <div>
                  <strong className="text-sm text-[var(--foreground)]">
                    {item.original.currency} → {item.converted.currency}
                  </strong>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">
                    {item.rate
                      ? showValues
                        ? `1 ${item.rate.from} = ${rateRatioLabel(item.rate)} ${item.rate.to} · ${item.rate.source} · ${logicalDateLabel(item.rate.referenceDate)}`
                        : `Taxa •••• · ${item.rate.source} · ${logicalDateLabel(item.rate.referenceDate)}`
                      : 'Mesma moeda, sem conversão'}
                  </p>
                </div>
                <span className="text-sm font-bold text-[var(--foreground)]">
                  {displayMoney(
                    item.original.amount,
                    showValues,
                    item.original.currency,
                  )}
                  {' → '}
                  {displayMoney(
                    item.converted.amount,
                    showValues,
                    item.converted.currency,
                  )}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </article>
  );
}

function ExchangeRatesCard({
  rates,
  loading,
  error,
  saving,
  from,
  to,
  value,
  referenceDate,
  showValues,
  onFromChange,
  onToChange,
  onValueChange,
  onReferenceDateChange,
  onSave,
  onRemove,
}: {
  rates: ExchangeRateModel[];
  loading: boolean;
  error: string;
  saving: boolean;
  from: SupportedCurrency;
  to: SupportedCurrency;
  value: string;
  referenceDate: string;
  showValues: boolean;
  onFromChange: (currency: SupportedCurrency) => void;
  onToChange: (currency: SupportedCurrency) => void;
  onValueChange: (value: string) => void;
  onReferenceDateChange: (value: string) => void;
  onSave: (event: FormEvent<HTMLFormElement>) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <article className="rounded-[18px] border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5">
      <div>
        <h2 className="text-lg font-bold text-[var(--foreground)]">
          Taxas manuais
        </h2>
        <p className="mt-1 text-xs text-[var(--text-muted)]">
          Cadastre apenas as taxas que você deseja usar. Nenhuma cotação externa ou inversão automática é aplicada.
        </p>
      </div>

      <form
        onSubmit={onSave}
        className="mt-4 grid gap-3 rounded-[14px] bg-[var(--surface-raised)] p-3 md:grid-cols-[120px_120px_minmax(150px,1fr)_170px_auto] md:items-end"
      >
        <label>
          <span className="ds-label mb-2 block">De</span>
          <select
            value={from}
            onChange={(event) => onFromChange(event.target.value as SupportedCurrency)}
            className="ds-control min-h-11 w-full px-3"
            aria-label="Moeda de origem da taxa"
          >
            {currencies.map((currency) => (
              <option key={currency} value={currency}>{currency}</option>
            ))}
          </select>
        </label>

        <label>
          <span className="ds-label mb-2 block">Para</span>
          <select
            value={to}
            onChange={(event) => onToChange(event.target.value as SupportedCurrency)}
            className="ds-control min-h-11 w-full px-3"
            aria-label="Moeda de destino da taxa"
          >
            {currencies.map((currency) => (
              <option key={currency} value={currency}>{currency}</option>
            ))}
          </select>
        </label>

        <label>
          <span className="ds-label mb-2 block">Taxa para 1 {from}</span>
          <input
            value={value}
            onChange={(event) => onValueChange(event.target.value)}
            inputMode="decimal"
            placeholder={`Ex.: 5,32 ${to}`}
            className="ds-control min-h-11 w-full px-3"
            aria-label="Valor da taxa manual"
          />
        </label>

        <label>
          <span className="ds-label mb-2 block">Data de referência</span>
          <input
            type="date"
            value={referenceDate}
            onChange={(event) => onReferenceDateChange(event.target.value)}
            min="2000-01-01"
            max="2100-12-31"
            className="ds-control min-h-11 w-full px-3"
            aria-label="Data de referência da taxa"
          />
        </label>

        <button
          type="submit"
          disabled={saving}
          className="min-h-11 rounded-[10px] bg-[var(--orbit-primary)] px-4 text-sm font-bold text-white disabled:opacity-50"
        >
          {saving ? 'Salvando…' : 'Salvar taxa'}
        </button>
      </form>

      {error && (
        <p
          role="alert"
          className="mt-3 rounded-[12px] border border-[var(--expense)]/30 bg-[var(--danger-subtle)] p-3 text-sm text-[var(--expense)]"
        >
          {error}
        </p>
      )}

      <div className="mt-4">
        {loading ? (
          <div
            className="h-20 animate-pulse rounded-[12px] bg-[var(--skeleton)]"
            role="status"
            aria-label="Carregando taxas manuais"
          />
        ) : rates.length === 0 ? (
          <p className="rounded-[12px] border border-dashed border-[var(--border)] p-4 text-sm text-[var(--text-muted)]">
            Nenhuma taxa manual cadastrada.
          </p>
        ) : (
          <div className="divide-y divide-[var(--border)] rounded-[12px] border border-[var(--border)] px-3">
            {rates.map((rate) => (
              <div
                key={rate.id}
                className="grid min-h-[64px] grid-cols-[minmax(0,1fr)_44px] items-center gap-3 py-2"
              >
                <div className="min-w-0">
                  <strong className="block text-sm text-[var(--foreground)]">
                    {rate.from} → {rate.to}
                  </strong>
                  <span className="mt-1 block text-xs text-[var(--text-muted)]">
                    {showValues
                      ? `1 ${rate.from} = ${rateRatioLabel(rate)} ${rate.to}`
                      : `1 ${rate.from} = •••• ${rate.to}`}
                    {' · '}
                    {logicalDateLabel(rate.referenceDate)}
                    {' · '}
                    {rate.source}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => onRemove(rate.id)}
                  aria-label={`Excluir taxa ${rate.from} para ${rate.to}`}
                  className="grid h-10 w-10 place-items-center rounded-[10px] border border-[var(--border)] text-[var(--expense)] hover:bg-[var(--danger-subtle)]"
                >
                  <FaTrash aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </article>
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
