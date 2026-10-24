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
import { Button, Chip, IconButton, Input } from '@/app/components/ui';
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

const CURRENCIES: SupportedCurrency[] = ['BRL', 'USD', 'EUR'];
const SUPPORTED_CURRENCIES = new Set<SupportedCurrency>(CURRENCIES);

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

function formatRange(range: ComparisonRange) {
  if (range.from.year === range.to.year && range.from.month === range.to.month) {
    return formatMonth(range.from);
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
  const [editing, setEditing] = useState<{ a: boolean; b: boolean }>({ a: false, b: false });

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

  const rangeA = rangeFromValues(filters.aFrom, filters.aTo);
  const rangeB = rangeFromValues(filters.bFrom, filters.bTo);

  return (
    <ProtectedRoute>
      <PageContainer>
        <PageTitle
          title="Comparar períodos"
          description="Compare o realizado entre dois intervalos de até 24 meses, na mesma moeda."
          actions={
            <div className="flex gap-2" role="group" aria-label="Moeda">
              {CURRENCIES.map((item) => (
                <Chip key={item} selected={item === filters.currency} onClick={() => updateFilter('currency', item)}>
                  {item}
                </Chip>
              ))}
            </div>
          }
        />

        <nav aria-label="Atalhos de comparação" className="mt-5 flex flex-wrap gap-2">
          {PRESETS.map((item) => (
            <Chip key={item.key} selected={preset === item.key} onClick={() => applyFilters(presetFilters(item.key, filters, currentMonth))}>
              {item.label}
            </Chip>
          ))}
        </nav>

        <section aria-label="Períodos comparados" className="mt-3 grid items-stretch gap-3 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
          <PeriodCard
            side="A"
            title="Período A · base"
            range={rangeA ? formatRange(rangeA) : 'Período inválido'}
            months={data ? monthsLabel(data.a.months) : null}
            from={filters.aFrom}
            to={filters.aTo}
            maxMonth={maxMonth}
            open={editing.a || validationError !== null}
            onToggle={() => setEditing((value) => ({ ...value, a: !value.a }))}
            onFrom={(value) => updateFilter('aFrom', value)}
            onTo={(value) => updateFilter('aTo', value)}
          />
          <div className="grid place-items-center">
            <IconButton
              label="Inverter períodos A e B"
              icon={<FaExchangeAlt />}
              onClick={swapPeriods}
              className="rounded-full border border-[var(--border-strong)] bg-[var(--surface)] rotate-90 lg:rotate-0"
            />
          </div>
          <PeriodCard
            side="B"
            title="Período B · comparado"
            range={rangeB ? formatRange(rangeB) : 'Período inválido'}
            months={data ? monthsLabel(data.b.months) : null}
            from={filters.bFrom}
            to={filters.bTo}
            maxMonth={maxMonth}
            open={editing.b || validationError !== null}
            onToggle={() => setEditing((value) => ({ ...value, b: !value.b }))}
            onFrom={(value) => updateFilter('bFrom', value)}
            onTo={(value) => updateFilter('bTo', value)}
          />
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
            <FinancialComparisonView data={data} showValues={showValues} override={basisOverride} onOverride={setBasisOverride} />
          )}
        </div>
      </PageContainer>
    </ProtectedRoute>
  );
}

function PeriodCard({
  side,
  title,
  range,
  months,
  from,
  to,
  maxMonth,
  open,
  onToggle,
  onFrom,
  onTo,
}: {
  side: 'A' | 'B';
  title: string;
  range: string;
  months: string | null;
  from: string;
  to: string;
  maxMonth: string;
  open: boolean;
  onToggle: () => void;
  onFrom: (value: string) => void;
  onTo: (value: string) => void;
}) {
  return (
    <div className={`grid gap-1 rounded-[var(--radius-lg)] border border-[var(--border)] border-t-4 bg-[var(--surface)] p-4 ${side === 'A' ? 'border-t-[var(--border-strong)]' : 'border-t-[var(--orbit-primary)]'}`}>
      <span className="text-xs font-bold text-[var(--text-muted)]">{title}</span>
      <span className="break-words text-xl font-extrabold tracking-tight">{range}</span>
      <span className="min-h-5 text-sm text-[var(--text-muted)]">{months ?? ' '}</span>
      <div>
        <Button type="button" variant="ghost" size="sm" aria-expanded={open} onClick={onToggle}>
          {open ? 'Fechar' : 'Alterar período'}
        </Button>
      </div>
      {open && (
        <div className="grid gap-2 pt-1 sm:grid-cols-2">
          <Input aria-label={`Início período ${side}`} type="month" max={maxMonth} value={from} onChange={(event) => onFrom(event.target.value)} />
          <Input aria-label={`Fim período ${side}`} type="month" max={maxMonth} value={to} onChange={(event) => onTo(event.target.value)} />
        </div>
      )}
    </div>
  );
}
