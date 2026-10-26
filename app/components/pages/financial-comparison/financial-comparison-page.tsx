'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { FaExchangeAlt } from 'react-icons/fa';

import { PageContainer, PageTitle } from '@/app/components/base-pages';
import { PageError } from '@/app/components/feedback';
import { ProtectedRoute } from '@/app/components/layout';
import FinancialComparisonView from '@/app/components/pages/financial-comparison/financial-comparison-view';
import {
  activePreset,
  defaultFilters,
  monthValue,
  presetFilters,
  type ComparisonBasis,
  type ComparisonFilters,
  type ComparisonPreset,
} from '@/app/components/pages/financial-comparison/financial-comparison-model';
import { Button, IconButton, Input, Select, ShowBelow, ShowFrom, CurrencySelect } from '@/app/components/ui';
import { useAuth } from '@/app/context';
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
} from '@/app/types/financial-comparison';
import type { SupportedCurrency } from '@/app/types/financial-summary';

type SearchParamsLike = {
  get(name: string): string | null;
};

const SUPPORTED_CURRENCIES = new Set<SupportedCurrency>(['BRL', 'USD', 'EUR']);

const PRESETS: Array<{ key: ComparisonPreset; label: string }> = [
  { key: 'previous', label: 'Mês anterior × atual' },
  { key: 'year-over-year', label: 'Mesmo mês, ano anterior' },
  { key: 'ytd', label: 'Ano até agora × anterior' },
  { key: 'closed-year', label: 'Anos fechados' },
];

function formatMonth(period: ComparisonMonth) {
  return new Intl.DateTimeFormat('pt-BR', {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(period.year, period.month - 1, 1)));
}

function formatMonthName(period: ComparisonMonth) {
  return new Intl.DateTimeFormat('pt-BR', { month: 'short', timeZone: 'UTC' }).format(
    new Date(Date.UTC(period.year, period.month - 1, 1)),
  );
}

/** "jan. – out. de 2026" quando o intervalo cabe num ano; o ano aparece uma vez só. */
function formatRange(range: ComparisonRange) {
  if (range.from.year === range.to.year && range.from.month === range.to.month) {
    return formatMonth(range.from);
  }
  if (range.from.year === range.to.year) {
    return `${formatMonthName(range.from)} – ${formatMonth(range.to)}`;
  }
  return `${formatMonth(range.from)} – ${formatMonth(range.to)}`;
}

function rangeFromValues(fromValue: string, toValue: string) {
  const from = parseComparisonMonth(fromValue);
  const to = parseComparisonMonth(toValue);
  return from && to ? { from, to } : null;
}

function validateRangeValues(fromValue: string, toValue: string, currentMonth: ComparisonMonth) {
  const range = rangeFromValues(fromValue, toValue);
  if (!range) return 'Período inválido';

  try {
    enumerateComparisonMonths(range);
  } catch (cause) {
    return cause instanceof Error ? cause.message : 'Período de comparação inválido';
  }

  if (isComparisonRangeInFuture(range, currentMonth)) {
    return 'Períodos futuros não podem ser comparados como realizado';
  }

  return null;
}

function filtersFromSearch(params: SearchParamsLike, defaults: ComparisonFilters): ComparisonFilters {
  const monthOrDefault = (name: string, fallback: string) => {
    const value = params.get(name);
    return value && parseComparisonMonth(value) ? value : fallback;
  };
  const currency = params.get('currency') as SupportedCurrency | null;

  return {
    aFrom: monthOrDefault('aFrom', defaults.aFrom),
    aTo: monthOrDefault('aTo', defaults.aTo),
    bFrom: monthOrDefault('bFrom', defaults.bFrom),
    bTo: monthOrDefault('bTo', defaults.bTo),
    currency: currency && SUPPORTED_CURRENCIES.has(currency) ? currency : defaults.currency,
  };
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

function monthsLabel(months: number) {
  return `${months} ${months === 1 ? 'mês' : 'meses'}`;
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
  const defaults = useMemo(() => defaultFilters(currentMonth), [currentMonth]);
  const filters = useMemo(
    () => filtersFromSearch(new URLSearchParams(searchKey), defaults),
    [searchKey, defaults],
  );

  const [result, setResult] = useState<{ key: string; data: FinancialComparisonData } | null>(null);
  const [failure, setFailure] = useState<{ key: string; message: string } | null>(null);
  const [retryNonce, setRetryNonce] = useState(0);
  const [basisOverride, setBasisOverride] = useState<ComparisonBasis | null>(null);
  const [editing, setEditing] = useState(false);

  const queryKey = useMemo(() => serializeFilters(filters), [filters]);
  useEffect(() => {
    if (queryKey === searchKey) return;

    router.replace(pathname + '?' + queryKey, { scroll: false });
  }, [queryKey, searchKey, pathname, router]);

  const validationError = useMemo(
    () =>
      validateRangeValues(filters.aFrom, filters.aTo, currentMonth) ??
      validateRangeValues(filters.bFrom, filters.bTo, currentMonth),
    [filters, currentMonth],
  );

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
          message: cause instanceof Error ? cause.message : 'Erro ao comparar períodos',
        });
      });

    return () => {
      active = false;
    };
  }, [filters, queryKey, retryNonce, validationError]);

  const data = result?.key === queryKey ? result.data : null;
  const currentError = validationError ?? (failure?.key === queryKey ? failure.message : null);
  const showLoading = data === null && currentError === null;
  const preset = activePreset(filters, currentMonth);
  const maxMonth = monthValue(currentMonth);

  function applyFilters(next: ComparisonFilters) {
    const nextKey = serializeFilters(next);

    if (nextKey !== searchKey) {
      router.push(pathname + '?' + nextKey, { scroll: false });
    }
  }

  function updateFilter<K extends keyof ComparisonFilters>(key: K, value: ComparisonFilters[K]) {
    applyFilters({ ...filters, [key]: value });
  }

  function swapPeriods() {
    applyFilters({
      ...filters,
      aFrom: filters.bFrom,
      aTo: filters.bTo,
      bFrom: filters.aFrom,
      bTo: filters.aTo,
    });
  }

  const editOpen = editing || validationError !== null;
  const rangeA = rangeFromValues(filters.aFrom, filters.aTo);
  const rangeB = rangeFromValues(filters.bFrom, filters.bTo);

  function choosePreset(value: string | number) {
    if (value === 'custom') {
      setEditing(true);
      return;
    }
    applyFilters(presetFilters(value as ComparisonPreset, filters, currentMonth));
  }

  const headerControls = (
    <div className="flex flex-wrap items-center gap-2.5">
      <div className="min-w-0 flex-1 sm:w-[230px] sm:flex-none">
        <Select
          ariaLabel="Tipo de comparação"
          value={preset ?? 'custom'}
          onChange={choosePreset}
          options={[...PRESETS.map((item) => ({ value: item.key, label: item.label })), { value: 'custom', label: 'Personalizado' }]}
        />
      </div>
      <CurrencySelect value={filters.currency} onChange={(item) => updateFilter('currency', item)} />
    </div>
  );

  return (
    <ProtectedRoute>
      <PageContainer>
        <PageTitle title="Comparar períodos" sidebarAligned actions={<ShowFrom breakpoint="lg">{headerControls}</ShowFrom>} />
        <ShowBelow breakpoint="lg">
          <div className="mt-4">{headerControls}</div>
        </ShowBelow>

        <section aria-label="Períodos comparados" className="mt-4 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-3 sm:p-4">
          <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto] sm:gap-4">
            <PeriodLabel
              side="A"
              title="A · base"
              range={rangeA ? formatRange(rangeA) : 'Período inválido'}
              months={data ? monthsLabel(data.a.months) : null}
            />
            <IconButton
              label="Inverter períodos A e B"
              icon={<FaExchangeAlt />}
              onClick={swapPeriods}
              className="rounded-full border border-[var(--border-strong)] bg-[var(--surface)]"
            />
            <PeriodLabel
              side="B"
              title="B · comparado"
              range={rangeB ? formatRange(rangeB) : 'Período inválido'}
              months={data ? monthsLabel(data.b.months) : null}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="col-span-3 justify-self-end sm:col-span-1"
              aria-expanded={editOpen}
              onClick={() => setEditing((value) => !value)}
            >
              {editOpen ? 'Fechar' : 'Alterar períodos'}
            </Button>
          </div>
          {editOpen && (
            <div className="grid gap-2 border-t border-[var(--border)] pt-3 mt-3 sm:grid-cols-2 lg:grid-cols-4">
              <Input aria-label="Início período A" type="month" max={maxMonth} value={filters.aFrom} onChange={(event) => updateFilter('aFrom', event.target.value)} />
              <Input aria-label="Fim período A" type="month" max={maxMonth} value={filters.aTo} onChange={(event) => updateFilter('aTo', event.target.value)} />
              <Input aria-label="Início período B" type="month" max={maxMonth} value={filters.bFrom} onChange={(event) => updateFilter('bFrom', event.target.value)} />
              <Input aria-label="Fim período B" type="month" max={maxMonth} value={filters.bTo} onChange={(event) => updateFilter('bTo', event.target.value)} />
            </div>
          )}
        </section>

        <div className="mt-4">
          {showLoading && (
            <div role="status" className="space-y-4" aria-live="polite">
              <p className="text-sm text-[var(--text-muted)]">Comparando períodos…</p>
              <div className="animate-pulse space-y-4" aria-hidden="true">
                <div className="h-36 rounded-[var(--radius-lg)] bg-[var(--skeleton)]" />
                <div className="grid gap-4 lg:grid-cols-[1.55fr_1fr]">
                  <div className="h-72 rounded-[var(--radius-lg)] bg-[var(--skeleton)]" />
                  <div className="h-40 rounded-[var(--radius-lg)] bg-[var(--skeleton)]" />
                </div>
              </div>
            </div>
          )}

          {!showLoading && currentError !== null && (
            <PageError
              title={validationError ? 'Revise os períodos' : 'Erro ao comparar'}
              message={currentError}
              buttonText={validationError ? undefined : 'Tentar novamente'}
              onRetry={
                validationError
                  ? undefined
                  : () => {
                      setFailure(null);
                      setRetryNonce((value) => value + 1);
                    }
              }
            />
          )}

          {!showLoading && currentError === null && data && (
            <FinancialComparisonView
              data={data}
              showValues={showValues}
              labels={{ a: formatRange(data.a.range), b: formatRange(data.b.range) }}
              override={basisOverride}
              onOverride={setBasisOverride}
            />
          )}
        </div>
      </PageContainer>
    </ProtectedRoute>
  );
}

function PeriodLabel({
  side,
  title,
  range,
  months,
}: {
  side: 'A' | 'B';
  title: string;
  range: string;
  months: string | null;
}) {
  return (
    <div className="grid min-w-0 gap-0.5">
      <span className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text-muted)]">
        <span className={`h-2 w-2 rounded-full ${side === 'A' ? 'bg-[var(--border-strong)]' : 'bg-[var(--primary)]'}`} aria-hidden="true" />
        {title}
      </span>
      <span className="break-words text-sm font-bold leading-snug tracking-tight sm:text-lg">{range}</span>
      <span className="min-h-4 text-xs text-[var(--text-muted)]">{months ?? ' '}</span>
    </div>
  );
}
