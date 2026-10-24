import { FinancialGoalStatus } from '@/app/types/financial-goal';
import { SupportedCurrency } from '@/app/types/financial-summary';

export type GoalFilter = 'ALL' | FinancialGoalStatus;

export type GoalFormState = {
  name: string;
  targetAmount: string;
  currency: SupportedCurrency;
  targetDate: string;
  description: string;
  accountId: string;
};

export const emptyForm: GoalFormState = {
  name: '',
  targetAmount: '',
  currency: 'BRL',
  targetDate: '',
  description: '',
  accountId: '',
};

export function moneyInputFromCents(value: number) {
  return (value / 100).toFixed(2).replace('.', ',');
}

export function statusLabel(status: FinancialGoalStatus) {
  if (status === 'COMPLETED') return 'Concluída';
  if (status === 'ARCHIVED') return 'Arquivada';
  return 'Ativa';
}

export function statusClasses(status: FinancialGoalStatus) {
  if (status === 'COMPLETED') {
    return 'border-[var(--income)]/30 bg-[var(--income)]/10 text-[var(--income)]';
  }
  if (status === 'ARCHIVED') {
    return 'border-[var(--border)] bg-[var(--surface-raised)] text-[var(--text-muted)]';
  }
  return 'border-[var(--primary)]/30 bg-[var(--primary-subtle)] text-[var(--primary)]';
}

export function dateLabel(value: string | null) {
  if (!value) return null;
  const [year, month, day] = value.split('-');
  return `${day}/${month}/${year}`;
}
