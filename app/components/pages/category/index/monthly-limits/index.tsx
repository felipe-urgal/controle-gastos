'use client';

import { FormEvent, useState } from 'react';

import CategoriesBudgetView from '@/app/components/pages/category/index/monthly-limits/categories-budget-view';
import type { BudgetFilter } from '@/app/components/pages/category/index/monthly-limits/categories-budget-model';
import { LimitEditorModal } from '@/app/components/pages/category/index/monthly-limits/limit-editor-modal';
import { amountToInput } from '@/app/components/pages/category/index/monthly-limits/monthly-limits-helpers';
import { useAuth } from '@/app/context/auth-context';
import { useCategoryMonthlyLimits } from '@/app/hooks/categories/category-monthly-limits';
import { parseMoneyInputToCents } from '@/app/lib/currency/parse-money-input';
import type { CategoryModel } from '@/app/types/category';
import type { CategoryMonthlyLimitItem } from '@/app/types/category-monthly-limit';

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

  const [filter, setFilter] = useState<BudgetFilter>('all');
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [fieldError, setFieldError] = useState('');

  const showValues = user?.showValues !== false;
  const controlsDisabled = loading || savingCategoryId !== null || removingCategoryId !== null || copying;
  const editingItem = items.find((item) => item.category.id === editingCategoryId) ?? null;

  function closeEditing() {
    setEditingCategoryId(null);
    setEditingValue('');
    setFieldError('');
  }

  function startEditing(item: CategoryMonthlyLimitItem) {
    setEditingCategoryId(item.category.id);
    setEditingValue(showValues && item.limit ? amountToInput(item.limit.amount) : '');
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

  async function handleRemove() {
    if (!editingCategoryId) return;

    try {
      await remove(editingCategoryId);
      closeEditing();
    } catch {
      // O hook já expõe a falha da API no painel principal.
    }
  }

  return (
    <>
      <CategoriesBudgetView
        items={items}
        summary={summary}
        incomeCategories={categories.filter((category) => category.type === 'INCOME')}
        loading={loading}
        categoriesLoading={categoriesLoading}
        error={error}
        periodValue={periodValue}
        currency={currency}
        controlsDisabled={controlsDisabled}
        copying={copying}
        search={search}
        filter={filter}
        showValues={showValues}
        onFilterChange={setFilter}
        onSearchChange={onSearchChange}
        onPeriodChange={(value) => {
          closeEditing();
          setPeriod(value);
        }}
        onCurrencyChange={(value) => {
          closeEditing();
          setCurrency(value);
        }}
        onCopyPreviousMonth={() => void copyPreviousMonth()}
        onEditLimit={startEditing}
      />

      {editingItem && (
        <LimitEditorModal
          item={editingItem}
          currency={currency}
          value={editingValue}
          fieldError={fieldError}
          saving={savingCategoryId === editingItem.category.id}
          removing={removingCategoryId === editingItem.category.id}
          onValueChange={(value) => {
            setEditingValue(value);
            setFieldError('');
          }}
          onClose={closeEditing}
          onSubmit={handleSave}
          onRemove={() => void handleRemove()}
        />
      )}
    </>
  );
}
