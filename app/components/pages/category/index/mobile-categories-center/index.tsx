'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import {
  FaArrowDown,
  FaArrowUp,
  FaBell,
  FaCalendarAlt,
  FaChartPie,
  FaChevronRight,
  FaFilter,
  FaPlus,
  FaSearch,
  FaTag,
  FaTimes,
} from 'react-icons/fa';

import { IconRenderer } from '@/app/components/ui';
import { currencyOptions } from '@/app/lib/constants/account.constants';
import { formatCurrency } from '@/app/lib/currency/format-currency';
import type { CategoryMonthlyLimitItem } from '@/app/types/category-monthly-limit';
import type { CategoryModel } from '@/app/types/category';
import type { SupportedCurrency } from '@/app/types/financial-summary';

type MobileCategoryTab = 'categories' | 'alerts' | 'distribution';
type CategoryTypeFilter = 'all' | 'expense' | 'income';
type CategoryStatusFilter = 'all' | 'critical' | 'ok' | 'no-limit';
type LimitScope = 'all' | 'with-limit' | 'no-limit';

type DistributionEntry = {
  id: string;
  name: string;
  color: string;
  amount: number;
  percentage: number;
};

type Distribution = {
  total: number;
  entries: DistributionEntry[];
  gradient: string;
};

interface MobileCategoriesCenterProps {
  items: CategoryMonthlyLimitItem[];
  incomeCategories: CategoryModel[];
  loading: boolean;
  error: string;
  periodValue: string;
  currency: SupportedCurrency;
  controlsDisabled: boolean;
  search: string;
  onSearchChange: (value: string) => void;
  onPeriodChange: (value: string) => void;
  onCurrencyChange: (value: SupportedCurrency) => void;
  budgetTotal: number;
  realizedTotal: number;
  remainingTotal: number;
  budgetPercentage: number;
  criticalItems: CategoryMonthlyLimitItem[];
  distribution: Distribution;
  showValues: boolean;
  typeFilter: CategoryTypeFilter;
  onTypeFilterChange: (value: CategoryTypeFilter) => void;
  statusFilter: CategoryStatusFilter;
  onStatusFilterChange: (value: CategoryStatusFilter) => void;
  limitScope: LimitScope;
  onLimitScopeChange: (value: LimitScope) => void;
  onEditLimit: (item: CategoryMonthlyLimitItem) => void;
  onRemoveLimit: (item: CategoryMonthlyLimitItem) => Promise<void>;
  confirmingRemoveId: string | null;
  removingCategoryId: string | null;
  mutationBusy: boolean;
  onCancelRemove: () => void;
}

function displayMoney(
  amount: number | null,
  showValues: boolean,
  currency: SupportedCurrency | string,
) {
  if (amount === null) return '—';
  return showValues ? formatCurrency(amount, currency) : '••••';
}

function monthLabel(periodValue: string) {
  const [year, month] = periodValue.split('-').map(Number);
  if (!year || !month) return periodValue;
  const date = new Date(year, month - 1, 1);
  const label = new Intl.DateTimeFormat('pt-BR', {
    month: 'short',
    year: 'numeric',
  }).format(date);
  return label.replace('.', '');
}

function stateFor(item: CategoryMonthlyLimitItem) {
  if (!item.limit) return 'info' as const;
  const percentage = item.percentage ?? 0;
  if (percentage > 100) return 'danger' as const;
  if (percentage >= 80) return 'warn' as const;
  return 'ok' as const;
}

function barClass(item: CategoryMonthlyLimitItem) {
  const state = stateFor(item);
  if (state === 'danger') return 'bg-[var(--expense)]';
  if (state === 'warn') return 'bg-[#ec4899]';
  if (state === 'ok') return 'bg-[var(--orbit-primary)]';
  return 'bg-[var(--surface-subtle)]';
}

function percentageClass(item: CategoryMonthlyLimitItem) {
  const state = stateFor(item);
  if (state === 'danger') return 'text-[var(--expense)]';
  if (state === 'warn') return 'text-[#ec4899]';
  if (state === 'ok') return 'text-[var(--orbit-primary)]';
  return 'text-[var(--text-muted)]';
}

export default function MobileCategoriesCenter({
  items,
  incomeCategories,
  loading,
  error,
  periodValue,
  currency,
  controlsDisabled,
  search,
  onSearchChange,
  onPeriodChange,
  onCurrencyChange,
  budgetTotal,
  realizedTotal,
  remainingTotal,
  budgetPercentage,
  criticalItems,
  distribution,
  showValues,
  typeFilter,
  onTypeFilterChange,
  statusFilter,
  onStatusFilterChange,
  limitScope,
  onLimitScopeChange,
  onEditLimit,
  onRemoveLimit,
  confirmingRemoveId,
  removingCategoryId,
  mutationBusy,
  onCancelRemove,
}: MobileCategoriesCenterProps) {
  const [tab, setTab] = useState<MobileCategoryTab>('categories');
  const [filterOpen, setFilterOpen] = useState(false);
  const [selectedExpenseId, setSelectedExpenseId] = useState<string | null>(null);
  const [selectedIncomeId, setSelectedIncomeId] = useState<string | null>(null);

  const normalizedSearch = search.trim().toLocaleLowerCase('pt-BR');

  const filteredExpenses = useMemo(
    () =>
      [...items]
        .filter((item) =>
          item.category.name.toLocaleLowerCase('pt-BR').includes(normalizedSearch),
        )
        .filter((item) => {
          if (typeFilter === 'income') return false;
          if (statusFilter === 'critical' && (item.percentage ?? 0) < 80) return false;
          if (statusFilter === 'ok' && stateFor(item) !== 'ok') return false;
          if (statusFilter === 'no-limit' && item.limit !== null) return false;
          if (limitScope === 'with-limit' && item.limit === null) return false;
          if (limitScope === 'no-limit' && item.limit !== null) return false;
          return true;
        })
        .sort((left, right) => {
          const leftUsage = left.limit ? left.percentage ?? 0 : -1;
          const rightUsage = right.limit ? right.percentage ?? 0 : -1;
          return rightUsage - leftUsage || right.realized - left.realized;
        }),
    [items, limitScope, normalizedSearch, statusFilter, typeFilter],
  );

  const filteredIncome = useMemo(
    () =>
      typeFilter === 'expense' || statusFilter !== 'all' || limitScope !== 'all'
        ? []
        : incomeCategories
            .filter((category) =>
              category.name.toLocaleLowerCase('pt-BR').includes(normalizedSearch),
            )
            .sort((left, right) => left.name.localeCompare(right.name, 'pt-BR')),
    [incomeCategories, limitScope, normalizedSearch, statusFilter, typeFilter],
  );

  const selectedExpense =
    items.find((item) => item.category.id === selectedExpenseId) ?? null;
  const selectedIncome =
    incomeCategories.find((item) => item.id === selectedIncomeId) ?? null;

  const safePercentage = Math.max(0, Math.min(100, budgetPercentage));

  return (
    <section className="mx-auto w-full max-w-[430px] pb-3">
      <header className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-[36px] font-extrabold leading-none tracking-tight text-[var(--foreground)]">
            Categorias
          </h1>
          <p className="mt-2 text-[16px] text-[var(--text-muted)]">
            Organize, controle e alcance seus objetivos.
          </p>
        </div>
        <Link
          href="/categorias/nova"
          aria-label="Nova categoria"
          className="grid h-[54px] w-[54px] shrink-0 place-items-center rounded-[17px] border border-[var(--orbit-primary)]/60 bg-[linear-gradient(145deg,#5b21b6_0%,#7c3aed_100%)] text-[22px] text-white shadow-[0_14px_32px_rgba(124,58,237,.28)]"
        >
          <FaPlus aria-hidden="true" />
        </Link>
      </header>

      {error && (
        <p
          role="alert"
          className="mt-4 rounded-[14px] border border-[var(--expense)]/35 bg-[var(--danger-subtle)] p-3 text-sm text-[var(--expense)]"
        >
          {error}
        </p>
      )}

      <section
        className="relative mt-6 overflow-hidden rounded-[26px] border border-[var(--orbit-primary)]/70 bg-[linear-gradient(145deg,color-mix(in_srgb,var(--orbit-primary)_45%,var(--surface))_0%,color-mix(in_srgb,#312e81_42%,var(--surface))_48%,color-mix(in_srgb,#111827_90%,var(--surface))_100%)] p-5 shadow-[0_20px_44px_color-mix(in_srgb,var(--orbit-primary)_18%,transparent)]"
        aria-label={`Resumo do orçamento em ${currency}`}
      >
        <div
          className="pointer-events-none absolute -right-16 -top-10 h-48 w-72 rounded-[48%] border border-[var(--orbit-primary)]/20 bg-[var(--orbit-primary)]/10 blur-[1px]"
          aria-hidden="true"
        />

        <div className="relative z-[1] flex items-start gap-3">
          <span className="grid h-[58px] w-[58px] shrink-0 place-items-center rounded-full border border-[var(--orbit-primary)]/50 bg-[var(--orbit-primary)]/15 text-[22px] text-[var(--orbit-primary)]">
            <FaChartPie aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-[21px] font-extrabold text-white">Orçamento mensal</h2>
            <p className="mt-0.5 text-sm text-white/65">Seu limite para viver bem</p>
          </div>

          <label className="relative inline-flex min-h-9 shrink-0 cursor-pointer items-center gap-2 px-1 text-xs font-semibold text-white/70">
            <FaCalendarAlt className="text-[15px]" aria-hidden="true" />
            {monthLabel(periodValue)}
            <FaChevronRight className="text-[10px]" aria-hidden="true" />
            <input
              type="month"
              value={periodValue}
              onChange={(event) => onPeriodChange(event.currentTarget.value)}
              disabled={controlsDisabled}
              aria-label="Mês de referência"
              className="absolute inset-0 cursor-pointer opacity-0"
            />
          </label>
        </div>

        <div className="relative z-[1] mt-7 flex items-end justify-between gap-4">
          <strong className="min-w-0 break-words text-[37px] font-extrabold leading-none tracking-tight text-white min-[390px]:text-[40px]">
            {loading ? '—' : displayMoney(budgetTotal, showValues, currency)}
          </strong>
          <span className="shrink-0 pb-1 text-[16px] font-bold text-white/70">
            <strong className="text-[21px] text-[var(--orbit-primary)]">
              {budgetPercentage.toLocaleString('pt-BR')}%
            </strong>{' '}
            utilizado
          </span>
        </div>

        <div className="relative z-[1] mt-4 h-3 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-[linear-gradient(90deg,#7c3aed_0%,#a855f7_100%)]"
            style={{ width: `${safePercentage}%` }}
          />
        </div>

        <div className="relative z-[1] mt-7 grid grid-cols-2 min-[390px]:grid-cols-[1fr_1fr_.82fr]">
          <div className="flex items-center gap-3 border-r border-white/15 pr-3">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#ec4899]/15 text-[#ec4899]">
              <FaArrowUp aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <strong className="block truncate text-[18px] font-extrabold text-white">
                {displayMoney(realizedTotal, showValues, currency)}
              </strong>
              <span className="mt-1 block text-sm text-white/60">Gasto</span>
            </div>
          </div>

          <div className="flex items-center gap-3 pl-4 min-[390px]:border-r min-[390px]:border-white/15 min-[390px]:pr-3">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-emerald-500/15 text-emerald-400">
              <FaArrowDown aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <strong className="block truncate text-[18px] font-extrabold text-white">
                {displayMoney(remainingTotal, showValues, currency)}
              </strong>
              <span className="mt-1 block text-sm text-white/60">Restante</span>
            </div>
          </div>

          <p className="hidden self-center pl-4 text-center text-[13px] italic leading-[1.35] text-[var(--orbit-primary)]/65 min-[390px]:block">
            Disciplina hoje,<br />liberdade amanhã.
          </p>
        </div>
      </section>

      <nav
        className="mt-5 grid grid-cols-3 rounded-[18px] border border-[var(--border)] bg-[var(--surface)] p-1.5"
        aria-label="Seções de categorias"
      >
        {[
          { key: 'categories' as const, label: 'Categorias', icon: <FaTag /> },
          { key: 'alerts' as const, label: 'Alertas', icon: <FaBell /> },
          { key: 'distribution' as const, label: 'Distribuição', icon: <FaChartPie /> },
        ].map((item) => {
          const active = tab === item.key;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => setTab(item.key)}
              aria-pressed={active}
              className={`flex min-h-[58px] items-center justify-center gap-2 rounded-[14px] px-2 text-[14px] font-bold transition-colors ${
                active
                  ? 'border border-[var(--orbit-primary)]/55 bg-[var(--orbit-primary-subtle)] text-[var(--orbit-primary)]'
                  : 'text-[var(--text-muted)]'
              }`}
            >
              <span className="text-[17px]" aria-hidden="true">
                {item.icon}
              </span>
              {item.label}
            </button>
          );
        })}
      </nav>

      {tab === 'categories' && (
        <div className="mt-5">
          <label className="flex min-h-[58px] items-center gap-3 rounded-[16px] border border-[var(--border-strong)] bg-[var(--surface)] px-4">
            <FaSearch className="shrink-0 text-[19px] text-[var(--text-muted)]" aria-hidden="true" />
            <input
              value={search}
              onChange={(event) => onSearchChange(event.currentTarget.value)}
              placeholder="Buscar categorias"
              aria-label="Buscar categorias"
              className="min-w-0 flex-1 bg-transparent text-[16px] text-[var(--foreground)] outline-none placeholder:text-[var(--text-subtle)]"
            />
            <button
              type="button"
              onClick={() => setFilterOpen(true)}
              aria-label="Filtrar categorias"
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-[15px] text-[var(--text-subtle)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]"
            >
              <FaFilter aria-hidden="true" />
            </button>
          </label>

          <div className="mt-5 space-y-3">
            {loading ? (
              <>
                <CategorySkeleton />
                <CategorySkeleton />
                <CategorySkeleton />
              </>
            ) : filteredExpenses.length === 0 && filteredIncome.length === 0 ? (
              <div className="rounded-[18px] border border-[var(--border)] bg-[var(--surface)] p-6 text-center">
                <p className="font-bold text-[var(--foreground)]">Nenhuma categoria nesta visão</p>
                <p className="mt-1 text-sm text-[var(--text-muted)]">
                  Ajuste a busca ou os filtros para ver outras categorias.
                </p>
              </div>
            ) : (
              <>
                {filteredExpenses.map((item) => (
                  <ExpenseCategoryCard
                    key={item.category.id}
                    item={item}
                    currency={currency}
                    showValues={showValues}
                    onOpen={() => {
                      setSelectedIncomeId(null);
                      setSelectedExpenseId(item.category.id);
                    }}
                  />
                ))}
                {filteredIncome.map((category) => (
                  <IncomeCategoryCard
                    key={category.id}
                    category={category}
                    onOpen={() => {
                      setSelectedExpenseId(null);
                      setSelectedIncomeId(category.id);
                    }}
                  />
                ))}
              </>
            )}
          </div>
        </div>
      )}

      {tab === 'alerts' && (
        <section className="mt-6" aria-labelledby="mobile-category-alerts">
          <div>
            <h2 id="mobile-category-alerts" className="text-[26px] font-extrabold text-[var(--foreground)]">
              Alertas
            </h2>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Categorias que chegaram a 80% ou mais do limite.
            </p>
          </div>

          <div className="mt-4 space-y-3">
            {criticalItems.length === 0 ? (
              <div className="rounded-[18px] border border-[var(--border)] bg-[var(--surface)] p-6 text-center">
                <p className="font-bold text-[var(--foreground)]">Tudo sob controle</p>
                <p className="mt-1 text-sm text-[var(--text-muted)]">
                  Nenhuma categoria está perto do limite neste período.
                </p>
              </div>
            ) : (
              criticalItems.map((item) => (
                <ExpenseCategoryCard
                  key={item.category.id}
                  item={item}
                  currency={currency}
                  showValues={showValues}
                  onOpen={() => setSelectedExpenseId(item.category.id)}
                />
              ))
            )}
          </div>
        </section>
      )}

      {tab === 'distribution' && (
        <section className="mt-6" aria-labelledby="mobile-category-distribution">
          <div>
            <h2 id="mobile-category-distribution" className="text-[26px] font-extrabold text-[var(--foreground)]">
              Distribuição
            </h2>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Veja onde seus gastos se concentraram neste período.
            </p>
          </div>

          <div className="mt-4 rounded-[22px] border border-[var(--border)] bg-[var(--surface)] p-5">
            {distribution.entries.length === 0 ? (
              <div className="py-7 text-center text-sm text-[var(--text-muted)]">
                Nenhum gasto concluído neste período.
              </div>
            ) : (
              <>
                <div className="mx-auto grid h-[220px] w-[220px] place-items-center rounded-full p-[24px]" style={{ background: distribution.gradient }}>
                  <div className="grid h-full w-full place-items-center rounded-full bg-[var(--surface)] text-center">
                    <div>
                      <strong className="block text-[32px] font-extrabold text-[var(--foreground)]">
                        {budgetPercentage.toLocaleString('pt-BR')}%
                      </strong>
                      <span className="mt-1 block text-[17px] font-bold text-[var(--foreground)]">
                        {displayMoney(realizedTotal, showValues, currency)}
                      </span>
                      <span className="mt-1 block text-xs text-[var(--text-muted)]">do orçamento</span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 space-y-3">
                  {distribution.entries.map((entry) => (
                    <div key={entry.id} className="grid grid-cols-[12px_minmax(0,1fr)_auto] items-center gap-3">
                      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: entry.color }} aria-hidden="true" />
                      <span className="truncate text-sm font-semibold text-[var(--foreground)]">{entry.name}</span>
                      <div className="text-right">
                        <strong className="block text-sm text-[var(--foreground)]">
                          {entry.percentage.toLocaleString('pt-BR')}%
                        </strong>
                        <span className="text-xs text-[var(--text-muted)]">
                          {displayMoney(entry.amount, showValues, currency)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </section>
      )}

      {filterOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end bg-[var(--overlay)] lg:hidden"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setFilterOpen(false);
          }}
        >
          <section className="w-full rounded-t-[28px] border-t border-[var(--border-strong)] bg-[var(--background)] px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4 shadow-[var(--shadow-elevated)]">
            <div className="mx-auto w-full max-w-[430px]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-extrabold text-[var(--foreground)]">Filtros</h2>
                  <p className="mt-1 text-sm text-[var(--text-muted)]">Refine as categorias exibidas.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setFilterOpen(false)}
                  aria-label="Fechar filtros"
                  className="grid h-11 w-11 place-items-center rounded-full bg-[var(--surface)] text-[var(--text-muted)]"
                >
                  <FaTimes aria-hidden="true" />
                </button>
              </div>

              <MobileFilterGroup
                label="Tipo"
                options={[
                  ['all', 'Todas'],
                  ['expense', 'Despesas'],
                  ['income', 'Receitas'],
                ]}
                value={typeFilter}
                onChange={(value) => onTypeFilterChange(value as CategoryTypeFilter)}
              />
              <MobileFilterGroup
                label="Status"
                options={[
                  ['all', 'Todos'],
                  ['critical', 'Críticas'],
                  ['ok', 'Dentro do limite'],
                  ['no-limit', 'Sem limite'],
                ]}
                value={statusFilter}
                onChange={(value) => onStatusFilterChange(value as CategoryStatusFilter)}
              />
              <MobileFilterGroup
                label="Limite"
                options={[
                  ['all', 'Todos'],
                  ['with-limit', 'Com limite'],
                  ['no-limit', 'Sem limite'],
                ]}
                value={limitScope}
                onChange={(value) => onLimitScopeChange(value as LimitScope)}
              />

              <fieldset className="mt-5">
                <legend className="mb-2 text-sm font-bold text-[var(--text-muted)]">Moeda</legend>
                <div className="grid grid-cols-3 gap-2">
                  {currencyOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => onCurrencyChange(option.value as SupportedCurrency)}
                      disabled={controlsDisabled}
                      aria-pressed={currency === option.value}
                      className={`min-h-11 rounded-[12px] border px-2 text-sm font-bold ${
                        currency === option.value
                          ? 'border-[var(--orbit-primary)] bg-[var(--orbit-primary-subtle)] text-[var(--orbit-primary)]'
                          : 'border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)]'
                      }`}
                    >
                      {option.value}
                    </button>
                  ))}
                </div>
              </fieldset>

              <button
                type="button"
                onClick={() => setFilterOpen(false)}
                className="mt-6 min-h-[56px] w-full rounded-full bg-[var(--orbit-primary)] px-4 text-base font-extrabold text-white"
              >
                Aplicar filtros
              </button>
            </div>
          </section>
        </div>
      )}

      {(selectedExpense || selectedIncome) && (
        <div
          className="fixed inset-0 z-50 flex items-end bg-[var(--overlay)] lg:hidden"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setSelectedExpenseId(null);
              setSelectedIncomeId(null);
              onCancelRemove();
            }
          }}
        >
          <section className="w-full rounded-t-[28px] border-t border-[var(--border-strong)] bg-[var(--background)] px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4 shadow-[var(--shadow-elevated)]">
            <div className="mx-auto w-full max-w-[430px]">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    className="grid h-14 w-14 shrink-0 place-items-center rounded-[16px] text-xl text-white"
                    style={{
                      backgroundColor:
                        selectedExpense?.category.color || selectedIncome?.color || '#64748B',
                    }}
                    aria-hidden="true"
                  >
                    <IconRenderer
                      iconName={
                        selectedExpense?.category.icon || selectedIncome?.icon || 'tag'
                      }
                      size={23}
                    />
                  </span>
                  <div className="min-w-0">
                    <h2 className="truncate text-xl font-extrabold text-[var(--foreground)]">
                      {selectedExpense?.category.name || selectedIncome?.name}
                    </h2>
                    <p className="mt-1 text-sm text-[var(--text-muted)]">
                      {selectedExpense ? 'Despesa' : 'Receita · Fora do orçamento'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedExpenseId(null);
                    setSelectedIncomeId(null);
                    onCancelRemove();
                  }}
                  aria-label="Fechar resumo da categoria"
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[var(--surface)] text-[var(--text-muted)]"
                >
                  <FaTimes aria-hidden="true" />
                </button>
              </div>

              {selectedExpense && (
                <>
                  <dl className="mt-5 grid grid-cols-3 gap-2">
                    <SheetMetric label="Limite" value={displayMoney(selectedExpense.limit?.amount ?? null, showValues, currency)} />
                    <SheetMetric label="Realizado" value={displayMoney(selectedExpense.realized, showValues, currency)} />
                    <SheetMetric
                      label="Restante"
                      value={displayMoney(selectedExpense.remaining, showValues, currency)}
                      className={(selectedExpense.remaining ?? 0) < 0 ? 'text-[var(--expense)]' : 'text-[var(--income)]'}
                    />
                  </dl>

                  <div className="mt-5 grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => onEditLimit(selectedExpense)}
                      disabled={mutationBusy}
                      className="min-h-[52px] rounded-[14px] border border-[var(--orbit-primary)] bg-[var(--orbit-primary-subtle)] px-3 text-sm font-bold text-[var(--orbit-primary)] disabled:opacity-50"
                    >
                      {selectedExpense.limit ? 'Editar limite' : 'Definir limite'}
                    </button>
                    <Link
                      href={`/transacoes?categoryId=${encodeURIComponent(selectedExpense.category.id)}`}
                      className="flex min-h-[52px] items-center justify-center rounded-[14px] border border-[var(--border)] bg-[var(--surface)] px-3 text-center text-sm font-bold text-[var(--foreground)]"
                    >
                      Ver transações
                    </Link>
                  </div>

                  <Link
                    href={`/categorias/show/${selectedExpense.category.id}`}
                    className="mt-2.5 flex min-h-[50px] items-center justify-center gap-2 rounded-[14px] border border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-bold text-[var(--foreground)]"
                  >
                    Abrir categoria
                    <FaChevronRight aria-hidden="true" />
                  </Link>

                  {selectedExpense.limit && (
                    <button
                      type="button"
                      onClick={() => void onRemoveLimit(selectedExpense)}
                      disabled={mutationBusy && removingCategoryId !== selectedExpense.category.id}
                      className="mt-2.5 min-h-[48px] w-full rounded-[14px] text-sm font-bold text-[var(--expense)] disabled:opacity-50"
                    >
                      {removingCategoryId === selectedExpense.category.id
                        ? 'Removendo...'
                        : confirmingRemoveId === selectedExpense.category.id
                          ? 'Confirmar remoção do limite'
                          : 'Remover limite'}
                    </button>
                  )}
                </>
              )}

              {selectedIncome && (
                <div className="mt-5 grid grid-cols-2 gap-2.5">
                  <Link
                    href={`/categorias/show/${selectedIncome.id}`}
                    className="flex min-h-[52px] items-center justify-center rounded-[14px] border border-[var(--orbit-primary)] bg-[var(--orbit-primary-subtle)] px-3 text-sm font-bold text-[var(--orbit-primary)]"
                  >
                    Abrir categoria
                  </Link>
                  <Link
                    href={`/transacoes?categoryId=${encodeURIComponent(selectedIncome.id)}`}
                    className="flex min-h-[52px] items-center justify-center rounded-[14px] border border-[var(--border)] bg-[var(--surface)] px-3 text-center text-sm font-bold text-[var(--foreground)]"
                  >
                    Ver transações
                  </Link>
                </div>
              )}
            </div>
          </section>
        </div>
      )}
    </section>
  );
}

function ExpenseCategoryCard({
  item,
  currency,
  showValues,
  onOpen,
}: {
  item: CategoryMonthlyLimitItem;
  currency: SupportedCurrency;
  showValues: boolean;
  onOpen: () => void;
}) {
  const percentage = item.percentage ?? 0;

  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-4 text-left transition-colors hover:bg-[var(--surface-hover)]"
    >
      <div className="grid grid-cols-[64px_minmax(0,1fr)_auto] items-center gap-3">
        <span
          className="grid h-16 w-16 place-items-center rounded-full border border-white/10 text-[24px] text-white"
          style={{ backgroundColor: `${item.category.color || '#64748B'}2b` }}
          aria-hidden="true"
        >
          <IconRenderer
            iconName={item.category.icon || 'tag'}
            size={25}
            color={item.category.color || '#64748B'}
          />
        </span>

        <div className="min-w-0">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <strong className="truncate text-[18px] font-extrabold text-[var(--foreground)]">
              {item.category.name}
            </strong>
            <span className="rounded-full border border-[var(--border)] bg-[var(--surface-raised)] px-2 py-1 text-[11px] font-semibold text-[var(--text-muted)]">
              Despesa
            </span>
          </div>

          <p className="mt-3 text-[16px] font-bold text-[var(--foreground)]">
            {displayMoney(item.realized, showValues, currency)}
            <span className="font-medium text-[var(--text-muted)]">
              {' '}/ {displayMoney(item.limit?.amount ?? null, showValues, currency)}
            </span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <strong className={`text-[18px] font-extrabold ${percentageClass(item)}`}>
            {item.limit ? `${percentage.toLocaleString('pt-BR')}%` : '—'}
          </strong>
          <FaChevronRight className="text-sm text-[var(--text-muted)]" aria-hidden="true" />
        </div>
      </div>

      <div className="ml-[76px] mt-4 h-2.5 overflow-hidden rounded-full bg-[var(--surface-subtle)]">
        {item.limit && (
          <div
            className={`h-full rounded-full ${barClass(item)}`}
            style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }}
          />
        )}
      </div>
    </button>
  );
}

function IncomeCategoryCard({
  category,
  onOpen,
}: {
  category: CategoryModel;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-4 text-left transition-colors hover:bg-[var(--surface-hover)]"
    >
      <div className="grid grid-cols-[64px_minmax(0,1fr)_auto] items-center gap-3">
        <span
          className="grid h-16 w-16 place-items-center rounded-full border border-emerald-500/30 bg-emerald-500/10 text-[24px]"
          aria-hidden="true"
        >
          <IconRenderer
            iconName={category.icon || 'income-up'}
            size={25}
            color={category.color || '#34d399'}
          />
        </span>

        <div className="min-w-0">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <strong className="truncate text-[18px] font-extrabold text-[var(--foreground)]">
              {category.name}
            </strong>
            <span className="inline-flex rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-400">
              Receita · Fora do orçamento
            </span>
          </div>
          {category.description && (
            <p className="mt-2 truncate text-sm text-[var(--text-muted)]">{category.description}</p>
          )}
        </div>

        <FaChevronRight className="text-sm text-[var(--text-muted)]" aria-hidden="true" />
      </div>
    </button>
  );
}

function CategorySkeleton() {
  return (
    <div className="h-[130px] animate-pulse rounded-[20px] border border-[var(--border)] bg-[var(--surface)]" />
  );
}

function MobileFilterGroup({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: Array<[string, string]>;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <fieldset className="mt-5">
      <legend className="mb-2 text-sm font-bold text-[var(--text-muted)]">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map(([optionValue, optionLabel]) => (
          <button
            key={optionValue}
            type="button"
            onClick={() => onChange(optionValue)}
            aria-pressed={value === optionValue}
            className={`min-h-10 rounded-full border px-3 text-sm font-semibold ${
              value === optionValue
                ? 'border-[var(--orbit-primary)] bg-[var(--orbit-primary-subtle)] text-[var(--orbit-primary)]'
                : 'border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)]'
            }`}
          >
            {optionLabel}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

function SheetMetric({
  label,
  value,
  className = 'text-[var(--foreground)]',
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className="rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-3">
      <dt className="text-[10px] text-[var(--text-muted)]">{label}</dt>
      <dd className={`mt-1 truncate text-sm font-extrabold ${className}`}>{value}</dd>
    </div>
  );
}
