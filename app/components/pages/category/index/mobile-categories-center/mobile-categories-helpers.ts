import { wrappableMoney } from '@/app/lib/currency/wrappable-money';
import { formatCurrency } from '@/app/lib/currency/format-currency';
import type { CategoryMonthlyLimitItem } from '@/app/types/category-monthly-limit';
import type { SupportedCurrency } from '@/app/types/financial-summary';

export function displayMoney(
  amount: number | null,
  showValues: boolean,
  currency: SupportedCurrency | string,
) {
  if (amount === null) return '—';
  return showValues ? wrappableMoney(formatCurrency(amount, currency)) : '••••';
}

export function monthLabel(periodValue: string) {
  const [year, month] = periodValue.split('-').map(Number);
  if (!year || !month) return periodValue;
  const date = new Date(year, month - 1, 1);
  const label = new Intl.DateTimeFormat('pt-BR', {
    month: 'short',
    year: 'numeric',
  }).format(date);
  return label.replace('.', '');
}

export function usagePercentage(item: CategoryMonthlyLimitItem) {
  if (item.limit?.amount === 0 && item.isOverBudget) return 101;
  return item.planningPercentage ?? 0;
}

export function usageLabel(item: CategoryMonthlyLimitItem) {
  if (!item.limit) return '—';
  if (item.limit.amount === 0 && item.isOverBudget) return 'Excedido';
  return `${(item.planningPercentage ?? 0).toLocaleString('pt-BR')}%`;
}

export function stateFor(item: CategoryMonthlyLimitItem) {
  if (!item.limit) return 'info' as const;
  if (item.isOverBudget) return 'danger' as const;
  const percentage = usagePercentage(item);
  if (percentage >= 80) return 'warn' as const;
  return 'ok' as const;
}

export function barClass(item: CategoryMonthlyLimitItem) {
  const state = stateFor(item);
  if (state === 'danger') return 'bg-[var(--expense)]';
  if (state === 'warn') return 'bg-[var(--warning)]';
  if (state === 'ok') return 'bg-[var(--orbit-primary)]';
  return 'bg-[var(--surface-subtle)]';
}

export function percentageClass(item: CategoryMonthlyLimitItem) {
  const state = stateFor(item);
  if (state === 'danger') return 'text-[var(--expense)]';
  if (state === 'warn') return 'text-[var(--warning)]';
  if (state === 'ok') return 'text-[var(--orbit-primary)]';
  return 'text-[var(--text-muted)]';
}
