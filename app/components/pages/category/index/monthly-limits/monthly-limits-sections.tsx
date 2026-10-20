'use client';

import Link from 'next/link';
import { wrappableMoney } from '@/app/lib/currency/wrappable-money';
import { DEFAULT_CATEGORY_COLOR } from '@/app/lib/categories/default-color';
import { ModalShell } from '@/app/components/overlays/modal-shell';
import { FormEvent, ReactNode, useCallback } from 'react';
import { FaBell, FaChartBar, FaChartPie, FaCheck, FaChevronRight, FaCog, FaEllipsisH, FaExclamationTriangle, FaList, FaPencilAlt, FaPlus, FaSearch, FaTrashAlt, FaWallet } from 'react-icons/fa';
import { Button, IconRenderer, Input, Select } from '@/app/components/ui';
import { CategoryMonthlyLimitItem } from '@/app/types/category-monthly-limit';
import { CategoryModel } from '@/app/types/category';
import { SupportedCurrency } from '@/app/types/financial-summary';
import { CategoryStatusFilter, CategoryTypeFilter, LimitScope, PageSection, buildDistribution, categoryState, categoryUsageLabel, categoryUsagePercentage, displayMoney, stateBadgeClass, stateBarClass, stateLabel, stateTextClass } from '@/app/components/pages/category/index/monthly-limits/monthly-limits-helpers';

export function BudgetOverviewStrip({
  loading,
  budgetTotal,
  realizedTotal,
  committedTotal,
  availableTotal,
  expectedIncome,
  criticalCount,
  budgetPercentage,
  limitedCount,
  currency,
  showValues,
}: {
  loading: boolean;
  budgetTotal: number;
  realizedTotal: number;
  committedTotal: number;
  availableTotal: number;
  expectedIncome: number;
  criticalCount: number;
  budgetPercentage: number;
  limitedCount: number;
  currency: SupportedCurrency;
  showValues: boolean;
}) {
  return (
    <section
      className="mt-4 grid overflow-hidden rounded-[16px] border border-[var(--border)] bg-[var(--surface)] sm:grid-cols-2 xl:grid-cols-6"
      aria-label={`Resumo do planejamento em ${currency}`}
    >
      <OverviewMetric
        icon={<FaWallet />}
        label="Orçamento"
        value={displayMoney(budgetTotal, showValues, currency)}
        note={`em ${limitedCount} categorias com limite`}
        tone="text-[var(--foreground)]"
        loading={loading}
      />
      <OverviewMetric
        icon={<FaChartBar />}
        label="Realizado"
        value={displayMoney(realizedTotal, showValues, currency)}
        note="despesas concluídas"
        tone="text-[var(--orbit-primary)]"
        loading={loading}
      />
      <OverviewMetric
        icon={<FaBell />}
        label="Comprometido"
        value={displayMoney(committedTotal, showValues, currency)}
        note="despesas pendentes"
        tone="text-[var(--warning)]"
        loading={loading}
      />
      <OverviewMetric
        icon={<FaChartPie />}
        label="Disponível"
        value={displayMoney(availableTotal, showValues, currency)}
        note={`${budgetPercentage.toLocaleString('pt-BR')}% já consumido`}
        tone={availableTotal < 0 ? 'text-[var(--expense)]' : 'text-[var(--income)]'}
        loading={loading}
      />
      <OverviewMetric
        icon={<FaPlus />}
        label="Receita esperada"
        value={displayMoney(expectedIncome, showValues, currency)}
        note="receitas pendentes no período"
        tone="text-[var(--income)]"
        loading={loading}
      />
      <OverviewMetric
        icon={<FaExclamationTriangle />}
        label="Acima do orçamento"
        value={String(criticalCount)}
        note="categorias excedidas"
        tone={criticalCount ? 'text-[var(--expense)]' : 'text-[var(--foreground)]'}
        loading={loading}
      />
    </section>
  );
}

export function OverviewMetric({
  icon,
  label,
  value,
  note,
  tone,
  loading,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  note: string;
  tone: string;
  loading: boolean;
}) {
  return (
    <article className="flex gap-3 border-b border-[var(--border)] p-4 sm:border-r xl:border-b-0">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[11px] bg-[var(--orbit-primary-subtle)] text-[var(--orbit-primary)]">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-xs font-medium text-[var(--text-muted)]">{label}</p>
        {loading ? (
          <div className="mt-2 h-6 w-28 animate-pulse rounded bg-[var(--skeleton)]" />
        ) : (
          <strong className={`mt-1 block tabular-nums text-xl font-bold ${tone}`}>{wrappableMoney(value)}</strong>
        )}
        <small className="mt-1 block truncate text-xs text-[var(--text-muted)]">{note}</small>
      </div>
    </article>
  );
}

export function PageSectionTabs({
  active,
  onJump,
}: {
  active: PageSection;
  onJump: (section: PageSection, elementId: string) => void;
}) {
  const tabs: Array<{ key: PageSection; label: string; icon: ReactNode; target: string }> = [
    { key: 'overview', label: 'Visão geral', icon: <FaChartPie />, target: 'categories-overview' },
    { key: 'categories', label: 'Categorias', icon: <FaList />, target: 'categories-table' },
    { key: 'alerts', label: 'Alertas', icon: <FaBell />, target: 'category-alerts' },
    { key: 'admin', label: 'Administração', icon: <FaCog />, target: 'limit-administration' },
  ];

  return (
    <nav className="mt-4 flex max-w-full gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" aria-label="Seções de categorias e limites">
      {tabs.map((tab) => {
        const selected = active === tab.key;
        return (
          <button
            key={tab.key}
            type="button"
            aria-pressed={selected}
            onClick={() => onJump(tab.key, tab.target)}
            className={`inline-flex min-h-10 shrink-0 items-center gap-2 rounded-[10px] border px-3.5 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)] ${
              selected
                ? 'border-[var(--orbit-primary)] bg-[var(--orbit-primary-subtle)] text-[var(--orbit-primary)]'
                : 'border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        );
      })}
    </nav>
  );
}

export function CategoryTable({
  expenses,
  income,
  count,
  search,
  onSearchChange,
  categoriesLoading,
  typeFilter,
  onTypeFilterChange,
  statusFilter,
  onStatusFilterChange,
  limitScope,
  onLimitScopeChange,
  currency,
  showValues,
  selectedCategoryId,
  onSelectExpense,
}: {
  expenses: CategoryMonthlyLimitItem[];
  income: CategoryModel[];
  count: number;
  search: string;
  onSearchChange: (search: string) => void;
  categoriesLoading: boolean;
  typeFilter: CategoryTypeFilter;
  onTypeFilterChange: (value: CategoryTypeFilter) => void;
  statusFilter: CategoryStatusFilter;
  onStatusFilterChange: (value: CategoryStatusFilter) => void;
  limitScope: LimitScope;
  onLimitScopeChange: (value: LimitScope) => void;
  currency: SupportedCurrency;
  showValues: boolean;
  selectedCategoryId: string | null;
  onSelectExpense: (categoryId: string) => void;
}) {
  return (
    <article
      id="categories-table"
      className="scroll-mt-4 flex flex-col rounded-[18px] border border-[var(--border)] bg-[var(--surface)] p-3.5 sm:p-4 xl:h-[584px]"
      aria-labelledby="categories-table-title"
    >
      <header className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <h2 id="categories-table-title" className="text-lg font-bold text-[var(--foreground)]">Suas categorias</h2>
          <p className="mt-1 text-xs text-[var(--text-muted)]">Acompanhe o uso dos limites e gerencie seus orçamentos.</p>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-[180px_125px_135px_auto_auto]">
          <Input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Buscar categoria..."
            aria-label="Buscar categoria"
            icon={<FaSearch />}
            disabled={categoriesLoading}
          />
          <Select
            ariaLabel="Filtrar por tipo"
            value={typeFilter}
            options={[
              { value: 'all', label: 'Todos os tipos' },
              { value: 'expense', label: 'Despesas' },
              { value: 'income', label: 'Receitas' },
            ]}
            onChange={(value) => onTypeFilterChange(value as CategoryTypeFilter)}
          />
          <Select
            ariaLabel="Filtrar por status"
            value={statusFilter}
            options={[
              { value: 'all', label: 'Todos os status' },
              { value: 'critical', label: 'Críticas' },
              { value: 'ok', label: 'Dentro do limite' },
              { value: 'no-limit', label: 'Sem limite' },
            ]}
            onChange={(value) => onStatusFilterChange(value as CategoryStatusFilter)}
          />
          <FilterToggle
            active={limitScope === 'with-limit'}
            onClick={() => onLimitScopeChange(limitScope === 'with-limit' ? 'all' : 'with-limit')}
          >
            Com limite
          </FilterToggle>
          <FilterToggle
            active={limitScope === 'no-limit'}
            onClick={() => onLimitScopeChange(limitScope === 'no-limit' ? 'all' : 'no-limit')}
          >
            Sem limite
          </FilterToggle>
        </div>
      </header>

      {count === 0 ? (
        <p className="py-12 text-center text-sm text-[var(--text-muted)]">Nenhuma categoria nesta visão.</p>
      ) : (
        <div className="mt-3 min-h-0 flex-1 overflow-auto [scrollbar-width:thin]">
          <div className="min-w-[860px]">
            <div className="sticky top-0 z-10 grid grid-cols-[1.55fr_.65fr_1fr_1.05fr_.8fr_.9fr_.9fr_48px] items-center gap-3 border-y border-[var(--border)] bg-[var(--surface)] px-2 py-2 text-xs font-semibold uppercase tracking-[0.05em] text-[var(--text-subtle)]">
              <span>Categoria</span>
              <span>Tipo</span>
              <span>Status</span>
              <span>Uso do limite</span>
              <span>Realizado</span>
              <span>Limite mensal</span>
              <span>Restante</span>
              <span>Ações</span>
            </div>

            <div className="divide-y divide-[var(--border)]">
              {expenses.map((item) => (
                <ExpenseCategoryRow
                  key={item.category.id}
                  item={item}
                  currency={currency}
                  showValues={showValues}
                  selected={item.category.id === selectedCategoryId}
                  onSelect={() => onSelectExpense(item.category.id)}
                />
              ))}
              {income.map((category) => (
                <IncomeCategoryRow key={category.id} category={category} />
              ))}
            </div>
          </div>
        </div>
      )}
    </article>
  );
}

export function FilterToggle({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`min-h-10 rounded-[9px] border px-3 text-xs font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)] ${
        active
          ? 'border-[var(--orbit-primary)] bg-[var(--orbit-primary-subtle)] text-[var(--orbit-primary)]'
          : 'border-[var(--border)] bg-[var(--surface-raised)] text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]'
      }`}
    >
      {children}
    </button>
  );
}

export function ExpenseCategoryRow({
  item,
  currency,
  showValues,
  selected,
  onSelect,
}: {
  item: CategoryMonthlyLimitItem;
  currency: SupportedCurrency;
  showValues: boolean;
  selected: boolean;
  onSelect: () => void;
}) {
  const state = categoryState(item);
  const percentage = categoryUsagePercentage(item);

  return (
    <div
      className={`grid min-h-[46px] grid-cols-[1.55fr_.65fr_1fr_1.05fr_.8fr_.9fr_.9fr_48px] items-center gap-3 px-2 py-1.5 transition-colors ${
        selected ? 'bg-[var(--orbit-primary-subtle)]' : 'hover:bg-[var(--surface-hover)]'
      }`}
    >
      <button type="button" onClick={onSelect} className="flex min-w-0 items-center gap-2.5 text-left">
        <span
          className="grid h-8 w-8 shrink-0 place-items-center rounded-[9px] text-white"
          style={{ backgroundColor: item.category.color || DEFAULT_CATEGORY_COLOR }}
          aria-hidden="true"
        >
          <IconRenderer iconName={item.category.icon || 'tag'} size={14} />
        </span>
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-1.5">
            <p className="truncate text-sm font-semibold text-[var(--foreground)]">{item.category.name}</p>
            {!item.category.isActive && (
              <span className="shrink-0 rounded-full border border-[var(--border-strong)] bg-[var(--surface-subtle)] px-1.5 py-0.5 text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">
                Inativa
              </span>
            )}
          </div>
          <small className="text-xs text-[var(--text-muted)]">Despesa</small>
        </div>
      </button>

      <span className="w-fit rounded-full border border-[var(--border)] bg-[var(--surface-raised)] px-2 py-1 text-xs font-semibold text-[var(--text-muted)]">
        Despesa
      </span>

      <span className={`w-fit rounded-full border px-2 py-1 text-xs font-semibold ${stateBadgeClass(state)}`}>
        {stateLabel(state)}
      </span>

      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <strong className={`w-12 shrink-0 text-xs ${stateTextClass(state)}`}>
            {categoryUsageLabel(item)}
          </strong>
          <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-[var(--surface-subtle)]">
            {item.limit && (
              <div
                className={`h-full rounded-full ${stateBarClass(state)}`}
                style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }}
              />
            )}
          </div>
        </div>
      </div>

      <span className="text-xs font-semibold text-[var(--foreground)]">{displayMoney(item.realized, showValues, currency)}</span>
      <span className="text-xs text-[var(--foreground)]">{displayMoney(item.limit?.amount ?? null, showValues, currency)}</span>
      <span className={`text-xs font-semibold ${(item.remaining ?? 0) < 0 ? 'text-[var(--expense)]' : item.remaining === null ? 'text-[var(--text-muted)]' : 'text-[var(--income)]'}`}>
        {displayMoney(item.remaining, showValues, currency)}
      </span>

      <button
        type="button"
        onClick={onSelect}
        aria-label={`Abrir detalhes de ${item.category.name}`}
        className="grid h-8 w-8 place-items-center rounded-[8px] border border-[var(--border)] bg-[var(--surface-raised)] text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]"
      >
        <FaEllipsisH aria-hidden="true" />
      </button>
    </div>
  );
}

export function IncomeCategoryRow({ category }: { category: CategoryModel }) {
  return (
    <div className="grid min-h-[46px] grid-cols-[1.55fr_.65fr_1fr_1.05fr_.8fr_.9fr_.9fr_48px] items-center gap-3 px-2 py-1.5 hover:bg-[var(--surface-hover)]">
      <div className="flex min-w-0 items-center gap-2.5">
        <span
          className="grid h-8 w-8 shrink-0 place-items-center rounded-[9px] text-white"
          style={{ backgroundColor: category.color || DEFAULT_CATEGORY_COLOR }}
          aria-hidden="true"
        >
          <IconRenderer iconName={category.icon || 'tag'} size={14} />
        </span>
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-1.5">
            <p className="truncate text-sm font-semibold text-[var(--foreground)]">{category.name}</p>
            {!category.isActive && (
              <span className="shrink-0 rounded-full border border-[var(--border-strong)] bg-[var(--surface-subtle)] px-1.5 py-0.5 text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">
                Inativa
              </span>
            )}
          </div>
          <small className="text-xs text-[var(--income)]">Receita</small>
        </div>
      </div>
      <span className="w-fit rounded-full border border-[var(--income)]/20 bg-[var(--primary-subtle)] px-2 py-1 text-xs font-semibold text-[var(--income)]">Receita</span>
      <span className="text-xs text-[var(--text-muted)]">Fora do orçamento</span>
      <span className="text-xs text-[var(--text-muted)]">—</span>
      <span className="text-xs text-[var(--text-muted)]">—</span>
      <span className="text-xs text-[var(--text-muted)]">Sem limite</span>
      <span className="text-xs text-[var(--text-muted)]">—</span>
      <Link
        href={`/categorias/alterar/${category.id}`}
        aria-label={`Editar ${category.name}`}
        className="grid h-8 w-8 place-items-center rounded-[8px] border border-[var(--border)] bg-[var(--surface-raised)] text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]"
      >
        <FaEllipsisH aria-hidden="true" />
      </Link>
    </div>
  );
}

export function DistributionCard({
  distribution,
  realizedTotal,
  currency,
  showValues,
}: {
  distribution: ReturnType<typeof buildDistribution>;
  realizedTotal: number;
  currency: SupportedCurrency;
  showValues: boolean;
}) {
  return (
    <article className="rounded-[18px] border border-[var(--border)] bg-[var(--surface)] p-4" aria-labelledby="distribution-title">
      <h2 id="distribution-title" className="text-base font-bold text-[var(--foreground)]">Distribuição dos gastos</h2>

      <div className="mt-4 grid grid-cols-[146px_minmax(0,1fr)] items-center gap-4">
        <div
          className="relative h-[146px] w-[146px] rounded-full"
          style={{ background: distribution.gradient }}
          role="img"
          aria-label="Distribuição dos gastos por categoria"
        >
          <div className="absolute inset-[23px] grid place-content-center rounded-full bg-[var(--surface)] text-center">
            <strong className="text-sm text-[var(--foreground)]">{displayMoney(realizedTotal, showValues, currency)}</strong>
            <span className="mt-1 text-xs text-[var(--text-muted)]">Total no mês</span>
          </div>
        </div>

        <div className="space-y-2">
          {distribution.entries.length === 0 ? (
            <p className="text-xs text-[var(--text-muted)]">Nenhum gasto concluído neste período.</p>
          ) : (
            distribution.entries.map((entry) => (
              <div key={entry.id} className="grid grid-cols-[10px_minmax(0,1fr)_auto] items-center gap-2 text-xs">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: entry.color }} aria-hidden="true" />
                <span className="truncate text-[var(--foreground)]">{entry.name}</span>
                <strong className="text-[var(--foreground)]">{entry.percentage.toLocaleString('pt-BR')}%</strong>
              </div>
            ))
          )}
        </div>
      </div>
    </article>
  );
}

export function CriticalCategories({
  items,
  selectedCategoryId,
  onSelect,
  currency,
  showValues,
  onShowAll,
}: {
  items: CategoryMonthlyLimitItem[];
  selectedCategoryId: string | null;
  onSelect: (categoryId: string) => void;
  currency: SupportedCurrency;
  showValues: boolean;
  onShowAll: () => void;
}) {
  return (
    <article id="category-alerts" className="scroll-mt-4 rounded-[18px] border border-[var(--border)] bg-[var(--surface)] p-4" aria-labelledby="critical-categories-title">
      <div className="flex items-center justify-between gap-3">
        <h2 id="critical-categories-title" className="flex items-center gap-2 text-base font-bold text-[var(--foreground)]">
          <FaExclamationTriangle className={items.length ? 'text-[var(--expense)]' : 'text-[var(--text-muted)]'} aria-hidden="true" />
          Categorias críticas
        </h2>
        <button
          type="button"
          onClick={onShowAll}
          className="rounded-[8px] border border-[var(--border)] bg-[var(--surface-raised)] px-2.5 py-2 text-xs font-semibold text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]"
        >
          Ver todas ({items.length})
        </button>
      </div>

      {items.length === 0 ? (
        <p className="mt-3 text-sm text-[var(--text-muted)]">Nenhuma categoria chegou a 80% do limite.</p>
      ) : (
        <div className="mt-3 grid gap-2">
          {items.slice(0, 3).map((item) => {
            const selected = item.category.id === selectedCategoryId;
            const percentage = categoryUsagePercentage(item);
            const state = categoryState(item);
            return (
              <button
                key={item.category.id}
                type="button"
                onClick={() => onSelect(item.category.id)}
                aria-pressed={selected}
                className={`rounded-xl border p-3 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)] ${
                  selected
                    ? 'border-[var(--orbit-primary)] bg-[var(--orbit-primary-subtle)]'
                    : 'border-[var(--border)] bg-[var(--surface-raised)] hover:bg-[var(--surface-hover)]'
                }`}
              >
                <div className="grid grid-cols-[36px_minmax(0,1fr)_auto_14px] items-center gap-2.5">
                  <span
                    className="grid h-9 w-9 place-items-center rounded-[9px] text-white"
                    style={{ backgroundColor: item.category.color || DEFAULT_CATEGORY_COLOR }}
                    aria-hidden="true"
                  >
                    <IconRenderer iconName={item.category.icon || 'tag'} size={14} />
                  </span>
                  <div className="min-w-0">
                    <span className="block truncate text-sm font-bold text-[var(--foreground)]">{item.category.name}</span>
                    <small className="mt-0.5 block text-xs text-[var(--text-muted)]">
                      {displayMoney(item.realized, showValues, currency)} / {displayMoney(item.limit?.amount ?? null, showValues, currency)}
                    </small>
                  </div>
                  <strong className={stateTextClass(state)}>{categoryUsageLabel(item)}</strong>
                  <FaChevronRight className="text-xs text-[var(--text-muted)]" aria-hidden="true" />
                </div>
                <div className="mt-2 h-[7px] overflow-hidden rounded-full bg-[var(--surface-subtle)]">
                  <div
                    className={`h-full rounded-full ${stateBarClass(state)}`}
                    style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }}
                  />
                </div>
              </button>
            );
          })}
        </div>
      )}
    </article>
  );
}

export function CategoryContext({
  item,
  currency,
  showValues,
  mutationBusy,
  onEdit,
}: {
  item: CategoryMonthlyLimitItem | null;
  currency: SupportedCurrency;
  showValues: boolean;
  mutationBusy: boolean;
  onEdit: (item: CategoryMonthlyLimitItem) => void;
}) {
  if (!item) {
    return (
      <article id="category-context" className="scroll-mt-4 rounded-[18px] border border-[var(--border)] bg-[var(--surface)] p-4">
        <p className="text-sm text-[var(--text-muted)]">Selecione uma categoria para abrir o resumo.</p>
      </article>
    );
  }

  const percentage = categoryUsagePercentage(item);
  const state = categoryState(item);

  return (
    <article id="category-context" className="scroll-mt-4 rounded-[18px] border border-[var(--border)] bg-[var(--surface)] p-4" aria-labelledby="category-detail-title">
      <h2 className="text-base font-bold text-[var(--foreground)]">Resumo da categoria selecionada</h2>

      <div className="mt-3 flex items-start gap-3">
        <span
          className="grid h-10 w-10 shrink-0 place-items-center rounded-[11px] text-white"
          style={{ backgroundColor: item.category.color || DEFAULT_CATEGORY_COLOR }}
          aria-hidden="true"
        >
          <IconRenderer iconName={item.category.icon || 'tag'} size={17} />
        </span>
        <div className="min-w-0 flex-1">
          <h3 id="category-detail-title" className="truncate text-base font-bold text-[var(--foreground)]">{item.category.name}</h3>
          <p className="mt-0.5 text-xs text-[var(--text-muted)]">Despesa · Limite mensal</p>
        </div>
      </div>

      <dl className="my-4 grid grid-cols-2 gap-2 xl:grid-cols-4">
        <ContextMetric label="Orçado" value={displayMoney(item.limit?.amount ?? null, showValues, currency)} />
        <ContextMetric label="Realizado" value={displayMoney(item.realized, showValues, currency)} />
        <ContextMetric label="Comprometido" value={displayMoney(item.committed, showValues, currency)} />
        <ContextMetric
          label="Disponível"
          value={displayMoney(item.available, showValues, currency)}
          className={(item.available ?? 0) < 0 ? 'text-[var(--expense)]' : 'text-[var(--income)]'}
        />
      </dl>

      {item.limit && (
        <>
          <div className="h-[7px] overflow-hidden rounded-full bg-[var(--surface-subtle)]">
            <div
              className={`h-full rounded-full ${stateBarClass(state)}`}
              style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-[var(--text-muted)]">
            {item.limit.amount === 0 && item.isOverBudget
              ? 'Orçamento zerado: qualquer consumo excede o limite.'
              : `${percentage.toLocaleString('pt-BR')}% do orçamento consumido entre realizado e comprometido`}
          </p>
          {item.isOverBudget && (
            <p className="mt-2 font-semibold text-[var(--expense)]">
              Orçamento excedido em {displayMoney(Math.abs(item.available ?? 0), showValues, currency)}.
            </p>
          )}
        </>
      )}

      <div className="mt-4 grid grid-cols-2 gap-2">
        <Button
          size="sm"
          variant="secondary"
          icon={<FaPencilAlt />}
          onClick={() => onEdit(item)}
          disabled={mutationBusy || (!item.category.isActive && !item.limit)}
        >
          {item.limit ? 'Editar limite' : 'Definir limite'}
        </Button>
        <Button
          as="a"
          href={`/transacoes?categoryId=${encodeURIComponent(item.category.id)}`}
          size="sm"
          variant="secondary"
        >
          Ver transações
        </Button>
      </div>
    </article>
  );
}

export function ContextMetric({
  label,
  value,
  className = 'text-[var(--foreground)]',
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className="rounded-[10px] border border-[var(--border)] bg-[var(--surface-raised)] p-2.5">
      <dt className="text-xs text-[var(--text-muted)]">{label}</dt>
      <dd className={`mt-1 text-xs font-bold sm:text-sm ${className}`}>{value}</dd>
    </div>
  );
}

export function LimitAdministration({
  items,
  currency,
  showValues,
  mutationBusy,
  removingCategoryId,
  confirmingRemoveId,
  onEdit,
  onRemove,
  onCancelRemove,
}: {
  items: CategoryMonthlyLimitItem[];
  currency: SupportedCurrency;
  showValues: boolean;
  mutationBusy: boolean;
  removingCategoryId: string | null;
  confirmingRemoveId: string | null;
  onEdit: (item: CategoryMonthlyLimitItem) => void;
  onRemove: (item: CategoryMonthlyLimitItem) => Promise<void>;
  onCancelRemove: () => void;
}) {
  return (
    <details id="limit-administration" className="mt-4 scroll-mt-4 rounded-[16px] border border-[var(--border)] bg-[var(--surface)]">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]">
        <span className="flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-[9px] bg-[var(--orbit-primary-subtle)] text-[var(--orbit-primary)]">
            <FaCog aria-hidden="true" />
          </span>
          <span>
            <strong className="block text-sm text-[var(--foreground)]">Administração de limites</strong>
            <small className="mt-0.5 block text-xs text-[var(--text-muted)]">Edite, defina ou remova limites das suas categorias. As alterações são aplicadas imediatamente.</small>
          </span>
        </span>
        <span className="rounded-[8px] border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 text-xs font-semibold text-[var(--text-muted)]">
          Expandir
        </span>
      </summary>

      <div className="border-t border-[var(--border)] p-3">
        <div className="grid gap-2">
          {items.map((item) => {
            const confirming = confirmingRemoveId === item.category.id;
            return (
              <div
                key={item.category.id}
                className="flex flex-col gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <span
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-[8px] text-white"
                    style={{ backgroundColor: item.category.color || DEFAULT_CATEGORY_COLOR }}
                    aria-hidden="true"
                  >
                    <IconRenderer iconName={item.category.icon || 'tag'} size={14} />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[var(--foreground)]">{item.category.name}</p>
                    <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                      {item.limit ? displayMoney(item.limit.amount, showValues, currency) : 'Sem limite'}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    icon={<FaPencilAlt />}
                    onClick={() => onEdit(item)}
                    disabled={mutationBusy || (!item.category.isActive && !item.limit)}
                  >
                    {item.limit ? 'Editar' : 'Definir'}
                  </Button>
                  {item.limit && (
                    <Button
                      size="sm"
                      variant={confirming ? 'danger' : 'ghost'}
                      icon={<FaTrashAlt />}
                      onClick={() => void onRemove(item)}
                      isLoading={removingCategoryId === item.category.id}
                      loadingText="Removendo"
                      disabled={mutationBusy && removingCategoryId !== item.category.id}
                    >
                      {confirming ? 'Confirmar remoção' : 'Remover'}
                    </Button>
                  )}
                  {confirming && (
                    <Button size="sm" variant="secondary" onClick={onCancelRemove} disabled={mutationBusy}>
                      Cancelar
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </details>
  );
}

export function LimitEditorModal({
  item,
  currency,
  value,
  fieldError,
  saving,
  onValueChange,
  onClose,
  onSubmit,
}: {
  item: CategoryMonthlyLimitItem;
  currency: SupportedCurrency;
  value: string;
  fieldError: string;
  saving: boolean;
  onValueChange: (value: string) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent) => void;
}) {
  const close = useCallback(() => {
    if (!saving) onClose();
  }, [onClose, saving]);

  return (
    <ModalShell
      title={`${item.limit ? 'Editar limite' : 'Definir limite'} — ${item.category.name}`}
      description={`Moeda do recorte: ${currency}`}
      onClose={close}
      closeDisabled={saving}
      maxWidthClass="max-w-[520px]"
    >
        <form className="mt-4" onSubmit={onSubmit}>
          <Input
            label={`Valor do limite em ${currency}`}
            inputMode="decimal"
            placeholder="Ex.: 800,00"
            value={value}
            onChange={(event) => onValueChange(event.currentTarget.value)}
            error={fieldError}
            autoFocus
          />
          <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" onClick={close} disabled={saving}>Cancelar</Button>
            <Button type="submit" icon={<FaCheck />} isLoading={saving} loadingText="Salvando">Salvar limite</Button>
          </div>
        </form>
    </ModalShell>
  );
}
