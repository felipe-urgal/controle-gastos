import type { TransactionType } from '@/app/types/transaction';

export type TransactionTemplateDTO = {
  id: string;
  name: string;
  type: TransactionType;
  description: string;
  amount: number | null;
  isFavorite: boolean;
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

export type TransactionTemplateListResponse = {
  items: TransactionTemplateDTO[];
  total: number;
  page?: number;
  pageSize?: number;
  totalPages?: number;
};

export type TransactionTemplateInput = {
  name: string;
  type: TransactionType;
  description?: string;
  amount?: number | null;
  isFavorite?: boolean;
  accountId?: string | null;
  categoryId?: string | null;
};
