'use client';

import { pageTitleClassName } from '@/app/components/base-pages/page-title';
import { ModalShell } from '@/app/components/overlays/modal-shell';
import { DEFAULT_CATEGORY_COLOR } from '@/app/lib/categories/default-color';
import Link from 'next/link';
import { useCallback, useMemo, useState } from 'react';
import {
  FaArrowDown,
  FaArrowUp,
  FaBell,
  FaCalendarAlt,
  FaCopy,
  FaChartPie,
  FaChevronRight,
  FaFilter,
  FaPlus,
  FaSearch,
  FaTag,
} from 'react-icons/fa';

import { Button, Chip, IconButton, IconRenderer, Input } from '@/app/components/ui';
import { currencyOptions } from '@/app/lib/constants/account.constants';
import {
  CategorySkeleton,
  ExpenseCategoryCard,
  IncomeCategoryCard,
  MobileFilterGroup,
  SheetMetric,
} from '@/app/components/pages/category/index/mobile-categories-center/mobile-categories-cards';
import {
  displayMoney,
  monthLabel,
  stateFor,
  usagePercentage,
} from '@/app/components/pages/category/index/mobile-categories-center/mobile-categories-helpers';
import type {
  CategoryMonthlyLimitItem,
  CategoryMonthlyLimitListResponse,
} from '@/app/types/category-monthly-limit';
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
  summary: CategoryMonthlyLimitListResponse['summary'];
  budgetPercentage: number;
  copying: boolean;
  onCopyPreviousMonth: () => void;
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
  summary,
  budgetPercentage,
  copying,
  onCopyPreviousMonth,
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
          if (
            statusFilter === 'critical' &&
            !item.isOverBudget &&
            (item.planningPercentage ?? 0) < 80
          )
            return false;
          if (statusFilter === 'ok' && stateFor(item) !== 'ok') return false;
          if (statusFilter === 'no-limit' && item.limit !== null) return false;
          if (limitScope === 'with-limit' && item.limit === null) return false;
          if (limitScope === 'no-limit' && item.limit !== null) return false;
          return true;
        })
        .sort((left, right) => {
          const leftUsage = left.limit ? usagePercentage(left) : -1;
          const rightUsage = right.limit ? usagePercentage(right) : -1;
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

  const closeFilters = useCallback(() => setFilterOpen(false), []);
  const closeSelectedCategory = useCallback(() => {
    if (mutationBusy) return;
    setSelectedExpenseId(null);
    setSelectedIncomeId(null);
    onCancelRemove();
  }, [mutationBusy, onCancelRemove]);

  const safePercentage = Math.max(0, Math.min(100, budgetPercentage));

  return (
    <section className="w-full pb-3">
      <header className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className={pageTitleClassName}>
            Categorias
          </h1>
          <p className="mt-2 text-[16px] text-[var(--text-muted)]">
            Organize, controle e alcance seus objetivos.
          </p>
        </div>
        <Link
          href="/categorias/nova"
          aria-label="Nova categoria"
          className="grid h-[54px] w-[54px] shrink-0 place-items-center rounded-[17px] border border-[var(--orbit-primary)]/60 bg-[linear-gradient(145deg,var(--orbit-primary-hover),var(--orbit-primary))] text-[22px] text-[var(--orbit-on-primary)] shadow-[var(--shadow-soft)]"
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
        className="relative mt-6 overflow-hidden rounded-[26px] border border-[var(--orbit-primary)]/70 bg-[linear-gradient(145deg,color-mix(in_srgb,var(--orbit-primary)_45%,var(--surface))_0%,color-mix(in_srgb,var(--orbit-primary)_14%,var(--surface))_48%,var(--surface-raised)_100%)] p-5 shadow-[0_20px_44px_color-mix(in_srgb,var(--orbit-primary)_18%,transparent)]"
        aria-label={`Resumo do orçamento em ${currency}`}
      >
        <div
          className="pointer-events-none absolute -right-16 -top-10 h-48 w-72 rounded-[48%] border border-[var(--orbit-primary)]/20 bg-[var(--orbit-primary)]/10 blur-[1px]"
          aria-hidden="true"
        />

        <div className="relative z-[1] flex flex-wrap items-start gap-x-3 gap-y-1">
          <span className="grid h-[58px] w-[58px] shrink-0 place-items-center rounded-full border border-[var(--orbit-primary)]/50 bg-[var(--orbit-primary)]/15 text-[22px] text-[var(--orbit-primary)]">
            <FaChartPie aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-[21px] font-extrabold text-[var(--foreground)]">Orçamento mensal</h2>
            <p className="mt-0.5 text-sm text-[var(--text-muted)]">Seu limite para viver bem</p>
          </div>

          <label className="relative inline-flex min-h-11 basis-full cursor-pointer items-center gap-2 px-1 text-xs font-semibold text-[var(--text-muted)] sm:min-h-9 sm:shrink-0 sm:basis-auto">
            <FaCalendarAlt className="text-[15px]" aria-hidden="true" />
            {monthLabel(periodValue)}
            <FaChevronRight className="text-xs" aria-hidden="true" />
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

        <div className="relative z-[1] mt-7 flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
          <strong className="min-w-0 break-words text-[28px] font-extrabold min-[360px]:text-[32px] sm:text-[40px] leading-none tracking-tight text-[var(--foreground)]">
            {loading ? '—' : displayMoney(summary.budget, showValues, currency)}
          </strong>
          <span className="shrink-0 pb-1 text-[16px] font-bold text-[var(--text-muted)]">
            <strong className="text-[21px] text-[var(--orbit-primary)]">
              {budgetPercentage.toLocaleString('pt-BR')}%
            </strong>{' '}
            utilizado
          </span>
        </div>

        <div
          role="progressbar"
          aria-label="Orçamento mensal utilizado"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(safePercentage)}
          className="relative z-[1] mt-4 h-3 overflow-hidden rounded-full bg-[var(--surface-subtle)]"
        >
          <div
            className="h-full rounded-full bg-[var(--orbit-primary)]"
            style={{ width: `${safePercentage}%` }}
          />
        </div>

        <div className="relative z-[1] mt-7 grid grid-cols-2 sm:grid-cols-[1fr_1fr_.82fr]">
          <div className="flex min-w-0 items-center gap-3 border-r border-[var(--border)] pr-3">
            <span className="hidden h-12 w-12 shrink-0 place-items-center rounded-full bg-[var(--warning)]/15 text-[var(--warning)] min-[360px]:grid">
              <FaArrowUp aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <strong className="block tabular-nums text-[18px] font-extrabold text-[var(--foreground)]">
                <span className="money">{displayMoney(summary.realized, showValues, currency)}</span>
              </strong>
              <span className="mt-1 block text-sm text-[var(--text-muted)]">Realizado</span>
            </div>
          </div>

          <div className="flex items-center gap-3 pl-3 min-[360px]:pl-4 sm:border-r sm:border-[var(--border)] sm:pr-3">
            <span className="hidden h-12 w-12 shrink-0 place-items-center rounded-full bg-[var(--income)]/15 text-[var(--income)] min-[360px]:grid">
              <FaArrowDown aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <strong className="block tabular-nums text-[18px] font-extrabold text-[var(--foreground)]">
                <span className="money">{displayMoney(summary.available, showValues, currency)}</span>
              </strong>
              <span className="mt-1 block text-sm text-[var(--text-muted)]">Disponível</span>
            </div>
          </div>

          <div className="col-span-2 mt-3 flex items-center justify-between border-t border-[var(--border)] pt-3 sm:col-span-1 sm:mt-0 sm:block sm:self-center sm:border-0 sm:pl-4 sm:pt-0 sm:text-right">
            <strong className="block text-sm text-[var(--foreground)]">
              <span className="money">{displayMoney(summary.committed, showValues, currency)}</span>
            </strong>
            <span className="text-xs text-[var(--text-muted)]">comprometido</span>
          </div>
        </div>
        <div className="relative z-[1] mt-4 grid grid-cols-2 gap-2">
          <div className="rounded-[12px] bg-[var(--surface-subtle)] px-3 py-2">
            <span className="block text-xs text-[var(--text-muted)]">Receita esperada</span>
            <strong className="mt-1 block text-sm text-[var(--foreground)]">
              <span className="money">{displayMoney(summary.expectedIncome, showValues, currency)}</span>
            </strong>
          </div>
          <Button
            variant="outline"
            className="col-span-2"
            onClick={onCopyPreviousMonth}
            disabled={controlsDisabled || copying}
            icon={<FaCopy aria-hidden="true" />}
          >
            {copying ? 'Copiando...' : 'Copiar mês anterior'}
          </Button>
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
            <Input
              bare
              value={search}
              onChange={(event) => onSearchChange(event.currentTarget.value)}
              placeholder="Buscar categorias"
              aria-label="Buscar categorias"
              className="min-h-11 text-[16px] placeholder:text-[var(--text-subtle)]"
            />
            <IconButton
              label="Filtrar categorias"
              icon={<FaFilter />}
              onClick={() => setFilterOpen(true)}
              className="rounded-full text-[15px]"
            />
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
                        <span className="money">{displayMoney(summary.realized, showValues, currency)}</span>
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
                          <span className="money">{displayMoney(entry.amount, showValues, currency)}</span>
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
        <ModalShell
          title="Filtros"
          description="Refine as categorias exibidas."
          closeLabel="Fechar filtros"
          onClose={closeFilters}
          footer={
            <Button size="cta" pill fullWidth onClick={() => setFilterOpen(false)}>
              Aplicar filtros
            </Button>
          }
        >
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
            <Chip
              key={option.value}
              selected={currency === option.value}
              disabled={controlsDisabled}
              onClick={() => onCurrencyChange(option.value as SupportedCurrency)}
              className="w-full"
            >
              {option.value}
            </Chip>
          ))}
        </div>
      </fieldset>
        </ModalShell>
      )}

      {(selectedExpense || selectedIncome) && (
        <ModalShell
          title={selectedExpense?.category.name || selectedIncome?.name || ''}
          description={selectedExpense ? 'Despesa' : 'Receita · Fora do orçamento'}
          closeLabel="Fechar resumo da categoria"
                    onClose={closeSelectedCategory}
          closeDisabled={mutationBusy}
          icon={
            <span
              className="grid h-14 w-14 place-items-center rounded-[16px] text-xl text-white"
              style={{
                backgroundColor:
                  selectedExpense?.category.color || selectedIncome?.color || DEFAULT_CATEGORY_COLOR,
              }}
            >
              <IconRenderer
                iconName={selectedExpense?.category.icon || selectedIncome?.icon || 'tag'}
                size={23}
              />
            </span>
          }
        >
      {selectedExpense && (
        <>
          <dl className="mt-5 grid grid-cols-2 gap-2">
            <SheetMetric label="Orçado" value={displayMoney(selectedExpense.limit?.amount ?? null, showValues, currency)} />
            <SheetMetric label="Realizado" value={displayMoney(selectedExpense.realized, showValues, currency)} />
            <SheetMetric label="Comprometido" value={displayMoney(selectedExpense.committed, showValues, currency)} />
            <SheetMetric
              label="Disponível"
              value={displayMoney(selectedExpense.available, showValues, currency)}
              className={(selectedExpense.available ?? 0) < 0 ? 'text-[var(--expense)]' : 'text-[var(--income)]'}
            />
          </dl>

          <div className="mt-5 grid grid-cols-2 gap-2.5">
            <Button variant="outline" onClick={() => onEditLimit(selectedExpense)} disabled={mutationBusy}>
              {selectedExpense.limit ? 'Editar limite' : 'Definir limite'}
            </Button>
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
            <Button
              variant="ghost"
              fullWidth
              className="mt-2.5 text-[var(--expense)]"
              onClick={() => void onRemoveLimit(selectedExpense)}
              disabled={mutationBusy && removingCategoryId !== selectedExpense.category.id}
            >
              {removingCategoryId === selectedExpense.category.id
                ? 'Removendo...'
                : confirmingRemoveId === selectedExpense.category.id
                  ? 'Confirmar remoção do limite'
                  : 'Remover limite'}
            </Button>
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
        </ModalShell>
      )}
    </section>
  );
}
