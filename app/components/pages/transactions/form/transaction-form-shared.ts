import { FormData } from '@/app/lib/interface/transaction.interface';
import { OfflineTransactionQueueItem, OfflineTransactionQueuePayload } from '@/app/lib/pwa/offline-transaction-queue';
import { todayLogicalDate } from '@/app/lib/date/logical-date';

export interface TransactionFormProps {
  transaction?: any;
  isEditing: boolean;
  initialDate?: Date;
  initialValues?: FormData;
  onSuccess?: (savedTransaction?: any) => void;
  onCancelOverride?: () => void;
  initialCategoryType?: 'INCOME' | 'EXPENSE' | null;
  onSelectTransfer?: () => void;
  offlineOwnerUserId?: string;
  offlineDraftId?: string | null;
  onOfflineQueueChanged?: () => void;
  reviewingQueueItem?: OfflineTransactionQueueItem | null;
  onReviewedQueueItem?: (payload: OfflineTransactionQueuePayload) => void;
  /** Abre o formulário já no modo escolhido (ex.: "recurring" ao agendar a partir de um modelo). */
  initialCreationMode?: CreationMode;
}

export type CreationMode = 'single' | 'recurring' | 'installment';

export type RecurrenceMode = 'count' | 'endDate';

export type CategoryType = 'INCOME' | 'EXPENSE';

export function initialTransactionFormData({
  transaction,
  isEditing,
  initialDate,
  initialValues,
}: Pick<
  TransactionFormProps,
  'transaction' | 'isEditing' | 'initialDate' | 'initialValues'
>): FormData {
  if (initialValues) return initialValues;

  if (isEditing && transaction) {
    return {
      amount: transaction.amount,
      month: transaction.month,
      year: transaction.year,
      day: transaction.day,
      description: transaction.description || '',
      status: transaction.status,
      accountId: transaction.account?.id || '',
      categoryId: transaction.category?.id || '',
      merchantId: transaction.merchant?.id ?? null,
      allocations: transaction.allocations?.map((allocation: any) => ({
        categoryId: allocation.category.id,
        amount: allocation.amount,
      })) ?? [],
      tagIds: transaction.tags?.map((tag: { id: string }) => tag.id) ?? [],
    };
  }

  const base = initialDate
    ? { year: initialDate.getFullYear(), month: initialDate.getMonth() + 1, day: initialDate.getDate() }
    : todayLogicalDate();
  return {
    amount: 0,
    month: base.month,
    year: base.year,
    day: base.day,
    description: '',
    status: 'COMPLETED',
    accountId: '',
    categoryId: '',
    merchantId: null,
    allocations: [],
    tagIds: [],
  };
}
