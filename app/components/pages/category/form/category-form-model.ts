import { parseMoneyInputToCents } from '@/app/lib/currency/parse-money-input';
import type { CategoryType } from '@/app/types/category';
import type { SupportedCurrency } from '@/app/types/financial-summary';

const nameSuggestions: Record<CategoryType, string[]> = {
  EXPENSE: ['Mercado', 'Moradia', 'Transporte', 'Lazer', 'Saúde'],
  INCOME: ['Salário', 'Freelance', 'Rendimentos'],
};

export function categoryNameSuggestions(type: CategoryType) {
  return nameSuggestions[type];
}

export const categoryTypeCards: Array<{ value: CategoryType; label: string; description: string }> = [
  { value: 'EXPENSE', label: 'Despesa', description: 'Compras, contas e gastos.' },
  { value: 'INCOME', label: 'Receita', description: 'Salário, rendimentos e entradas.' },
];

/** O tipo nunca muda depois que a categoria existe (a API devolve CATEGORY_TYPE_IMMUTABLE). */
export function categoryTypeLocked(isEditing: boolean) {
  return isEditing;
}

export type MonthlyLimitInput = { amount: number; year: number; month: number; currency: SupportedCurrency };

/**
 * Limite mensal opcional da criação: só vale para despesa, com valor positivo, no mês de `now`.
 * Vazio ou inválido devolve null (a categoria é criada sem limite).
 */
export function readMonthlyLimit(args: {
  type: CategoryType;
  value: string;
  currency: SupportedCurrency;
  now?: Date;
}): MonthlyLimitInput | null {
  if (args.type !== 'EXPENSE') return null;

  const amount = parseMoneyInputToCents(args.value);
  if (amount === null) return null;

  const now = args.now ?? new Date();
  return { amount, year: now.getFullYear(), month: now.getMonth() + 1, currency: args.currency };
}

/** Texto do campo de limite: avisa quando o valor digitado não é um valor válido. */
export function isMonthlyLimitInvalid(value: string) {
  return value.trim() !== '' && parseMoneyInputToCents(value) === null;
}
