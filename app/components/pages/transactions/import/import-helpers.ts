import { formatCurrency } from '@/app/lib/currency/format-currency';
import { MerchantAliasOperator } from '@/app/types/merchant-alias';
import { TransactionImportConfirmData, TransactionImportPreviewData, TransactionImportPreviewItem, TransactionImportQifDateOrder } from '@/app/types/transaction-import';

export type QifDateOrder = TransactionImportQifDateOrder;

export type InboxState = 'review' | 'ready' | 'duplicate' | 'ignored';

export type InboxFilter = 'all' | InboxState;

export type PreviewItem = TransactionImportPreviewItem;

export type EditablePreviewItem = PreviewItem & {
  selected: boolean;
  categoryId: string | null;
  merchantId: string | null;
  merchantReviewed: boolean;
  learnMerchantAlias: boolean;
  merchantAliasOperator: MerchantAliasOperator;
  ignored: boolean;
};

export type PreviewData = TransactionImportPreviewData;

export type ConfirmData = TransactionImportConfirmData;

export const inboxFilters: Array<{ value: InboxFilter; label: string }> = [
  { value: 'all', label: 'Todas' },
  { value: 'review', label: 'Precisa revisar' },
  { value: 'ready', label: 'Prontas' },
  { value: 'duplicate', label: 'Já importadas' },
  { value: 'ignored', label: 'Ignoradas' },
];

export function formatAmount(cents: number, currency = 'BRL', showValues = true) {
  if (!showValues) return '••••';

  return formatCurrency(cents, currency);
}

export function getReviewReasons(item: EditablePreviewItem) {
  const reasons: string[] = [];
  if (item.errors.length > 0) reasons.push('Dados inválidos');
  if (item.importRuleConflict && !item.categoryId) reasons.push('Conflito entre regras');
  if (!item.categoryId && item.errors.length === 0) reasons.push('Categoria não definida');
  if (item.merchantAliasConflict && !item.merchantReviewed) reasons.push('Conflito entre estabelecimentos');
  if (!item.merchantReviewed && !item.merchantAliasConflict) reasons.push('Estabelecimento não reconhecido');
  return reasons;
}

export function getInboxState(item: EditablePreviewItem): InboxState {
  if (item.duplicate) return 'duplicate';
  if (item.ignored || !item.selected) return 'ignored';
  return getReviewReasons(item).length === 0 ? 'ready' : 'review';
}

export function stateLabel(state: InboxState) {
  if (state === 'review') return 'Precisa revisar';
  if (state === 'ready') return 'Pronta';
  if (state === 'duplicate') return 'Já importada';
  return 'Ignorada';
}

export function stateClass(state: InboxState) {
  if (state === 'ready') {
    return 'border-[var(--income)]/35 bg-[var(--primary-subtle)] text-[var(--income)]';
  }
  if (state === 'review') {
    return 'border-[var(--warning)]/40 bg-[var(--warning-subtle)] text-[var(--warning)]';
  }
  if (state === 'duplicate') {
    return 'border-[var(--border-strong)] bg-[var(--surface-subtle)] text-[var(--text-muted)]';
  }
  return 'border-[var(--border)] bg-[var(--background)] text-[var(--text-subtle)]';
}

export function toConfirmItem(item: EditablePreviewItem) {
  return {
    index: item.index,
    source: item.source,
    date: item.date,
    amountCents: item.amountCents,
    type: item.type,
    description: item.description,
    ...(item.externalId ? { externalId: item.externalId } : {}),
    ...(item.currency ? { currency: item.currency } : {}),
    errors: item.errors,
    fingerprint: item.fingerprint,
    duplicate: item.duplicate,
    selected: item.selected && !item.ignored,
    categoryId: item.categoryId,
    merchantId: item.merchantId,
    learnMerchantAlias: item.learnMerchantAlias,
    merchantAliasOperator: item.merchantAliasOperator,
  };
}
