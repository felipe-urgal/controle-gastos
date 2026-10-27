'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { FaExchangeAlt } from 'react-icons/fa';

import { PageContainer, PageTitle } from '@/app/components/base-pages';
import { PageError } from '@/app/components/feedback';
import { ProtectedRoute } from '@/app/components/layout';
import { CARD_EASE } from '@/app/components/pages/financial-comparison/comparison-motion';
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
  const reduce = useReducedMotion();
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
  // Quantas vezes A e B foram trocados: o ícone gira meia volta a cada troca.
  const [swaps, setSwaps] = useState(0);

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
    setSwaps((count) => count + 1);
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
          animated
          ariaLabel="Tipo de comparação"
          value={preset ?? 'custom'}
          onChange={choosePreset}
          options={[...PRESETS.map((item) => ({ value: item.key, label: item.label })), { value: 'custom', label: 'Personalizado' }]}
        />
      </div>
      <CurrencySelect animated value={filters.currency} onChange={(item) => updateFilter('currency', item)} />
    </div>
  );

  return (
    <ProtectedRoute>
      <PageContainer>
        <PageTitle title="Comparar períodos" sidebarAligned animated="collide" actions={<ShowFrom breakpoint="lg">{headerControls}</ShowFrom>} />
        <ShowBelow breakpoint="lg">
          <div className="mt-4">{headerControls}</div>
        </ShowBelow>

        <motion.section
          aria-label="Períodos comparados"
          initial={reduce ? false : { opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: CARD_EASE, delay: 0.2 }}
          className="mt-4 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-3 sm:p-4"
        >
          <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto] sm:gap-4">
            <PeriodLabel
              side="A"
              title="A · base"
              range={rangeA ? formatRange(rangeA) : 'Período inválido'}
              months={data ? monthsLabel(data.a.months) : null}
            />
            {/* O botão "versus" salta para o meio depois dos dois lados; ao trocar A e B ele gira meia volta e um anel pulsa. */}
            <motion.span
              className="relative flex"
              initial={reduce ? false : { scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: swaps * 180, transition: { type: 'spring', stiffness: 260, damping: 14, delay: swaps === 0 ? 0.55 : 0 } }}
              whileHover={{ scale: 1.15 }}
              whileTap={{ scale: 0.85 }}
            >
              {!reduce && (
                <motion.span
                  key={swaps}
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 rounded-full border-2 border-[var(--primary)]"
                  initial={{ scale: 1, opacity: swaps === 0 ? 0 : 0.7 }}
                  animate={{ scale: 1.9, opacity: 0 }}
                  transition={{ duration: 0.7, ease: 'easeOut', delay: swaps === 0 ? 0.75 : 0 }}
                />
              )}
              <IconButton
                label="Inverter períodos A e B"
                icon={<FaExchangeAlt />}
                onClick={swapPeriods}
                className="rounded-full border border-[var(--border-strong)] bg-[var(--surface)]"
              />
            </motion.span>
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
          <AnimatePresence initial={false}>
            {editOpen && (
              <motion.div
                key="edit"
                className="overflow-hidden"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1, transitionEnd: { overflow: 'visible' } }}
                exit={{ height: 0, opacity: 0, overflow: 'hidden' }}
                transition={{ duration: 0.3, ease: CARD_EASE }}
              >
                {/* Os quatro campos entram em sequência: A de um lado, B do outro. */}
                <div className="mt-3 grid gap-2 border-t border-[var(--border)] pt-3 sm:grid-cols-2 lg:grid-cols-4">
                  {[
                    { label: 'Início período A', key: 'aFrom' },
                    { label: 'Fim período A', key: 'aTo' },
                    { label: 'Início período B', key: 'bFrom' },
                    { label: 'Fim período B', key: 'bTo' },
                  ].map((field, index) => (
                    <motion.div
                      key={field.key}
                      initial={reduce ? false : { opacity: 0, x: index < 2 ? -24 : 24 }}
                      animate={{ opacity: 1, x: 0, transition: { type: 'spring', stiffness: 300, damping: 22, delay: 0.1 + index * 0.06 } }}
                    >
                      <Input
                        aria-label={field.label}
                        type="month"
                        max={maxMonth}
                        value={filters[field.key as 'aFrom' | 'aTo' | 'bFrom' | 'bTo']}
                        onChange={(event) => updateFilter(field.key as 'aFrom' | 'aTo' | 'bFrom' | 'bTo', event.target.value)}
                      />
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.section>

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
  const reduce = useReducedMotion();
  // A vem da esquerda e B da direita; ao inverter, o texto de cada lado sai para o lado do outro e o novo entra de lá.
  const dir = side === 'A' ? -1 : 1;

  return (
    <motion.div
      className="grid min-w-0 gap-0.5"
      initial={reduce ? false : { opacity: 0, x: dir * 40 }}
      animate={{ opacity: 1, x: 0 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 240, damping: 20, delay: 0.3 }}
    >
      <span className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text-muted)]">
        <motion.span
          className={`h-2 w-2 rounded-full ${side === 'A' ? 'bg-[var(--border-strong)]' : 'bg-[var(--primary)]'}`}
          aria-hidden="true"
          initial={reduce ? false : { scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 500, damping: 12, delay: 0.6 }}
        />
        {title}
      </span>
      <span className="relative block overflow-hidden">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={range}
            className="block break-words text-sm font-bold leading-snug tracking-tight sm:text-lg"
            initial={{ opacity: 0, x: -dir * 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: dir * 30 }}
            transition={{ type: 'spring', stiffness: 320, damping: 26 }}
          >
            {range}
          </motion.span>
        </AnimatePresence>
      </span>
      <span className="min-h-4 text-xs text-[var(--text-muted)]">{months ?? ' '}</span>
    </motion.div>
  );
}
