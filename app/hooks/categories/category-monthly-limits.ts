'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { categoryLimitService } from '@/app/services/category-limit-service';
import { CategoryMonthlyLimitItem } from '@/app/types/category-monthly-limit';

function currentPeriod() {
  const now = new Date();
  return {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
  };
}

export function useCategoryMonthlyLimits() {
  const initialPeriod = useMemo(currentPeriod, []);
  const [year, setYear] = useState(initialPeriod.year);
  const [month, setMonth] = useState(initialPeriod.month);
  const [items, setItems] = useState<CategoryMonthlyLimitItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [savingCategoryId, setSavingCategoryId] = useState<string | null>(null);
  const [removingCategoryId, setRemovingCategoryId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const response = await categoryLimitService.getAll(year, month);
      setItems(response.data.items);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Erro ao carregar limites mensais');
    } finally {
      setLoading(false);
    }
  }, [month, year]);

  useEffect(() => {
    void load();
  }, [load]);

  const setPeriod = useCallback((value: string) => {
    const [nextYear, nextMonth] = value.split('-').map(Number);
    if (!Number.isInteger(nextYear) || !Number.isInteger(nextMonth)) return;
    if (nextMonth < 1 || nextMonth > 12) return;

    setYear(nextYear);
    setMonth(nextMonth);
  }, []);

  const save = useCallback(
    async (categoryId: string, amount: number) => {
      setSavingCategoryId(categoryId);
      setError('');

      try {
        await categoryLimitService.save({ categoryId, year, month, amount });
        await load();
      } catch (saveError) {
        setError(saveError instanceof Error ? saveError.message : 'Erro ao salvar limite mensal');
        throw saveError;
      } finally {
        setSavingCategoryId(null);
      }
    },
    [load, month, year],
  );

  const remove = useCallback(
    async (categoryId: string) => {
      setRemovingCategoryId(categoryId);
      setError('');

      try {
        await categoryLimitService.remove(categoryId, year, month);
        await load();
      } catch (removeError) {
        setError(removeError instanceof Error ? removeError.message : 'Erro ao remover limite mensal');
        throw removeError;
      } finally {
        setRemovingCategoryId(null);
      }
    },
    [load, month, year],
  );

  return {
    items,
    loading,
    error,
    year,
    month,
    periodValue: `${year}-${String(month).padStart(2, '0')}`,
    savingCategoryId,
    removingCategoryId,
    setPeriod,
    save,
    remove,
    reload: load,
  };
}
