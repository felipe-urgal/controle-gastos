import type { TransactionType } from '@/app/types/transaction';

export type TransactionTemplateDTO = {
  id: string;
  name: string;
  type: TransactionType;
  description: string;
  amount: number | null;
  isFavorite: boolean;
  position: number;
  account: {
    id: string;
    name: string;
    currency: string;
    isActive: boolean;
  } | null;
  category: {
    id: string;
    name: string;
    type: TransactionType;
    isActive: boolean;
  } | null;
  createdAt: string;
  updatedAt: string;
};

export type TransactionTemplateInput = {
  name: string;
  type: TransactionType;
  description?: string;
  amount?: number | null;
  isFavorite?: boolean;
  position?: number;
  accountId?: string | null;
  categoryId?: string | null;
};
