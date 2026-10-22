import { formatCurrency } from '@/app/lib/currency/format-currency';
import type { AccountAttentionItem } from '@/app/types/account';

export type AttentionTone = 'urgent' | 'warning' | 'info';

export type AccountAttentionMessage = {
  title: string;
  detail: string;
  action: string;
  tone: AttentionTone;
};

function daysLabel(days: number) {
  if (days === 0) return 'vence hoje';
  if (days === 1) return 'vence amanhã';
  return `vence em ${days} dias`;
}

function dueDateLabel(item: AccountAttentionItem) {
  return item.dueDate
    ? `dia ${String(item.dueDate.day).padStart(2, '0')}/${String(item.dueDate.month).padStart(2, '0')}`
    : '';
}

/** Texto de cada aviso da lista de Contas; valores respeitam o modo de ocultar valores. */
export function accountAttentionMessage(item: AccountAttentionItem, showValues: boolean): AccountAttentionMessage {
  const money = (cents: number) => (showValues ? formatCurrency(cents, item.currency) : '••••');
  const days = item.daysUntilDue ?? 0;

  switch (item.kind) {
    case 'CARD_OVERDUE': {
      const late = Math.abs(days);
      return {
        title: `Fatura ${item.name} venceu${late === 0 ? ' hoje' : ` há ${late} ${late === 1 ? 'dia' : 'dias'}`}`,
        detail: `${money(item.amount)} · ${dueDateLabel(item)}`,
        action: 'Pagar',
        tone: 'urgent',
      };
    }
    case 'CARD_DUE_SOON':
      return {
        title: `Fatura ${item.name} ${daysLabel(days)}`,
        detail: `${money(item.amount)} · ${dueDateLabel(item)}`,
        action: 'Ver fatura',
        tone: days <= 3 ? 'urgent' : 'warning',
      };
    case 'NEGATIVE_BALANCE':
      return {
        title: `${item.name} está com saldo negativo`,
        detail: money(item.amount),
        action: 'Ver conta',
        tone: 'warning',
      };
    default:
      return {
        title: `${item.name} usou ${item.limitUsedPercent ?? 0}% do limite`,
        detail: `${money(item.amount)} em uso`,
        action: 'Ver cartão',
        tone: 'warning',
      };
  }
}
