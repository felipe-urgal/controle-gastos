import { formatCurrency } from '@/app/lib/currency/format-currency';
import { wrappableMoney } from '@/app/lib/currency/wrappable-money';

/** Valor monetário para telas com "ocultar valores": mascarado ou formatado com quebra de linha segura. */
export function displayMoney(amount: number, showValues: boolean, currency: string): string {
  return showValues ? wrappableMoney(formatCurrency(amount, currency)) : '••••';
}
