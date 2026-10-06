'use client';

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  usePathname,
  useRouter,
  useSearchParams,
} from 'next/navigation';

import { useAuth } from '@/app/context';
import { formatCurrency } from '@/app/lib/currency/format-currency';
import { logicalDateFromUtcInstant } from '@/app/lib/date/logical-date';
import {
  enumerateComparisonMonths,
  isComparisonRangeInFuture,
  parseComparisonMonth,
} from '@/app/lib/financial-comparison/financial-comparison-domain';
import { financialComparisonService } from '@/app/services/financial-comparison-service';
import type {
  ComparisonMonth,
  ComparisonRange,
  FinancialComparisonData,
  FinancialComparisonMetric,
} from '@/app/types/financial-comparison';
import type { SupportedCurrency } from '@/app/types/financial-summary';

type ComparisonFilters = {
  aFrom: string;
  aTo: string;
  bFrom: string;
  bTo: string;
  currency: SupportedCurrency;
};

type SearchParamsLike = {
  get(name: string): string | null;
};

const SUPPORTED_CURRENCIES = new Set<SupportedCurrency>([
  'BRL',
  'USD',
  'EUR',
]);

function monthValue(period: ComparisonMonth) {
  return `${period.year}-${String(period.month).padStart(2, '0')}`;
}

function shiftMonth(period: ComparisonMonth, offset: number): ComparisonMonth {
  const absolute = period.year * 12 + period.month - 1 + offset;
  return {
    year: Math.floor(absolute / 12),
    month: ((absolute % 12) + 12) % 12 + 1,
  };
}

function formatMonth(period: ComparisonMonth) {
  return new Intl.DateTimeFormat('pt-BR', {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(period.year, period.month - 1, 1)));
}

function formatRange(range: ComparisonRange) {
  if (
    range.from.year === range.to.year &&
    range.from.month === range.to.month
  ) {
    return formatMonth(range.from);
  }
  return `${formatMonth(range.from)} – ${formatMonth(range.to)}`;
}

function formatLogicalDate(date: { year: number; month: number; day: number }) {
  return [
    String(date.day).padStart(2, '0'),
    String(date.month).padStart(2, '0'),
    date.year,
  ].join('/');
}

function displayMoney(
  value: number,
  currency: SupportedCurrency,
  showValues: boolean,
) {
  return showValues ? formatCurrency(value, currency) : '••••';
}

function metricTrend(metric: FinancialComparisonMetric) {
  if (metric.difference > 0) return 'Aumentou';
  if (metric.difference < 0) return 'Reduziu';
  return 'Sem mudança';
}

function metricPercentage(metric: FinancialComparisonMetric) {
  if (metric.percentage === null) return 'Sem base percentual';
  return `${metric.percentage > 0 ? '+' : ''}${metric.percentage}%`;
}

function defaultFilters(current: ComparisonMonth): ComparisonFilters {
  return {
    aFrom: monthValue({ year: current.year - 1, month: 1 }),
    aTo: monthValue({ year: current.year - 1, month: current.month }),
    bFrom: monthValue({ year: current.year, month: 1 }),
    bTo: monthValue(current),
    currency: 'BRL',
  };
}

function rangeFromValues(fromValue: string, toValue: string) {
  const from = parseComparisonMonth(fromValue);
  const to = parseComparisonMonth(toValue);
  return from && to ? { from, to } : null;
}

function validateRangeValues(
  fromValue: string,
  toValue: string,
  currentMonth: ComparisonMonth,
) {
  const range = rangeFromValues(fromValue, toValue);
  if (!range) return 'Período inválido';

  try {
    enumerateComparisonMonths(range);
  } catch (cause) {
    return cause instanceof Error
      ? cause.message
      : 'Período de comparação inválido';
  }

  if (isComparisonRangeInFuture(range, currentMonth)) {
    return 'Períodos futuros não podem ser comparados como realizado';
  }

  return null;
}

function filtersFromSearch(
  params: SearchParamsLike,
  defaults: ComparisonFilters,
  currentMonth: ComparisonMonth,
): ComparisonFilters {
  const candidate: ComparisonFilters = {
    aFrom: params.get('aFrom') ?? defaults.aFrom,
    aTo: params.get('aTo') ?? defaults.aTo,
    bFrom: params.get('bFrom') ?? defaults.bFrom,
    bTo: params.get('bTo') ?? defaults.bTo,
    currency: SUPPORTED_CURRENCIES.has(
      params.get('currency') as SupportedCurrency,
    )
      ? (params.get('currency') as SupportedCurrency)
      : defaults.currency,
  };

  if (
    validateRangeValues(
      candidate.aFrom,
      candidate.aTo,
      currentMonth,
    ) ||
    validateRangeValues(
      candidate.bFrom,
      candidate.bTo,
      currentMonth,
    )
  ) {
    return defaults;
  }

  return candidate;
}

function serializeFilters(filters: ComparisonFilters) {
  const params = new URLSearchParams();
  params.set('aFrom', filters.aFrom);
  params.set('aTo', filters.aTo);
  params.set('bFrom', filters.bFrom);
  params.set('bTo', filters.bTo);
  params.set('currency', filters.currency);
  return params.toString();
}

function MetricDifference({
  metric,
  currency,
  showValues,
}: {
  metric: FinancialComparisonMetric;
  currency: SupportedCurrency;
  showValues: boolean;
}) {
  return (
    <div>
      <strong className="block">
        {displayMoney(metric.difference, currency, showValues)}
      </strong>
      <small className="text-[var(--text-muted)]">
        {metricTrend(metric)} · {metricPercentage(metric)}
      </small>
    </div>
  );
}

export default function FinancialComparisonPage() {
  const { user } = useAuth();
  const showValues = user?.showValues !== false;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchKey = searchParams.toString();

  const currentMonth = useMemo(() => {
    const now = logicalDateFromUtcInstant(new Date());
    return { year: now.year, month: now.month };
  }, []);
  const defaults = useMemo(
    () => defaultFilters(currentMonth),
    [currentMonth],
  );
  const initialFilters = useMemo(
    () => filtersFromSearch(searchParams, defaults, currentMonth),
    [searchParams, defaults, currentMonth],
  );

  const [filters, setFilters] =
    useState<ComparisonFilters>(initialFilters);
  const [result, setResult] = useState<{
    key: string;
    data: FinancialComparisonData;
  } | null>(null);
  const [failure, setFailure] = useState<{
    key: string;
    message: string;
  } | null>(null);
  const [retryNonce, setRetryNonce] = useState(0);

  const didMountUrlSync = useRef(false);
  const applyingHistoryRef = useRef(false);

  const queryKey = useMemo(
    () => serializeFilters(filters),
    [filters],
  );
  const validationError = useMemo(
    () =>
      validateRangeValues(
        filters.aFrom,
        filters.aTo,
        currentMonth,
      ) ??
      validateRangeValues(
        filters.bFrom,
        filters.bTo,
        currentMonth,
      ),
    [filters, currentMonth],
  );

  useEffect(() => {
    const params = new URLSearchParams(searchKey);
    const next = filtersFromSearch(
      params,
      defaults,
      currentMonth,
    );

    setFilters((current) => {
      if (serializeFilters(next) === serializeFilters(current)) {
        return current;
      }

      applyingHistoryRef.current = true;
      return next;
    });
  }, [searchKey, defaults, currentMonth]);

  useEffect(() => {
    if (!didMountUrlSync.current) {
      didMountUrlSync.current = true;
      return;
    }

    if (applyingHistoryRef.current) {
      applyingHistoryRef.current = false;
      return;
    }

    if (queryKey === searchKey) return;
    router.push(`${pathname}?${queryKey}`, { scroll: false });
  }, [queryKey, searchKey, pathname, router]);

  useEffect(() => {
    if (validationError) return;

    let active = true;
    const activeQuery = queryKey;

    financialComparisonService
      .get({
        aFrom: filters.aFrom,
        aTo: filters.aTo,
        bFrom: filters.bFrom,
        bTo: filters.bTo,
        currency: filters.currency,
      })
      .then((response) => {
        if (!active) return;
        setResult({ key: activeQuery, data: response.data });
        setFailure(null);
      })
      .catch((cause) => {
        if (!active) return;
        setFailure({
          key: activeQuery,
          message:
            cause instanceof Error
              ? cause.message
              : 'Erro ao comparar períodos',
        });
      });

    return () => {
      active = false;
    };
  }, [filters, queryKey, retryNonce, validationError]);

  const data =
    result?.key === queryKey ? result.data : null;
  const currentError =
    validationError ??
    (failure?.key === queryKey ? failure.message : null);
  const hasCurrentData = data !== null;
  const hasCurrentError = currentError !== null;
  const showLoading = !hasCurrentData && !hasCurrentError;

  const totalRows = hasCurrentData
    ? [
        {
          label: 'Receitas',
          a: data.a.income,
          b: data.b.income,
          metric: data.difference.income,
        },
        {
          label: 'Despesas',
          a: data.a.expense,
          b: data.b.expense,
          metric: data.difference.expense,
        },
        {
          label: 'Resultado financeiro',
          a: data.a.balance,
          b: data.b.balance,
          metric: data.difference.balance,
        },
      ]
    : [];
  const averageRows = hasCurrentData
    ? [
        {
          label: 'Receita média mensal',
          a: data.a.averageMonthlyIncome,
          b: data.b.averageMonthlyIncome,
          metric: data.difference.averageMonthlyIncome,
        },
        {
          label: 'Despesa média mensal',
          a: data.a.averageMonthlyExpense,
          b: data.b.averageMonthlyExpense,
          metric: data.difference.averageMonthlyExpense,
        },
        {
          label: 'Resultado médio mensal',
          a: data.a.averageMonthlyBalance,
          b: data.b.averageMonthlyBalance,
          metric: data.difference.averageMonthlyBalance,
        },
      ]
    : [];

  function updateFilter<K extends keyof ComparisonFilters>(
    key: K,
    value: ComparisonFilters[K],
  ) {
    setFilters((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function applyPreset(
    preset: 'previous' | 'year-over-year' | 'ytd' | 'closed-year',
  ) {
    const previous = shiftMonth(currentMonth, -1);

    setFilters((current) => {
      if (preset === 'previous') {
        return {
          ...current,
          aFrom: monthValue(previous),
          aTo: monthValue(previous),
          bFrom: monthValue(currentMonth),
          bTo: monthValue(currentMonth),
        };
      }

      if (preset === 'year-over-year') {
        const previousYear = {
          year: currentMonth.year - 1,
          month: currentMonth.month,
        };
        return {
          ...current,
          aFrom: monthValue(previousYear),
          aTo: monthValue(previousYear),
          bFrom: monthValue(currentMonth),
          bTo: monthValue(currentMonth),
        };
      }

      if (preset === 'ytd') {
        return {
          ...current,
          aFrom: monthValue({
            year: currentMonth.year - 1,
            month: 1,
          }),
          aTo: monthValue({
            year: currentMonth.year - 1,
            month: currentMonth.month,
          }),
          bFrom: monthValue({
            year: currentMonth.year,
            month: 1,
          }),
          bTo: monthValue(currentMonth),
        };
      }

      return {
        ...current,
        aFrom: monthValue({
          year: currentMonth.year - 2,
          month: 1,
        }),
        aTo: monthValue({
          year: currentMonth.year - 2,
          month: 12,
        }),
        bFrom: monthValue({
          year: currentMonth.year - 1,
          month: 1,
        }),
        bTo: monthValue({
          year: currentMonth.year - 1,
          month: 12,
        }),
      };
    });
  }

  function swapPeriods() {
    setFilters((current) => ({
      ...current,
      aFrom: current.bFrom,
      aTo: current.bTo,
      bFrom: current.aFrom,
      bTo: current.aTo,
    }));
  }

  const maxMonth = monthValue(currentMonth);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-5 sm:px-6 lg:px-8">
      <header className="border-b border-[var(--border)] pb-5">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--orbit-primary)]">
          Análise
        </p>
        <h1 className="mt-1 text-2xl font-black text-[var(--foreground)] sm:text-3xl">
          Comparar períodos
        </h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Compare realizado financeiro entre dois intervalos de até 24
          meses na mesma moeda.
        </p>
      </header>

      <section
        aria-label="Atalhos de comparação"
        className="mt-5 flex flex-wrap gap-2"
      >
        <button
          type="button"
          onClick={() => applyPreset('previous')}
          className="min-h-11 rounded-xl border border-[var(--border)] px-3 text-sm font-semibold"
        >
          Mês anterior × atual
        </button>
        <button
          type="button"
          onClick={() => applyPreset('year-over-year')}
          className="min-h-11 rounded-xl border border-[var(--border)] px-3 text-sm font-semibold"
        >
          Mesmo mês ano anterior
        </button>
        <button
          type="button"
          onClick={() => applyPreset('ytd')}
          className="min-h-11 rounded-xl border border-[var(--border)] px-3 text-sm font-semibold"
        >
          YTD × YTD anterior
        </button>
        <button
          type="button"
          onClick={() => applyPreset('closed-year')}
          className="min-h-11 rounded-xl border border-[var(--border)] px-3 text-sm font-semibold"
        >
          Anos fechados
        </button>
      </section>

      <section className="mt-3 grid gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 lg:grid-cols-[1fr_auto_1fr_auto]">
        <fieldset className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <legend className="mb-2 text-sm font-bold">
            Período A · baseline
          </legend>
          <input
            aria-label="Início período A"
            type="month"
            max={maxMonth}
            value={filters.aFrom}
            onChange={(event) =>
              updateFilter('aFrom', event.target.value)
            }
            className="ds-control min-h-11 bg-[var(--surface)] px-3"
          />
          <input
            aria-label="Fim período A"
            type="month"
            max={maxMonth}
            value={filters.aTo}
            onChange={(event) =>
              updateFilter('aTo', event.target.value)
            }
            className="ds-control min-h-11 bg-[var(--surface)] px-3"
          />
        </fieldset>

        <div className="flex items-end">
          <button
            type="button"
            onClick={swapPeriods}
            className="min-h-11 rounded-xl border border-[var(--border)] px-3 text-sm font-semibold"
            aria-label="Inverter períodos A e B"
          >
            Inverter A ↔ B
          </button>
        </div>

        <fieldset className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <legend className="mb-2 text-sm font-bold">
            Período B · comparação
          </legend>
          <input
            aria-label="Início período B"
            type="month"
            max={maxMonth}
            value={filters.bFrom}
            onChange={(event) =>
              updateFilter('bFrom', event.target.value)
            }
            className="ds-control min-h-11 bg-[var(--surface)] px-3"
          />
          <input
            aria-label="Fim período B"
            type="month"
            max={maxMonth}
            value={filters.bTo}
            onChange={(event) =>
              updateFilter('bTo', event.target.value)
            }
            className="ds-control min-h-11 bg-[var(--surface)] px-3"
          />
        </fieldset>

        <label className="grid content-end gap-2 text-sm font-bold">
          Moeda
          <select
            aria-label="Moeda"
            value={filters.currency}
            onChange={(event) =>
              updateFilter(
                'currency',
                event.target.value as SupportedCurrency,
              )
            }
            className="ds-control min-h-11 bg-[var(--surface)] px-3"
          >
            <option>BRL</option>
            <option>USD</option>
            <option>EUR</option>
          </select>
        </label>
      </section>

      {showLoading && (
        <p
          role="status"
          className="py-12 text-center text-[var(--text-muted)]"
        >
          Comparando períodos…
        </p>
      )}

      {!showLoading && hasCurrentError && (
        <div
          role="alert"
          className="mt-5 rounded-xl border border-[var(--danger)] bg-[var(--danger-subtle)] p-4 text-[var(--expense)]"
        >
          <p>{currentError}</p>
          {!validationError && (
            <button
              type="button"
              onClick={() => {
                setFailure(null);
                setRetryNonce((value) => value + 1);
              }}
              className="mt-3 min-h-11 rounded-lg border border-current px-4 text-sm font-bold"
            >
              Tentar novamente
            </button>
          )}
        </div>
      )}

      {!showLoading &&
        !hasCurrentError &&
        hasCurrentData &&
        data && (
          <div className="mt-5 space-y-5">
            {!data.coverage.sameLength && (
              <div
                role="note"
                className="rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] p-4 text-sm"
              >
                <strong>Coberturas diferentes.</strong>{' '}
                Totais absolutos continuam visíveis, mas não são
                diretamente equivalentes. Use as médias mensais para
                comparar ritmo entre os períodos.
              </div>
            )}

            {data.coverage.overlaps && (
              <p className="rounded-xl border border-[var(--border)] p-3 text-sm text-[var(--text-muted)]">
                Os períodos se sobrepõem; meses compartilhados entram nos
                dois lados da comparação.
              </p>
            )}

            <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
              <div className="hidden md:block">
                <div className="grid grid-cols-[1.4fr_1fr_1fr_1.2fr] gap-2 border-b border-[var(--border)] bg-[var(--surface-raised)] px-4 py-3 text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">
                  <span>Métrica</span>
                  <span>
                    A · {formatRange(data.a.range)} ({data.a.months}{' '}
                    {data.a.months === 1 ? 'mês' : 'meses'})
                  </span>
                  <span>
                    B · {formatRange(data.b.range)} ({data.b.months}{' '}
                    {data.b.months === 1 ? 'mês' : 'meses'})
                  </span>
                  <span>Diferença B − A</span>
                </div>
                {totalRows.map((row) => (
                  <div
                    key={row.label}
                    className="grid grid-cols-[1.4fr_1fr_1fr_1.2fr] gap-2 border-b border-[var(--border)] px-4 py-4 last:border-0"
                  >
                    <strong className="text-sm">{row.label}</strong>
                    <span>
                      {displayMoney(
                        row.a,
                        data.currency,
                        showValues,
                      )}
                    </span>
                    <span>
                      {displayMoney(
                        row.b,
                        data.currency,
                        showValues,
                      )}
                    </span>
                    <MetricDifference
                      metric={row.metric}
                      currency={data.currency}
                      showValues={showValues}
                    />
                  </div>
                ))}
              </div>

              <div className="grid gap-3 p-3 md:hidden">
                {totalRows.map((row) => (
                  <article
                    key={row.label}
                    className="rounded-xl border border-[var(--border)] p-4"
                  >
                    <h2 className="font-bold">{row.label}</h2>
                    <dl className="mt-3 grid gap-3 text-sm">
                      <div>
                        <dt className="text-[var(--text-muted)]">
                          A · {formatRange(data.a.range)}
                        </dt>
                        <dd className="font-semibold">
                          {displayMoney(
                            row.a,
                            data.currency,
                            showValues,
                          )}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-[var(--text-muted)]">
                          B · {formatRange(data.b.range)}
                        </dt>
                        <dd className="font-semibold">
                          {displayMoney(
                            row.b,
                            data.currency,
                            showValues,
                          )}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-[var(--text-muted)]">
                          Diferença B − A
                        </dt>
                        <dd>
                          <MetricDifference
                            metric={row.metric}
                            currency={data.currency}
                            showValues={showValues}
                          />
                        </dd>
                      </div>
                    </dl>
                  </article>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
              <h2 className="text-lg font-bold">Médias mensais</h2>
              <p className="mt-1 text-sm text-[var(--text-muted)]">
                Normalizam cada total pela quantidade exata de meses do
                respectivo período.
              </p>
              <div className="mt-4 grid gap-3 lg:grid-cols-3">
                {averageRows.map((row) => (
                  <article
                    key={row.label}
                    className="rounded-xl border border-[var(--border)] p-4"
                  >
                    <h3 className="text-sm font-bold">{row.label}</h3>
                    <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <small className="text-[var(--text-muted)]">
                          A
                        </small>
                        <strong className="block">
                          {displayMoney(
                            row.a,
                            data.currency,
                            showValues,
                          )}
                        </strong>
                      </div>
                      <div>
                        <small className="text-[var(--text-muted)]">
                          B
                        </small>
                        <strong className="block">
                          {displayMoney(
                            row.b,
                            data.currency,
                            showValues,
                          )}
                        </strong>
                      </div>
                    </div>
                    <div className="mt-3">
                      <MetricDifference
                        metric={row.metric}
                        currency={data.currency}
                        showValues={showValues}
                      />
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className="grid gap-4 lg:grid-cols-2">
              <article className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
                <h2 className="text-lg font-bold">
                  Patrimônio no fim do período
                </h2>
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  Base {data.netWorthMethodology.basis} · série
                  transacional comparável, sem reconstruir mercado
                  retroativo.
                </p>
                {data.a.netWorthEnd === null ||
                data.b.netWorthEnd === null ||
                data.difference.netWorthEnd === null ? (
                  <p className="mt-3 text-sm text-[var(--text-muted)]">
                    {data.a.netWorthStatus === 'ERROR' ||
                    data.b.netWorthStatus === 'ERROR'
                      ? 'Patrimônio temporariamente indisponível para um dos períodos. O comparativo de receitas e despesas continua válido.'
                      : 'Sem ponto patrimonial comparável nessa moeda para um dos períodos.'}
                  </p>
                ) : (
                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <div>
                      <small className="text-[var(--text-muted)]">
                        A · {formatLogicalDate(data.a.netWorthAsOf)}
                      </small>
                      <strong className="block">
                        {displayMoney(
                          data.a.netWorthEnd,
                          data.currency,
                          showValues,
                        )}
                      </strong>
                    </div>
                    <div>
                      <small className="text-[var(--text-muted)]">
                        B · {formatLogicalDate(data.b.netWorthAsOf)}
                      </small>
                      <strong className="block">
                        {displayMoney(
                          data.b.netWorthEnd,
                          data.currency,
                          showValues,
                        )}
                      </strong>
                    </div>
                    <div>
                      <small className="text-[var(--text-muted)]">
                        Diferença
                      </small>
                      <MetricDifference
                        metric={data.difference.netWorthEnd}
                        currency={data.currency}
                        showValues={showValues}
                      />
                    </div>
                  </div>
                )}
              </article>

              <article className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
                <h2 className="text-lg font-bold">Cobertura</h2>
                <p className="mt-3 text-sm text-[var(--text-muted)]">
                  A: {formatRange(data.a.range)} · {data.a.months}{' '}
                  {data.a.months === 1 ? 'mês' : 'meses'}
                </p>
                <p className="mt-1 text-sm text-[var(--text-muted)]">
                  B: {formatRange(data.b.range)} · {data.b.months}{' '}
                  {data.b.months === 1 ? 'mês' : 'meses'}
                </p>
                <p className="mt-2 text-sm text-[var(--text-muted)]">
                  A é o baseline. Percentuais não são inventados quando
                  A é zero.
                </p>
              </article>
            </section>

            <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
              <h2 className="text-lg font-bold">
                Categorias de despesa
              </h2>
              <p className="mt-1 text-sm text-[var(--text-muted)]">
                Inclui divisões e créditos de cartão como redução da
                despesa correspondente.
              </p>

              {data.categories.length === 0 ? (
                <p className="mt-3 text-sm text-[var(--text-muted)]">
                  Sem despesas nos períodos selecionados.
                </p>
              ) : (
                <>
                  <div className="mt-4 hidden md:grid md:gap-2">
                    {data.categories.map((category) => (
                      <div
                        key={category.id}
                        className="grid grid-cols-[minmax(140px,1.4fr)_1fr_1fr_1.2fr] gap-2 rounded-xl border border-[var(--border)] px-4 py-3"
                      >
                        <strong className="truncate text-sm">
                          {category.name}
                        </strong>
                        <div>
                          <span className="block">
                            {displayMoney(
                              category.a.amount,
                              data.currency,
                              showValues,
                            )}
                          </span>
                          {!data.coverage.sameLength && (
                            <small className="text-[var(--text-muted)]">
                              média{' '}
                              {displayMoney(
                                category.a.averageMonthlyAmount,
                                data.currency,
                                showValues,
                              )}
                              /mês
                            </small>
                          )}
                        </div>
                        <div>
                          <span className="block">
                            {displayMoney(
                              category.b.amount,
                              data.currency,
                              showValues,
                            )}
                          </span>
                          {!data.coverage.sameLength && (
                            <small className="text-[var(--text-muted)]">
                              média{' '}
                              {displayMoney(
                                category.b.averageMonthlyAmount,
                                data.currency,
                                showValues,
                              )}
                              /mês
                            </small>
                          )}
                        </div>
                        <MetricDifference
                          metric={
                            data.coverage.sameLength
                              ? category.difference
                              : category.averageDifference
                          }
                          currency={data.currency}
                          showValues={showValues}
                        />
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 grid gap-3 md:hidden">
                    {data.categories.map((category) => (
                      <article
                        key={category.id}
                        className="rounded-xl border border-[var(--border)] p-4"
                      >
                        <h3 className="font-bold">{category.name}</h3>
                        <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <dt className="text-[var(--text-muted)]">
                              Período A
                            </dt>
                            <dd className="font-semibold">
                              {displayMoney(
                                category.a.amount,
                                data.currency,
                                showValues,
                              )}
                            </dd>
                            {!data.coverage.sameLength && (
                              <dd className="text-xs text-[var(--text-muted)]">
                                {displayMoney(
                                  category.a.averageMonthlyAmount,
                                  data.currency,
                                  showValues,
                                )}
                                /mês
                              </dd>
                            )}
                          </div>
                          <div>
                            <dt className="text-[var(--text-muted)]">
                              Período B
                            </dt>
                            <dd className="font-semibold">
                              {displayMoney(
                                category.b.amount,
                                data.currency,
                                showValues,
                              )}
                            </dd>
                            {!data.coverage.sameLength && (
                              <dd className="text-xs text-[var(--text-muted)]">
                                {displayMoney(
                                  category.b.averageMonthlyAmount,
                                  data.currency,
                                  showValues,
                                )}
                                /mês
                              </dd>
                            )}
                          </div>
                        </dl>
                        <div className="mt-3">
                          <MetricDifference
                            metric={
                              data.coverage.sameLength
                                ? category.difference
                                : category.averageDifference
                            }
                            currency={data.currency}
                            showValues={showValues}
                          />
                        </div>
                      </article>
                    ))}
                  </div>
                </>
              )}
            </section>
          </div>
        )}
    </div>
  );
}
