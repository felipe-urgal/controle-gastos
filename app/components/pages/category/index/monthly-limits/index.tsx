'use client';

import { FormEvent, type ReactNode, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  FaBell,
  FaChartPie,
  FaCheck,
  FaCog,
  FaEllipsisH,
  FaExclamationTriangle,
  FaList,
  FaPencilAlt,
  FaPlus,
  FaSearch,
  FaTimes,
  FaTrashAlt,
  FaWallet,
} from 'react-icons/fa';

import { Button, IconRenderer, Input, Select } from '@/app/components/ui';
import { useAuth } from '@/app/context/auth-context';
import { useCategoryMonthlyLimits } from '@/app/hooks/categories/category-monthly-limits';
import { currencyOptions } from '@/app/lib/constants/account.constants';
import { formatCurrency } from '@/app/lib/currency/format-currency';
import { parseMoneyInputToCents } from '@/app/lib/currency/parse-money-input';
import type { CategoryMonthlyLimitItem } from '@/app/types/category-monthly-limit';
import type { CategoryModel } from '@/app/types/category';
import type { SupportedCurrency } from '@/app/types/financial-summary';

type CategoryMonthlyLimitsProps = {
  categories: CategoryModel[];
  categoriesLoading: boolean;
  search: string;
  onSearchChange: (search: string) => void;
};

type CategoryState = 'danger' | 'warn' | 'ok' | 'info';
type CategoryTypeFilter = 'all' | 'expense' | 'income';
type CategoryStatusFilter = 'all' | 'critical' | 'ok' | 'no-limit';
type LimitScope = 'all' | 'with-limit' | 'no-limit';
type PageSection = 'overview' | 'categories' | 'alerts' | 'admin';

const orbitActionTokens =
  '[--focus:var(--orbit-focus)] [--on-primary:var(--orbit-on-primary)] [--primary-hover:var(--orbit-primary-hover)] [--primary-subtle:var(--orbit-primary-subtle)] [--primary:var(--orbit-primary)]';

function amountToInput(amount: number) {
  const whole = Math.floor(amount / 100);
  const cents = String(amount % 100).padStart(2, '0');
  return `${whole},${cents}`;
}

function displayMoney(
  amount: number | null,
  showValues: boolean,
  currency: SupportedCurrency | string,
) {
  if (amount === null) return '—';
  return showValues ? formatCurrency(amount, currency) : '••••';
}

function categoryState(item: CategoryMonthlyLimitItem): CategoryState {
  if (!item.limit) return 'info';
  const percentage = item.percentage ?? 0;
  if (percentage > 100) return 'danger';
  if (percentage >= 80) return 'warn';
  return 'ok';
}

function stateTextClass(state: CategoryState) {
  if (state === 'danger') return 'text-[var(--expense)]';
  if (state === 'warn') return 'text-[var(--warning)]';
  if (state === 'ok') return 'text-[var(--income)]';
  return 'text-[var(--text-muted)]';
}

function stateBarClass(state: CategoryState) {
  if (state === 'danger') return 'bg-[var(--expense)]';
  if (state === 'warn') return 'bg-[var(--warning)]';
  if (state === 'ok') return 'bg-[var(--income)]';
  return 'bg-[var(--surface-subtle)]';
}

function stateBadgeClass(state: CategoryState) {
  if (state === 'danger') return 'border-[var(--expense)]/25 bg-[var(--danger-subtle)] text-[var(--expense)]';
  if (state === 'warn') return 'border-[var(--warning)]/25 bg-[var(--surface-raised)] text-[var(--warning)]';
  if (state === 'ok') return 'border-[var(--income)]/25 bg-[var(--primary-subtle)] text-[var(--income)]';
  return 'border-[var(--border)] bg-[var(--surface-subtle)] text-[var(--text-muted)]';
}

function stateLabel(state: CategoryState) {
  if (state === 'danger') return 'Crítica';
  if (state === 'warn') return 'Quase no limite';
  if (state === 'ok') return 'Dentro do limite';
  return 'Sem limite';
}

function buildDistribution(items: CategoryMonthlyLimitItem[]) {
  const withSpend = [...items]
    .filter((item) => item.realized > 0)
    .sort((left, right) => right.realized - left.realized);

  const total = withSpend.reduce((sum, item) => sum + item.realized, 0);
  if (total <= 0) return { total: 0, entries: [], gradient: 'var(--surface-subtle)' };

  const primary = withSpend.slice(0, 5);
  const rest = withSpend.slice(5);
  const restTotal = rest.reduce((sum, item) => sum + item.realized, 0);
  const entries = primary.map((item) => ({
    id: item.category.id,
    name: item.category.name,
    color: item.category.color || '#64748B',
    amount: item.realized,
    percentage: Math.round((item.realized / total) * 1000) / 10,
  }));

  if (restTotal > 0) {
    entries.push({
      id: 'other',
      name: 'Outros',
      color: '#64748B',
      amount: restTotal,
      percentage: Math.round((restTotal / total) * 1000) / 10,
    });
  }

  let cursor = 0;
  const stops = entries.map((entry) => {
    const start = cursor;
    cursor += (entry.amount / total) * 100;
    return `${entry.color} ${start}% ${cursor}%`;
  });

  return {
    total,
    entries,
    gradient: `conic-gradient(${stops.join(', ')})`,
  };
}

export default function CategoryMonthlyLimits({
  categories,
  categoriesLoading,
  search,
  onSearchChange,
}: CategoryMonthlyLimitsProps) {
  const { user } = useAuth();
  const {
    items,
    loading,
    error,
    periodValue,
    currency,
    savingCategoryId,
    removingCategoryId,
    setPeriod,
    setCurrency,
    save,
    remove,
  } = useCategoryMonthlyLimits();

  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [fieldError, setFieldError] = useState('');
  const [confirmingRemoveId, setConfirmingRemoveId] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<CategoryTypeFilter>('all');
  const [statusFilter, setStatusFilter] = useState<CategoryStatusFilter>('all');
  const [limitScope, setLimitScope] = useState<LimitScope>('all');
  const [activeSection, setActiveSection] = useState<PageSection>('overview');

  const showValues = user?.showValues !== false;
  const mutationBusy = savingCategoryId !== null || removingCategoryId !== null;
  const controlsDisabled = loading || mutationBusy;

  const limitedItems = useMemo(() => items.filter((item) => item.limit !== null), [items]);
  const criticalItems = useMemo(
    () =>
      limitedItems
        .filter((item) => (item.percentage ?? 0) >= 80)
        .sort((left, right) => (right.percentage ?? 0) - (left.percentage ?? 0)),
    [limitedItems],
  );
  const incomeCategories = useMemo(
    () => categories.filter((category) => category.type === 'INCOME'),
    [categories],
  );

  const budgetTotal = useMemo(
    () => limitedItems.reduce((total, item) => total + (item.limit?.amount ?? 0), 0),
    [limitedItems],
  );
  const realizedTotal = useMemo(
    () => items.reduce((total, item) => total + item.realized, 0),
    [items],
  );
  const remainingTotal = useMemo(
    () => limitedItems.reduce((total, item) => total + (item.remaining ?? 0), 0),
    [limitedItems],
  );
  const budgetPercentage =
    budgetTotal > 0 ? Math.round((realizedTotal / budgetTotal) * 1000) / 10 : 0;

  const fallbackSelectedCategoryId = (criticalItems[0] ?? items[0])?.category.id ?? null;
  const resolvedSelectedCategoryId =
    selectedCategoryId && items.some((item) => item.category.id === selectedCategoryId)
      ? selectedCategoryId
      : fallbackSelectedCategoryId;
  const selectedItem =
    items.find((item) => item.category.id === resolvedSelectedCategoryId) ?? null;

  const query = search.trim().toLocaleLowerCase('pt-BR');
  const expenseRows = useMemo(
    () =>
      [...items]
        .filter((item) => item.category.name.toLocaleLowerCase('pt-BR').includes(query))
        .sort((left, right) => {
          const leftUsage = left.limit ? left.percentage ?? 0 : -1;
          const rightUsage = right.limit ? right.percentage ?? 0 : -1;
          return rightUsage - leftUsage || right.realized - left.realized;
        }),
    [items, query],
  );
  const incomeRows = useMemo(
    () =>
      incomeCategories
        .filter((category) => category.name.toLocaleLowerCase('pt-BR').includes(query))
        .sort((left, right) => left.name.localeCompare(right.name, 'pt-BR')),
    [incomeCategories, query],
  );

  const filteredExpenses = expenseRows.filter((item) => {
    if (typeFilter === 'income') return false;
    if (statusFilter === 'critical' && (item.percentage ?? 0) < 80) return false;
    if (statusFilter === 'ok' && categoryState(item) !== 'ok') return false;
    if (statusFilter === 'no-limit' && item.limit !== null) return false;
    if (limitScope === 'with-limit' && item.limit === null) return false;
    if (limitScope === 'no-limit' && item.limit !== null) return false;
    return true;
  });

  const filteredIncome =
    typeFilter === 'expense' || statusFilter !== 'all' || limitScope !== 'all' ? [] : incomeRows;

  const totalVisibleCategories = filteredExpenses.length + filteredIncome.length;
  const distribution = useMemo(() => buildDistribution(items), [items]);

  function resetTransientState() {
    setEditingCategoryId(null);
    setEditingValue('');
    setFieldError('');
    setConfirmingRemoveId(null);
    setSelectedCategoryId(null);
  }

  function selectCategory(categoryId: string) {
    setSelectedCategoryId(categoryId);

    if (!window.matchMedia('(max-width: 980px)').matches) return;

    window.requestAnimationFrame(() => {
      const context = document.getElementById('category-context');
      if (!context) return;
      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      context.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
    });
  }

  function jumpTo(section: PageSection, elementId: string) {
    setActiveSection(section);
    const target = document.getElementById(elementId);
    if (!target) return;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    target.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
  }

  function startEditing(item: CategoryMonthlyLimitItem) {
    setSelectedCategoryId(item.category.id);
    setEditingCategoryId(item.category.id);
    setEditingValue(showValues && item.limit ? amountToInput(item.limit.amount) : '');
    setFieldError('');
    setConfirmingRemoveId(null);
  }

  function closeEditing() {
    setEditingCategoryId(null);
    setEditingValue('');
    setFieldError('');
  }

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    if (!editingCategoryId) return;

    const amount = parseMoneyInputToCents(editingValue);
    if (amount === null) {
      setFieldError('Informe um valor maior que zero com até 2 casas decimais.');
      return;
    }

    try {
      await save(editingCategoryId, amount);
      closeEditing();
    } catch {
      // O hook já expõe a falha da API no painel principal.
    }
  }

  async function handleRemove(item: CategoryMonthlyLimitItem) {
    if (confirmingRemoveId !== item.category.id) {
      setConfirmingRemoveId(item.category.id);
      return;
    }

    try {
      await remove(item.category.id);
      setConfirmingRemoveId(null);
    } catch {
      // O hook já expõe a falha da API no painel principal.
    }
  }

  const editingItem = items.find((item) => item.category.id === editingCategoryId) ?? null;

  return (
    <section id="categories-overview" aria-labelledby="categories-title" className={orbitActionTokens}>
      <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 id="categories-title" className="text-2xl font-bold tracking-tight text-[var(--foreground)] sm:text-[30px]">
            Categorias / Limites
          </h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Gerencie seus orçamentos, acompanhe seus gastos e mantenha o controle das suas finanças.
          </p>
        </div>

        <div className="grid gap-2 sm:grid-cols-[180px_150px_auto]">
          <Input
            id="category-limit-period"
            type="month"
            aria-label="Mês de referência"
            value={periodValue}
            onChange={(event) => {
              resetTransientState();
              setPeriod(event.currentTarget.value);
            }}
            disabled={controlsDisabled}
          />
          <Select
            id="category-limit-currency"
            ariaLabel="Moeda"
            value={currency}
            options={currencyOptions}
            onChange={(value) => {
              resetTransientState();
              setCurrency(value as SupportedCurrency);
            }}
            disabled={controlsDisabled}
          />
          <Link
            href="/categorias/nova"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[10px] border border-[var(--orbit-primary)]/45 bg-[var(--orbit-primary)] px-4 text-sm font-bold text-[var(--orbit-on-primary)] transition-colors hover:bg-[var(--orbit-primary-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]"
          >
            <FaPlus aria-hidden="true" /> Nova categoria
          </Link>
        </div>
      </header>

      {error && (
        <p
          role="alert"
          className="mt-4 rounded-[12px] border border-[var(--expense)]/35 bg-[var(--danger-subtle)] p-3 text-sm text-[var(--expense)]"
        >
          {error}
        </p>
      )}

      <BudgetOverviewStrip
        loading={loading}
        budgetTotal={budgetTotal}
        realizedTotal={realizedTotal}
        remainingTotal={remainingTotal}
        criticalCount={criticalItems.length}
        budgetPercentage={budgetPercentage}
        limitedCount={limitedItems.length}
        currency={currency}
        showValues={showValues}
      />

      <PageSectionTabs active={activeSection} onJump={jumpTo} />

      {loading ? (
        <div className="mt-4 rounded-[18px] border border-[var(--border)] bg-[var(--surface)] p-5 text-sm text-[var(--text-muted)]" role="status">
          Carregando limites…
        </div>
      ) : items.length === 0 ? (
        <div className="mt-4 rounded-[18px] border border-[var(--border)] bg-[var(--surface)] p-5">
          <p className="font-semibold text-[var(--foreground)]">Nenhuma categoria de despesa</p>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Crie uma categoria de despesa para começar a definir limites mensais.
          </p>
        </div>
      ) : (
        <>
          <section className="mt-4 grid items-start gap-4 xl:grid-cols-[minmax(0,1.9fr)_minmax(330px,.92fr)]">
            <CategoryTable
              expenses={filteredExpenses}
              income={filteredIncome}
              count={totalVisibleCategories}
              search={search}
              onSearchChange={onSearchChange}
              categoriesLoading={categoriesLoading}
              typeFilter={typeFilter}
              onTypeFilterChange={setTypeFilter}
              statusFilter={statusFilter}
              onStatusFilterChange={setStatusFilter}
              limitScope={limitScope}
              onLimitScopeChange={setLimitScope}
              currency={currency}
              showValues={showValues}
              selectedCategoryId={resolvedSelectedCategoryId}
              onSelectExpense={selectCategory}
            />

            <aside className="grid content-start gap-3.5">
              <DistributionCard
                distribution={distribution}
                realizedTotal={realizedTotal}
                currency={currency}
                showValues={showValues}
              />

              <CriticalCategories
                items={criticalItems}
                selectedCategoryId={resolvedSelectedCategoryId}
                onSelect={selectCategory}
                currency={currency}
                showValues={showValues}
                onShowAll={() => {
                  setTypeFilter('expense');
                  setStatusFilter('critical');
                  setLimitScope('all');
                  jumpTo('categories', 'categories-table');
                }}
              />

              <CategoryContext
                item={selectedItem}
                currency={currency}
                showValues={showValues}
                mutationBusy={mutationBusy}
                onEdit={startEditing}
              />
            </aside>
          </section>

          <LimitAdministration
            items={items}
            currency={currency}
            showValues={showValues}
            mutationBusy={mutationBusy}
            removingCategoryId={removingCategoryId}
            confirmingRemoveId={confirmingRemoveId}
            onEdit={startEditing}
            onRemove={handleRemove}
            onCancelRemove={() => setConfirmingRemoveId(null)}
          />
        </>
      )}

      {editingItem && (
        <LimitEditorModal
          item={editingItem}
          currency={currency}
          value={editingValue}
          fieldError={fieldError}
          saving={savingCategoryId === editingItem.category.id}
          onValueChange={(value) => {
            setEditingValue(value);
            if (fieldError) setFieldError('');
          }}
          onClose={closeEditing}
          onSubmit={handleSave}
        />
      )}
    </section>
  );
}

function BudgetOverviewStrip({
  loading,
  budgetTotal,
  realizedTotal,
  remainingTotal,
  criticalCount,
  budgetPercentage,
  limitedCount,
  currency,
  showValues,
}: {
  loading: boolean;
  budgetTotal: number;
  realizedTotal: number;
  remainingTotal: number;
  criticalCount: number;
  budgetPercentage: number;
  limitedCount: number;
  currency: SupportedCurrency;
  showValues: boolean;
}) {
  const availablePercentage = Math.max(0, 100 - budgetPercentage);

  return (
    <section
      className="mt-4 grid overflow-hidden rounded-[16px] border border-[var(--border)] bg-[var(--surface)] sm:grid-cols-2 xl:grid-cols-[1.05fr_1fr_1fr_.92fr_1.55fr]"
      aria-label={`Resumo do orçamento em ${currency}`}
    >
      <OverviewMetric
        icon={<FaWallet />}
        label="Orçamento total"
        value={displayMoney(budgetTotal, showValues, currency)}
        note={`em ${limitedCount} categorias com limite`}
        tone="text-[var(--income)]"
        loading={loading}
      />
      <OverviewMetric
        icon={<FaChartPie />}
        label="Realizado no mês"
        value={displayMoney(realizedTotal, showValues, currency)}
        note={`${budgetPercentage.toLocaleString('pt-BR')}% do orçamento`}
        tone="text-[var(--orbit-primary)]"
        loading={loading}
      />
      <OverviewMetric
        icon={<FaChartPie />}
        label="Restante"
        value={displayMoney(remainingTotal, showValues, currency)}
        note={budgetTotal > 0 ? `${availablePercentage.toLocaleString('pt-BR')}% disponível` : 'sem base de limite'}
        tone={remainingTotal < 0 ? 'text-[var(--expense)]' : 'text-[var(--income)]'}
        loading={loading}
      />
      <OverviewMetric
        icon={<FaExclamationTriangle />}
        label="Categorias críticas"
        value={String(criticalCount)}
        note="a partir de 80% do limite"
        tone={criticalCount ? 'text-[var(--expense)]' : 'text-[var(--foreground)]'}
        loading={loading}
      />

      <div className="border-t border-[var(--border)] p-4 sm:col-span-2 xl:col-span-1 xl:border-l xl:border-t-0">
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-semibold text-[var(--text-muted)]">Progresso do mês</span>
          <strong className="text-lg text-[var(--foreground)]">{budgetPercentage.toLocaleString('pt-BR')}%</strong>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--surface-subtle)]">
          <div
            className="h-full rounded-full bg-[var(--orbit-primary)]"
            style={{ width: `${Math.min(100, Math.max(0, budgetPercentage))}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-[var(--text-muted)]">
          {displayMoney(realizedTotal, showValues, currency)} de {displayMoney(budgetTotal, showValues, currency)}
        </p>
      </div>
    </section>
  );
}

function OverviewMetric({
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
          <strong className={`mt-1 block truncate text-xl font-bold ${tone}`}>{value}</strong>
        )}
        <small className="mt-1 block truncate text-[11px] text-[var(--text-muted)]">{note}</small>
      </div>
    </article>
  );
}

function PageSectionTabs({
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

function CategoryTable({
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
      className="scroll-mt-4 rounded-[18px] border border-[var(--border)] bg-[var(--surface)] p-3.5 sm:p-4"
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
        <div className="mt-3 overflow-x-auto">
          <div className="min-w-[860px]">
            <div className="grid grid-cols-[1.55fr_.65fr_1fr_1.05fr_.8fr_.9fr_.9fr_48px] items-center gap-3 border-y border-[var(--border)] px-2 py-2 text-[10px] font-semibold uppercase tracking-[0.05em] text-[var(--text-subtle)]">
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

function FilterToggle({
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

function ExpenseCategoryRow({
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
  const percentage = item.percentage ?? 0;

  return (
    <div
      className={`grid min-h-[54px] grid-cols-[1.55fr_.65fr_1fr_1.05fr_.8fr_.9fr_.9fr_48px] items-center gap-3 px-2 py-2 transition-colors ${
        selected ? 'bg-[var(--orbit-primary-subtle)]' : 'hover:bg-[var(--surface-hover)]'
      }`}
    >
      <button type="button" onClick={onSelect} className="flex min-w-0 items-center gap-2.5 text-left">
        <span
          className="grid h-8 w-8 shrink-0 place-items-center rounded-[9px] text-white"
          style={{ backgroundColor: item.category.color || '#64748B' }}
          aria-hidden="true"
        >
          <IconRenderer iconName={item.category.icon || 'tag'} size={14} />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-[var(--foreground)]">{item.category.name}</p>
          <small className="text-[11px] text-[var(--text-muted)]">Despesa</small>
        </div>
      </button>

      <span className="w-fit rounded-full border border-[var(--border)] bg-[var(--surface-raised)] px-2 py-1 text-[10px] font-semibold text-[var(--text-muted)]">
        Despesa
      </span>

      <span className={`w-fit rounded-full border px-2 py-1 text-[10px] font-semibold ${stateBadgeClass(state)}`}>
        {stateLabel(state)}
      </span>

      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <strong className={`w-12 shrink-0 text-xs ${stateTextClass(state)}`}>
            {item.limit ? `${percentage.toLocaleString('pt-BR')}%` : '—'}
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

function IncomeCategoryRow({ category }: { category: CategoryModel }) {
  return (
    <div className="grid min-h-[54px] grid-cols-[1.55fr_.65fr_1fr_1.05fr_.8fr_.9fr_.9fr_48px] items-center gap-3 px-2 py-2 hover:bg-[var(--surface-hover)]">
      <div className="flex min-w-0 items-center gap-2.5">
        <span
          className="grid h-8 w-8 shrink-0 place-items-center rounded-[9px] text-white"
          style={{ backgroundColor: category.color || '#64748B' }}
          aria-hidden="true"
        >
          <IconRenderer iconName={category.icon || 'tag'} size={14} />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-[var(--foreground)]">{category.name}</p>
          <small className="text-[11px] text-[var(--income)]">Receita</small>
        </div>
      </div>
      <span className="w-fit rounded-full border border-[var(--income)]/20 bg-[var(--primary-subtle)] px-2 py-1 text-[10px] font-semibold text-[var(--income)]">Receita</span>
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

function DistributionCard({
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

      <div className="mt-4 grid grid-cols-[132px_minmax(0,1fr)] items-center gap-4">
        <div
          className="relative h-[132px] w-[132px] rounded-full"
          style={{ background: distribution.gradient }}
          role="img"
          aria-label="Distribuição dos gastos por categoria"
        >
          <div className="absolute inset-[20px] grid place-content-center rounded-full bg-[var(--surface)] text-center">
            <strong className="text-sm text-[var(--foreground)]">{displayMoney(realizedTotal, showValues, currency)}</strong>
            <span className="mt-1 text-[10px] text-[var(--text-muted)]">Total no mês</span>
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

function CriticalCategories({
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
            const percentage = item.percentage ?? 0;
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
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-bold text-[var(--foreground)]">{item.category.name}</span>
                  <strong className={stateTextClass(state)}>{percentage.toLocaleString('pt-BR')}%</strong>
                </div>
                <div className="mt-2 h-[7px] overflow-hidden rounded-full bg-[var(--surface-subtle)]">
                  <div
                    className={`h-full rounded-full ${stateBarClass(state)}`}
                    style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }}
                  />
                </div>
                <small className="mt-1.5 block text-xs text-[var(--text-muted)]">
                  {displayMoney(item.realized, showValues, currency)} / {displayMoney(item.limit?.amount ?? null, showValues, currency)}
                </small>
              </button>
            );
          })}
        </div>
      )}
    </article>
  );
}

function CategoryContext({
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

  const percentage = item.percentage ?? 0;
  const state = categoryState(item);

  return (
    <article id="category-context" className="scroll-mt-4 rounded-[18px] border border-[var(--border)] bg-[var(--surface)] p-4" aria-labelledby="category-detail-title">
      <h2 className="text-base font-bold text-[var(--foreground)]">Resumo da categoria selecionada</h2>

      <div className="mt-3 flex items-start gap-3">
        <span
          className="grid h-10 w-10 shrink-0 place-items-center rounded-[11px] text-white"
          style={{ backgroundColor: item.category.color || '#64748B' }}
          aria-hidden="true"
        >
          <IconRenderer iconName={item.category.icon || 'tag'} size={17} />
        </span>
        <div className="min-w-0 flex-1">
          <h3 id="category-detail-title" className="truncate text-base font-bold text-[var(--foreground)]">{item.category.name}</h3>
          <p className="mt-0.5 text-xs text-[var(--text-muted)]">Despesa · orçamento mensal</p>
        </div>
      </div>

      <dl className="my-4 grid grid-cols-3 gap-2">
        <ContextMetric label="Limite mensal" value={displayMoney(item.limit?.amount ?? null, showValues, currency)} />
        <ContextMetric label="Realizado" value={displayMoney(item.realized, showValues, currency)} />
        <ContextMetric
          label="Restante"
          value={displayMoney(item.remaining, showValues, currency)}
          className={(item.remaining ?? 0) < 0 ? 'text-[var(--expense)]' : 'text-[var(--income)]'}
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
          <p className="mt-2 text-xs text-[var(--text-muted)]">{percentage.toLocaleString('pt-BR')}% do limite utilizado</p>
        </>
      )}

      <div className="mt-4 grid grid-cols-2 gap-2">
        <Button
          size="sm"
          variant="secondary"
          icon={<FaPencilAlt />}
          onClick={() => onEdit(item)}
          disabled={mutationBusy}
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

function ContextMetric({
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
      <dt className="text-[10px] text-[var(--text-muted)]">{label}</dt>
      <dd className={`mt-1 text-xs font-bold sm:text-sm ${className}`}>{value}</dd>
    </div>
  );
}

function LimitAdministration({
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
            <small className="mt-0.5 block text-xs text-[var(--text-muted)]">Edite, defina ou remova limites das suas categorias.</small>
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
                    style={{ backgroundColor: item.category.color || '#64748B' }}
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
                    disabled={mutationBusy}
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

function LimitEditorModal({
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
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-[var(--overlay)] p-4"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="limit-editor-title"
        className="w-full max-w-[520px] rounded-[18px] border border-[var(--border-strong)] bg-[var(--background)] p-5 shadow-[var(--shadow-surface)]"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="limit-editor-title" className="text-xl font-bold text-[var(--foreground)]">
              {item.limit ? 'Editar limite' : 'Definir limite'} — {item.category.name}
            </h2>
            <p className="mt-1 text-sm text-[var(--text-muted)]">Moeda do recorte: {currency}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar editor de limite"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-[10px] text-[var(--text-muted)] hover:bg-[var(--surface-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]"
          >
            <FaTimes aria-hidden="true" />
          </button>
        </div>

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
            <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>Cancelar</Button>
            <Button type="submit" icon={<FaCheck />} isLoading={saving} loadingText="Salvando">Salvar limite</Button>
          </div>
        </form>
      </section>
    </div>
  );
}
