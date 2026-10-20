import { DEFAULT_CATEGORY_COLOR } from '@/app/lib/categories/default-color';
import { formatCurrency } from '@/app/lib/currency/format-currency';
import { CategoryMonthlyLimitItem } from '@/app/types/category-monthly-limit';
import { SupportedCurrency } from '@/app/types/financial-summary';

export type CategoryState = 'danger' | 'warn' | 'ok' | 'info';

export type CategoryTypeFilter = 'all' | 'expense' | 'income';

export type CategoryStatusFilter = 'all' | 'critical' | 'ok' | 'no-limit';

export type LimitScope = 'all' | 'with-limit' | 'no-limit';

export type PageSection = 'overview' | 'categories' | 'alerts' | 'admin';

export const orbitActionTokens =
  '[--focus:var(--orbit-focus)] [--on-primary:var(--orbit-on-primary)] [--primary-hover:var(--orbit-primary-hover)] [--primary-subtle:var(--orbit-primary-subtle)] [--primary:var(--orbit-primary)]';

export function amountToInput(amount: number) {
  const whole = Math.floor(amount / 100);
  const cents = String(amount % 100).padStart(2, '0');
  return `${whole},${cents}`;
}

export function displayMoney(
  amount: number | null,
  showValues: boolean,
  currency: SupportedCurrency | string,
) {
  if (amount === null) return '—';
  return showValues ? formatCurrency(amount, currency) : '••••';
}

export function categoryUsagePercentage(item: CategoryMonthlyLimitItem) {
  if (item.limit?.amount === 0 && item.isOverBudget) return 101;
  return item.planningPercentage ?? 0;
}

export function categoryUsageLabel(item: CategoryMonthlyLimitItem) {
  if (!item.limit) return '—';
  if (item.limit.amount === 0 && item.isOverBudget) return 'Excedido';
  return `${(item.planningPercentage ?? 0).toLocaleString('pt-BR')}%`;
}

export function categoryState(item: CategoryMonthlyLimitItem): CategoryState {
  if (!item.limit) return 'info';
  if (item.isOverBudget) return 'danger';
  const percentage = categoryUsagePercentage(item);
  if (percentage >= 80) return 'warn';
  return 'ok';
}

export function stateTextClass(state: CategoryState) {
  if (state === 'danger') return 'text-[var(--expense)]';
  if (state === 'warn') return 'text-[var(--warning)]';
  if (state === 'ok') return 'text-[var(--income)]';
  return 'text-[var(--text-muted)]';
}

export function stateBarClass(state: CategoryState) {
  if (state === 'danger') return 'bg-[var(--expense)]';
  if (state === 'warn') return 'bg-[var(--warning)]';
  if (state === 'ok') return 'bg-[var(--income)]';
  return 'bg-[var(--surface-subtle)]';
}

export function stateBadgeClass(state: CategoryState) {
  if (state === 'danger') return 'border-[var(--expense)]/25 bg-[var(--danger-subtle)] text-[var(--expense)]';
  if (state === 'warn') return 'border-[var(--warning)]/25 bg-[var(--surface-raised)] text-[var(--warning)]';
  if (state === 'ok') return 'border-[var(--income)]/25 bg-[var(--primary-subtle)] text-[var(--income)]';
  return 'border-[var(--border)] bg-[var(--surface-subtle)] text-[var(--text-muted)]';
}

export function stateLabel(state: CategoryState) {
  if (state === 'danger') return 'Crítica';
  if (state === 'warn') return 'Quase no limite';
  if (state === 'ok') return 'Dentro do limite';
  return 'Sem limite';
}

export function buildDistribution(items: CategoryMonthlyLimitItem[]) {
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
    color: item.category.color || DEFAULT_CATEGORY_COLOR,
    amount: item.realized,
    percentage: Math.round((item.realized / total) * 1000) / 10,
  }));

  if (restTotal > 0) {
    entries.push({
      id: 'other',
      name: 'Outros',
      color: DEFAULT_CATEGORY_COLOR,
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
