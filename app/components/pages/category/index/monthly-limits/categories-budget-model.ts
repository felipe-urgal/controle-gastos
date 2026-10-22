import {
  categoryState,
  categoryUsagePercentage,
  type CategoryState,
} from '@/app/components/pages/category/index/monthly-limits/monthly-limits-helpers';
import type { CategoryMonthlyLimitItem } from '@/app/types/category-monthly-limit';

export type BudgetFilter = 'all' | 'attention' | 'no-limit' | 'inactive';

export type BudgetCounts = { ok: number; near: number; over: number; noLimit: number };

/** Contagem por estado; "perto" é o estado `warn` (a partir de 80% do limite). */
export function countBudgetStates(items: readonly CategoryMonthlyLimitItem[]): BudgetCounts {
  const counts: BudgetCounts = { ok: 0, near: 0, over: 0, noLimit: 0 };
  for (const item of items) {
    const state = categoryState(item);
    if (state === 'danger') counts.over += 1;
    else if (state === 'warn') counts.near += 1;
    else if (state === 'ok') counts.ok += 1;
    else counts.noLimit += 1;
  }
  return counts;
}

/** Fração do mês já decorrida (0 a 1) para o mês `YYYY-MM`; mês passado é 1 e futuro é 0. */
export function monthElapsedFraction(periodValue: string, today: { year: number; month: number; day: number }) {
  const [year, month] = periodValue.split('-').map(Number);
  if (!Number.isInteger(year) || !Number.isInteger(month)) return null;

  const periodIndex = year * 12 + month;
  const todayIndex = today.year * 12 + today.month;
  if (periodIndex < todayIndex) return 1;
  if (periodIndex > todayIndex) return 0;

  const days = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return today.day / days;
}

export type PaceVerdict = 'OVER' | 'AHEAD' | 'ON_TRACK' | 'NO_BUDGET' | 'FINISHED' | 'NOT_STARTED';

/** Compara o consumo do orçamento (realizado mais comprometido) com o tempo decorrido do mês. */
export function budgetPace(args: { budget: number; consumed: number; elapsed: number | null }): PaceVerdict {
  const { budget, consumed, elapsed } = args;
  if (budget <= 0) return 'NO_BUDGET';
  if (consumed > budget) return 'OVER';
  if (elapsed === null) return 'ON_TRACK';
  if (elapsed >= 1) return 'FINISHED';
  if (elapsed <= 0) return 'NOT_STARTED';
  return consumed / budget > elapsed + 0.1 ? 'AHEAD' : 'ON_TRACK';
}

/** Despesas por uso do limite (maior primeiro), depois por gasto; filtro e busca por nome. */
export function filterBudgetRows(
  items: readonly CategoryMonthlyLimitItem[],
  options: { filter: BudgetFilter; query: string },
) {
  const query = options.query.trim().toLocaleLowerCase('pt-BR');

  return [...items]
    .filter((item) => {
      if (query && !item.category.name.toLocaleLowerCase('pt-BR').includes(query)) return false;
      if (options.filter === 'inactive') return !item.category.isActive;
      if (!item.category.isActive && options.filter !== 'all') return false;
      if (options.filter === 'attention') return needsAttention(item);
      if (options.filter === 'no-limit') return item.limit === null;
      return true;
    })
    .sort((left, right) => {
      const leftUsage = left.limit ? categoryUsagePercentage(left) : -1;
      const rightUsage = right.limit ? categoryUsagePercentage(right) : -1;
      return rightUsage - leftUsage || right.realized - left.realized || left.category.name.localeCompare(right.category.name, 'pt-BR');
    });
}

export function needsAttention(item: CategoryMonthlyLimitItem) {
  const state: CategoryState = categoryState(item);
  return state === 'danger' || state === 'warn';
}

export const MAX_ATTENTION_ROWS = 5;

/** Categorias ativas que estouraram ou estão perto do limite, as mais graves primeiro. */
export function buildAttentionRows(items: readonly CategoryMonthlyLimitItem[]) {
  return filterBudgetRows(items.filter((item) => item.category.isActive), { filter: 'attention', query: '' }).slice(0, MAX_ATTENTION_ROWS);
}
