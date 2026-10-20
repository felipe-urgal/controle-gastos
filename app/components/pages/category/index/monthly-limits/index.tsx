'use client';

import { pageTitleClassName } from '@/app/components/base-pages/page-title';

import { useMediaQuery } from '@/app/hooks/use-media-query';

import { FormEvent, useMemo, useState } from 'react';
import Link from 'next/link';
import { FaCopy, FaPlus } from 'react-icons/fa';

import MobileCategoriesCenter from '@/app/components/pages/category/index/mobile-categories-center';
import { Input, Select } from '@/app/components/ui';
import { useAuth } from '@/app/context/auth-context';
import { useCategoryMonthlyLimits } from '@/app/hooks/categories/category-monthly-limits';
import { currencyOptions } from '@/app/lib/constants/account.constants';

import { parseMoneyInputToCents } from '@/app/lib/currency/parse-money-input';
import type { CategoryMonthlyLimitItem } from '@/app/types/category-monthly-limit';
import type { CategoryModel } from '@/app/types/category';
import type { SupportedCurrency } from '@/app/types/financial-summary';
import { CategoryStatusFilter, CategoryTypeFilter, LimitScope, PageSection, amountToInput, buildDistribution, categoryState, categoryUsagePercentage, orbitActionTokens } from '@/app/components/pages/category/index/monthly-limits/monthly-limits-helpers';
import { BudgetOverviewStrip, CategoryContext, CategoryTable, CriticalCategories, DistributionCard, LimitAdministration, LimitEditorModal, PageSectionTabs } from '@/app/components/pages/category/index/monthly-limits/monthly-limits-sections';

type CategoryMonthlyLimitsProps = {
  categories: CategoryModel[];
  categoriesLoading: boolean;
  search: string;
  onSearchChange: (search: string) => void;
};

export default function CategoryMonthlyLimits({
  categories,
  categoriesLoading,
  search,
  onSearchChange,
}: CategoryMonthlyLimitsProps) {
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const { user } = useAuth();
  const {
    items,
    summary,
    loading,
    error,
    periodValue,
    currency,
    savingCategoryId,
    removingCategoryId,
    copying,
    setPeriod,
    setCurrency,
    save,
    copyPreviousMonth,
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
  const mutationBusy =
    savingCategoryId !== null || removingCategoryId !== null || copying;
  const controlsDisabled = loading || mutationBusy;

  const limitedItems = useMemo(() => items.filter((item) => item.limit !== null), [items]);
  const criticalItems = useMemo(
    () =>
      limitedItems
        .filter((item) => item.isOverBudget || (item.planningPercentage ?? 0) >= 80)
        .sort(
          (left, right) =>
            (categoryUsagePercentage(right)) - (categoryUsagePercentage(left)),
        ),
    [limitedItems],
  );
  const incomeCategories = useMemo(
    () => categories.filter((category) => category.type === 'INCOME'),
    [categories],
  );

  const budgetTotal = summary.budget;
  const realizedTotal = summary.realized;
  const committedTotal = summary.committed;
  const availableTotal = summary.available;
  const budgetPercentage =
    budgetTotal > 0
      ? Math.round(((realizedTotal + committedTotal) / budgetTotal) * 1000) / 10
      : 0;

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
          const leftUsage = left.limit ? categoryUsagePercentage(left) : -1;
          const rightUsage = right.limit ? categoryUsagePercentage(right) : -1;
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
    if (
      statusFilter === 'critical' &&
      !item.isOverBudget &&
      (item.planningPercentage ?? 0) < 80
    )
      return false;
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
      setFieldError('Informe um valor válido com até 2 casas decimais.');
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
    <>
      {!isDesktop && (
      <div className={orbitActionTokens}>
        <MobileCategoriesCenter
          items={items}
          incomeCategories={incomeCategories}
          loading={loading}
          error={error}
          periodValue={periodValue}
          currency={currency}
          controlsDisabled={controlsDisabled}
          search={search}
          onSearchChange={onSearchChange}
          onPeriodChange={(value) => {
            resetTransientState();
            setPeriod(value);
          }}
          onCurrencyChange={(value) => {
            resetTransientState();
            setCurrency(value);
          }}
          summary={summary}
          budgetPercentage={budgetPercentage}
          copying={copying}
          onCopyPreviousMonth={() => void copyPreviousMonth()}
          criticalItems={criticalItems}
          distribution={distribution}
          showValues={showValues}
          typeFilter={typeFilter}
          onTypeFilterChange={setTypeFilter}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          limitScope={limitScope}
          onLimitScopeChange={setLimitScope}
          onEditLimit={startEditing}
          onRemoveLimit={handleRemove}
          confirmingRemoveId={confirmingRemoveId}
          removingCategoryId={removingCategoryId}
          mutationBusy={mutationBusy}
          onCancelRemove={() => setConfirmingRemoveId(null)}
        />
      </div>
      )}

      {isDesktop && (
      <section
        id="categories-overview"
        aria-labelledby="categories-title"
        className={orbitActionTokens}
      >
      <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 id="categories-title" className={pageTitleClassName}>
            Categorias / Limites
          </h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Gerencie seus orçamentos, acompanhe seus gastos e mantenha o controle das suas finanças.
          </p>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-[180px_150px_auto_auto]">
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
          <button
            type="button"
            onClick={() => void copyPreviousMonth()}
            disabled={controlsDisabled}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[10px] border border-[var(--border-strong)] bg-[var(--surface)] px-4 text-sm font-bold text-[var(--foreground)] disabled:opacity-50"
          >
            <FaCopy aria-hidden="true" />
            {copying ? 'Copiando...' : 'Copiar mês anterior'}
          </button>
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
        committedTotal={committedTotal}
        availableTotal={availableTotal}
        expectedIncome={summary.expectedIncome}
        criticalCount={summary.overBudgetCategories}
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
          <section className="mt-4 grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_390px]">
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

      </section>
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
    </>
  );
}
