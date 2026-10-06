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
import { ModalShell } from '@/app/components/overlays/modal-shell';
import { IconRenderer } from '@/app/components/ui';
import { useAuth } from '@/app/context';
import { formatCurrency } from '@/app/lib/currency/format-currency';
import {
  formatIsoLogicalDate,
  logicalDateFromUtcInstant,
} from '@/app/lib/date/logical-date';
import { exchangeRateService } from '@/app/services/exchange-rate-service';
import { netWorthService } from '@/app/services/net-worth-service';
import type { ExchangeRateModel } from '@/app/types/exchange-rate';
import type { SupportedCurrency } from '@/app/types/financial-summary';
import type {
  NetWorthAccount,
  NetWorthData,
  NetWorthDebt,
  NetWorthRealReturnData,
  NetWorthValuationBasis,
  NetWorthValuationQuality,
} from '@/app/types/net-worth';

const currencies: SupportedCurrency[] = ['BRL', 'USD', 'EUR'];

function currentPeriod() {
  const today = logicalDateFromUtcInstant(new Date());
  return { year: today.year, month: today.month };
}

function displayMoney(amount: number, showValues: boolean, currency: string) {
  return showValues ? formatCurrency(amount, currency) : '••••';
}

function displayPercent(value: number | null, showValues: boolean) {
  if (!showValues) return '••••';
  if (value === null) return '—';

  const formatted = Math.abs(value).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${value > 0 ? '+' : value < 0 ? '-' : ''}${formatted}%`;
}

function currentIsoDate() {
  return formatIsoLogicalDate(logicalDateFromUtcInstant(new Date()));
}

function periodInputValue(period: { year: number; month: number }) {
  return `${period.year}-${String(period.month).padStart(2, '0')}`;
}

function parsePeriodInput(value: string) {
  const match = /^(\d{4})-(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (year < 2000 || year > 2100 || month < 1 || month > 12) return null;
  return { year, month };
}

function logicalDateLabel(date: { year: number; month: number; day: number }) {
  return `${String(date.day).padStart(2, '0')}/${String(date.month).padStart(2, '0')}/${date.year}`;
}

function valuationBasisLabel(basis: NetWorthValuationBasis) {
  if (basis === 'POSITION_MARKET') return 'posições a valor de mercado';
  if (basis === 'POSITION_COST') return 'posições a custo';
  if (basis === 'MIXED') return 'base mista';
  return 'saldo transacional';
}

function quoteDateTimeLabel(value: string | null) {
  if (!value) return null;
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'UTC',
  }).format(new Date(value));
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

  const [{ year, month }, setEndPeriod] = useState(currentPeriod);
  const [months, setMonths] = useState(12);
  const [data, setData] = useState<NetWorthData | null>(null);
  const [selectedCurrency, setSelectedCurrency] =
    useState<SupportedCurrency>('BRL');
  const [baseCurrency, setBaseCurrency] = useState<SupportedCurrency | ''>('');
  const [rates, setRates] = useState<ExchangeRateModel[]>([]);
  const [ratesLoading, setRatesLoading] = useState(true);
  const [ratesMoreLoading, setRatesMoreLoading] = useState(false);
  const [ratePage, setRatePage] = useState(1);
  const [rateHasMore, setRateHasMore] = useState(false);
  const [rateTotal, setRateTotal] = useState(0);
  const [rateFilterFrom, setRateFilterFrom] = useState<SupportedCurrency | ''>('');
  const [rateFilterTo, setRateFilterTo] = useState<SupportedCurrency | ''>('');
  const [rateError, setRateError] = useState('');
  const [rateSaving, setRateSaving] = useState(false);
  const [rateFetchingPtax, setRateFetchingPtax] = useState(false);
  const [rateFrom, setRateFrom] = useState<SupportedCurrency>('USD');
  const [rateTo, setRateTo] = useState<SupportedCurrency>('BRL');
  const [rateValue, setRateValue] = useState('');
  const [rateDate, setRateDate] = useState(currentIsoDate);
  const [coreNonce, setCoreNonce] = useState(0);
  const [ratesNonce, setRatesNonce] = useState(0);
  const [consolidationNonce, setConsolidationNonce] = useState(0);
  const [ratePendingDelete, setRatePendingDelete] =
    useState<ExchangeRateModel | null>(null);
  const [rateDeleteLoading, setRateDeleteLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    void netWorthService
      .get({
        year,
        month,
        months,
        includeRealEvolution: true,
      })
      .then((response) => {
        if (cancelled) return;
        setData(response.data);
        setError('');
        const firstAvailable = currencies.find((currency) =>
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
  }, [coreNonce, month, months, year]);

  useEffect(() => {
    let cancelled = false;

    if (!baseCurrency) {
      setData((current) =>
        current ? { ...current, consolidation: null } : current,
      );
      return () => {
        cancelled = true;
      };
    }

    void netWorthService
      .get({
        year,
        month,
        months: 1,
        baseCurrency,
      })
      .then((response) => {
        if (cancelled) return;
        setData((current) =>
          current
            ? { ...current, consolidation: response.data.consolidation }
            : response.data,
        );
      })
      .catch((requestError) => {
        if (!cancelled) {
          setRateError(
            requestError instanceof Error
              ? requestError.message
              : 'Não foi possível recalcular a consolidação cambial',
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, [baseCurrency, consolidationNonce, month, year]);

  useEffect(() => {
    let cancelled = false;
    setRatesLoading(true);

    void exchangeRateService
      .getAll({
        page: 1,
        limit: 10,
        ...(rateFilterFrom ? { from: rateFilterFrom } : {}),
        ...(rateFilterTo ? { to: rateFilterTo } : {}),
      })
      .then((response) => {
        if (cancelled) return;
        setRates(response.data.items);
        setRatePage(response.data.page);
        setRateHasMore(response.data.hasMore);
        setRateTotal(response.data.total);
        setRateError('');
      })
      .catch((requestError) => {
        if (!cancelled) {
          setRateError(
            requestError instanceof Error
              ? requestError.message
              : 'Não foi possível carregar as taxas de câmbio',
          );
        }
      })
      .finally(() => {
        if (!cancelled) setRatesLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [rateFilterFrom, rateFilterTo, ratesNonce]);

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
      setRatesNonce((current) => current + 1);
      setConsolidationNonce((current) => current + 1);
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

  async function handlePtaxFetch() {
    setRateError('');

    if (rateFrom === rateTo) {
      setRateError('Escolha moedas diferentes para a cotação PTAX.');
      return;
    }

    const [dateYear, dateMonth, dateDay] = rateDate.split('-').map(Number);
    if (!dateYear || !dateMonth || !dateDay) {
      setRateError('Informe uma data de referência válida.');
      return;
    }

    setRateFetchingPtax(true);
    try {
      await exchangeRateService.fetchPtax({
        from: rateFrom,
        to: rateTo,
        referenceDate: {
          year: dateYear,
          month: dateMonth,
          day: dateDay,
        },
      });
      setRatesNonce((current) => current + 1);
      setConsolidationNonce((current) => current + 1);
    } catch (requestError) {
      setRateError(
        requestError instanceof Error
          ? requestError.message
          : 'Não foi possível consultar a cotação PTAX',
      );
    } finally {
      setRateFetchingPtax(false);
    }
  }

  async function handleRateRemove() {
    if (!ratePendingDelete) return;

    setRateError('');
    setRateDeleteLoading(true);
    try {
      await exchangeRateService.remove(ratePendingDelete.id);
      setRatePendingDelete(null);
      setRatesNonce((current) => current + 1);
      setConsolidationNonce((current) => current + 1);
    } catch (requestError) {
      setRateError(
        requestError instanceof Error
          ? requestError.message
          : 'Não foi possível remover a taxa manual',
      );
    } finally {
      setRateDeleteLoading(false);
    }
  }

  async function loadMoreRates() {
    if (!rateHasMore || ratesMoreLoading) return;

    setRatesMoreLoading(true);
    try {
      const response = await exchangeRateService.getAll({
        page: ratePage + 1,
        limit: 10,
        ...(rateFilterFrom ? { from: rateFilterFrom } : {}),
        ...(rateFilterTo ? { to: rateFilterTo } : {}),
      });
      setRates((current) => [...current, ...response.data.items]);
      setRatePage(response.data.page);
      setRateHasMore(response.data.hasMore);
      setRateTotal(response.data.total);
    } catch (requestError) {
      setRateError(
        requestError instanceof Error
          ? requestError.message
          : 'Não foi possível carregar mais taxas de câmbio',
      );
    } finally {
      setRatesMoreLoading(false);
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

  const realEvolution = data?.realEvolution?.data ?? null;
  const selectedRealReturn = useMemo(
    () =>
      realEvolution?.byCurrency.find(
        (item) => item.currency === selectedCurrency,
      ) ?? null,
    [realEvolution, selectedCurrency],
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
              Ativos, passivos e patrimônio líquido por moeda, sem conversão cambial automática.
            </p>
          </div>

          <div className="grid w-full gap-3 sm:w-auto sm:grid-cols-2">
            <label className="block min-w-[170px]">
              <span className="ds-label mb-2 block">Mês de referência</span>
              <input
                type="month"
                value={periodInputValue({ year, month })}
                max={periodInputValue(currentPeriod())}
                onChange={(event) => {
                  const parsed = parsePeriodInput(event.target.value);
                  if (parsed) setEndPeriod(parsed);
                }}
                className="ds-control min-h-11 w-full px-3"
                aria-label="Mês final do patrimônio"
              />
            </label>
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
          </div>
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
                moreLoading={ratesMoreLoading}
                hasMore={rateHasMore}
                total={rateTotal}
                filterFrom={rateFilterFrom}
                filterTo={rateFilterTo}
                error={rateError}
                saving={rateSaving}
                fetchingPtax={rateFetchingPtax}
                from={rateFrom}
                to={rateTo}
                value={rateValue}
                referenceDate={rateDate}
                showValues={showValues}
                onFilterFromChange={setRateFilterFrom}
                onFilterToChange={setRateFilterTo}
                onFromChange={setRateFrom}
                onToChange={setRateTo}
                onValueChange={setRateValue}
                onReferenceDateChange={setRateDate}
                onSave={handleRateSave}
                onFetchPtax={handlePtaxFetch}
                onLoadMore={() => void loadMoreRates()}
                onRemove={setRatePendingDelete}
              />

              {selected && (
                <>
                <NetWorthHero
                  total={selected.total}
                  assetsTotal={selected.assetsTotal}
                  liabilitiesTotal={selected.liabilitiesTotal}
                  currency={selected.currency}
                  showValues={showValues}
                  accountCount={selected.accounts.length}
                  debtCount={selected.debts.length}
                  valuation={selected.valuation}
                />

                {data.realEvolution?.error && (
                  <article className="rounded-[18px] border border-[var(--warning)]/35 bg-[var(--warning-subtle)] p-4 sm:p-5">
                    <h2 className="font-bold text-[var(--foreground)]">
                      Evolução real indisponível
                    </h2>
                    <p className="mt-1 text-sm text-[var(--text-muted)]">
                      {data.realEvolution.error}
                    </p>
                    <button
                      type="button"
                      onClick={() => setCoreNonce((current) => current + 1)}
                      className="mt-3 min-h-11 rounded-full border border-[var(--border-strong)] px-4 text-sm font-bold"
                    >
                      Tentar novamente
                    </button>
                  </article>
                )}

                {realEvolution && selectedRealReturn && (
                  <RealReturnCard
                    data={selectedRealReturn}
                    summary={realEvolution}
                    showValues={showValues}
                  />
                )}

                <div className="grid gap-4 xl:grid-cols-[1.35fr_1fr]">
                  <HistoryCard
                    history={history}
                    currency={selected.currency}
                    showValues={showValues}
                    valuation={selected.valuation}
                    historyValuation={data.historyValuation}
                  />
                  <div className="space-y-4">
                    <DistributionCard
                      accounts={selected.accounts}
                      currency={selected.currency}
                      showValues={showValues}
                    />
                    <LiabilitiesCard
                      debts={selected.debts}
                      currency={selected.currency}
                      showValues={showValues}
                    />
                  </div>
                </div>
                </>
              )}
            </div>
          </>
        )}

        {ratePendingDelete && (
          <ModalShell
            title="Excluir taxa manual?"
            onClose={() => setRatePendingDelete(null)}
            closeDisabled={rateDeleteLoading}
          >
            <p className="text-sm leading-relaxed text-[var(--text-muted)]">
              A taxa {ratePendingDelete.from} → {ratePendingDelete.to} de{' '}
              {logicalDateLabel(ratePendingDelete.referenceDate)} será removida.
              Se ela estiver sustentando uma consolidação, o total convertido pode
              ficar incompleto.
            </p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setRatePendingDelete(null)}
                disabled={rateDeleteLoading}
                className="min-h-12 rounded-full border border-[var(--border-strong)] font-bold"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void handleRateRemove()}
                disabled={rateDeleteLoading}
                className="min-h-12 rounded-full bg-[var(--expense)] font-extrabold text-white disabled:opacity-50"
              >
                {rateDeleteLoading ? 'Excluindo…' : 'Excluir taxa'}
              </button>
            </div>
          </ModalShell>
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
  fetchingPtax,
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
  onFetchPtax,
  onRemove,
}: {
  rates: ExchangeRateModel[];
  loading: boolean;
  error: string;
  saving: boolean;
  fetchingPtax: boolean;
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
  onFetchPtax: () => void;
  onRemove: (id: string) => void;
}) {
  return (
    <article className="rounded-[18px] border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5">
      <div>
        <h2 className="text-lg font-bold text-[var(--foreground)]">
          Taxas de câmbio
        </h2>
        <p className="mt-1 text-xs text-[var(--text-muted)]">
          Use uma taxa manual ou consulte a PTAX oficial do Banco Central sob demanda. No Patrimônio, a consulta usa PTAX de venda; a data exibida é a referência efetivamente usada.
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

        <div className="flex gap-2 md:flex-col">
          <button
            type="submit"
            disabled={saving || fetchingPtax}
            className="min-h-11 flex-1 rounded-[10px] bg-[var(--orbit-primary)] px-4 text-sm font-bold text-white disabled:opacity-50"
          >
            {saving ? 'Salvando…' : 'Salvar manual'}
          </button>
          <button
            type="button"
            onClick={onFetchPtax}
            disabled={saving || fetchingPtax}
            className="min-h-11 flex-1 rounded-[10px] border border-[var(--border)] px-4 text-sm font-bold text-[var(--foreground)] disabled:opacity-50"
          >
            {fetchingPtax ? 'Consultando…' : 'Buscar PTAX'}
          </button>
        </div>
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
            aria-label="Carregando taxas de câmbio"
          />
        ) : rates.length === 0 ? (
          <p className="rounded-[12px] border border-dashed border-[var(--border)] p-4 text-sm text-[var(--text-muted)]">
            Nenhuma taxa de câmbio cadastrada.
          </p>
        ) : (
          <div className="divide-y divide-[var(--border)] rounded-[12px] border border-[var(--border)] px-3">
            {rates.map((rate) => (
              <div
                key={rate.id}
                className="grid min-h-[64px] grid-cols-[minmax(0,1fr)_44px] items-center gap-3 py-2"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <strong className="block text-sm text-[var(--foreground)]">
                      {rate.from} → {rate.to}
                    </strong>
                    {rate.source === 'BCB_PTAX' && (
                      <span className="rounded-full bg-[var(--surface-subtle)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--text-muted)]">
                        PTAX {rate.quoteSide === 'BUY' ? 'compra' : 'venda'}
                      </span>
                    )}
                  </div>
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
                {rate.source === 'MANUAL' ? (
                  <button
                    type="button"
                    onClick={() => onRemove(rate.id)}
                    aria-label={`Excluir taxa ${rate.from} para ${rate.to}`}
                    className="grid h-10 w-10 place-items-center rounded-[10px] border border-[var(--border)] text-[var(--expense)] hover:bg-[var(--danger-subtle)]"
                  >
                    <FaTrash aria-hidden="true" />
                  </button>
                ) : (
                  <span
                    className="text-center text-[10px] font-bold text-[var(--text-muted)]"
                    title="Banco Central do Brasil"
                  >
                    BCB
                  </span>
                )}
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
  assetsTotal,
  liabilitiesTotal,
  currency,
  showValues,
  accountCount,
  debtCount,
}: {
  total: number;
  assetsTotal: number;
  liabilitiesTotal: number;
  currency: SupportedCurrency;
  showValues: boolean;
  accountCount: number;
  debtCount: number;
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
          Patrimônio líquido em {currency}
        </div>
        <strong className="mt-3 block break-words text-[38px] font-extrabold leading-none tracking-tight sm:text-[44px]">
          {displayMoney(total, showValues, currency)}
        </strong>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="rounded-[14px] bg-white/10 p-3">
            <span className="text-xs font-semibold uppercase tracking-wide text-white/65">Ativos</span>
            <strong className="mt-1 block text-lg">{displayMoney(assetsTotal, showValues, currency)}</strong>
            <span className="mt-1 block text-xs text-white/60">
              {accountCount} {accountCount === 1 ? 'conta elegível' : 'contas elegíveis'}
            </span>
          </div>
          <div className="rounded-[14px] bg-white/10 p-3">
            <span className="text-xs font-semibold uppercase tracking-wide text-white/65">Passivos</span>
            <strong className="mt-1 block text-lg">{displayMoney(liabilitiesTotal, showValues, currency)}</strong>
            <span className="mt-1 block text-xs text-white/60">
              {debtCount} {debtCount === 1 ? 'dívida ativa' : 'dívidas ativas'}
            </span>
          </div>
        </div>
      </div>
    </article>
  );
}

function RealReturnCard({
  data,
  summary,
  showValues,
}: {
  data: NetWorthRealReturnData['byCurrency'][number];
  summary: NetWorthRealReturnData;
  showValues: boolean;
}) {
  const statusMessage =
    data.status === 'BASELINE_NOT_POSITIVE'
      ? 'A variação percentual exige patrimônio inicial positivo.'
      : data.status === 'INFLATION_INCOMPLETE'
        ? `IPCA disponível em ${summary.inflation.availableMonths} de ${summary.inflation.expectedMonths} meses. O retorno real só aparece quando o período estiver completo.`
        : null;

  return (
    <article className="rounded-[18px] border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-[var(--foreground)]">
            Variação real
          </h2>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            {monthShort(summary.period.start.year, summary.period.start.month)} →{' '}
            {monthShort(summary.period.end.year, summary.period.end.month)} ·{' '}
            {summary.period.months} meses · {data.currency}, sem conversão cambial.
          </p>
        </div>
        <span className="rounded-full bg-[var(--surface-raised)] px-3 py-1 text-xs font-semibold text-[var(--text-muted)]">
          IPCA · SGS {summary.inflation.seriesCode}
        </span>
      </div>

      <dl className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <div className="rounded-[14px] bg-[var(--surface-raised)] p-3">
          <dt className="text-xs text-[var(--text-muted)]">Patrimônio inicial</dt>
          <dd className="mt-1 font-bold text-[var(--foreground)]">
            {displayMoney(data.initial, showValues, data.currency)}
          </dd>
        </div>
        <div className="rounded-[14px] bg-[var(--surface-raised)] p-3">
          <dt className="text-xs text-[var(--text-muted)]">Patrimônio atual</dt>
          <dd className="mt-1 font-bold text-[var(--foreground)]">
            {displayMoney(data.current, showValues, data.currency)}
          </dd>
        </div>
        <div className="rounded-[14px] bg-[var(--surface-raised)] p-3">
          <dt className="text-xs text-[var(--text-muted)]">Variação nominal</dt>
          <dd className="mt-1 font-bold text-[var(--foreground)]">
            {displayPercent(data.nominalPercentage, showValues)}
          </dd>
        </div>
        <div className="rounded-[14px] bg-[var(--surface-raised)] p-3">
          <dt className="text-xs text-[var(--text-muted)]">IPCA do período</dt>
          <dd className="mt-1 font-bold text-[var(--foreground)]">
            {displayPercent(summary.inflation.percentage, showValues)}
          </dd>
        </div>
        <div className="rounded-[14px] bg-[var(--surface-raised)] p-3">
          <dt className="text-xs text-[var(--text-muted)]">Variação real</dt>
          <dd className="mt-1 font-bold text-[var(--foreground)]">
            {displayPercent(data.realPercentage, showValues)}
          </dd>
        </div>
      </dl>

      {statusMessage && (
        <p className="mt-3 rounded-[12px] bg-[var(--surface-raised)] p-3 text-xs text-[var(--text-muted)]">
          {statusMessage}
        </p>
      )}

      <div className="mt-3 space-y-1 text-[11px] leading-relaxed text-[var(--text-muted)]">
        <p>
          Base patrimonial: saldos realizados em contas elegíveis menos dívidas registradas.
          Posições de investimentos não são somadas separadamente ao patrimônio.
        </p>
        <p>
          Fonte: {summary.inflation.sourceLabel} · série {summary.inflation.seriesCode}.
          Fórmula: {summary.formula}. {summary.rounding}.
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
            Fechamento de cada mês: ativos realizados menos passivos registrados.
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

      {accounts.length === 0 ? (
        <p className="mt-4 rounded-[12px] bg-[var(--surface-raised)] p-3 text-sm text-[var(--text-muted)]">
          Nenhum ativo registrado nesta moeda.
        </p>
      ) : (
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
                  {account.type === 'INVESTMENT'
                    ? account.valuationSource === 'MARKET'
                      ? 'Investimento · valor de mercado'
                      : account.valuationSource === 'MIXED'
                        ? 'Investimento · mercado + custo'
                        : account.valuationSource === 'COST'
                          ? 'Investimento · custo investido'
                          : 'Investimento'
                    : 'Conta corrente'}
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
      )}

      <div className="mt-4 rounded-[12px] bg-[var(--surface-raised)] p-3 text-xs leading-relaxed text-[var(--text-muted)]">
        Transferências entre suas contas não alteram o total consolidado. Para
        contas de investimento com posições, o patrimônio usa o valor das
        posições no lugar do saldo transacional, evitando dupla contagem.
      </div>
    </article>
  );
}


function LiabilitiesCard({
  debts,
  currency,
  showValues,
}: {
  debts: NetWorthDebt[];
  currency: SupportedCurrency;
  showValues: boolean;
}) {
  return (
    <article className="rounded-[18px] border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-[var(--foreground)]">Passivos</h2>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Dívidas com saldo devedor nesta moeda.
          </p>
        </div>
        <Link href="/dividas" className="text-xs font-bold text-[var(--orbit-primary)]">
          Gerenciar
        </Link>
      </div>

      {debts.length === 0 ? (
        <p className="mt-4 rounded-[12px] bg-[var(--surface-raised)] p-3 text-sm text-[var(--text-muted)]">
          Nenhum passivo com saldo devedor.
        </p>
      ) : (
        <div className="mt-4 divide-y divide-[var(--border)]">
          {debts.map((debt) => (
            <Link
              key={debt.id}
              href="/dividas"
              className="flex min-h-[64px] items-center justify-between gap-4 py-2.5"
            >
              <span className="min-w-0">
                <strong className="block truncate text-sm text-[var(--foreground)]">{debt.name}</strong>
                <span className="mt-1 block truncate text-xs text-[var(--text-muted)]">
                  {debt.institution || 'Passivo manual'}
                </span>
              </span>
              <strong className="shrink-0 text-sm text-[var(--expense)]">
                {displayMoney(debt.balance, showValues, currency)}
              </strong>
            </Link>
          ))}
        </div>
      )}
    </article>
  );
}
