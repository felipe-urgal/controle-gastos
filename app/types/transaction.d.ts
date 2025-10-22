import { Prisma } from '@prisma/client';
import { GetParams } from './params';
import { Pagination } from './components';

export type TransactionFormData = {
  id?: string;
  amount: number;
  type: string;
  description: string;
  userId: string;
  categoryId: string | null;
  accountId: string | null;
  day?: number;
  month?: number;
  year?: number;
  status?: string;
};

export interface TransactionPayload {
  id?: string;
  amount: number;
  type: string;
  description: string;
  userId: string;
  categoryId: string | null;
  accountId: string | null;
  repeatMonths?: number;
}

export type TransactionModel = Prisma.TransactionGetPayload<{
  include: {
    account: { select: { id: true, name: true } };
    category: { select: { id: true, name: true } };
  };
}>;

export interface TransactionResponse {
  success: true;
  data: {
    items: TransactionModel[];  // Note the singular 'account' as per your error
    total: number;
    additionalData: {
      income: string;
      expenses: string;
    };
  };
  pagination: Pagination;
}

export interface GetTransactionsParams extends GetParams {
  type?: string;
  month?: string;
  year?: string;
  category?: string;
  account?: string;
  day?: string;
}

// app/types/transaction.ts
export interface Transaction {
  id: string;
  amount: number;
  type: 'INCOME' | 'EXPENSE';
  description: string;
  status: 'COMPLETED' | 'PENDING' | 'CANCELLED';
  year: number;
  month: number;
  day: number;
  userId: string;
  accountId: string;
  categoryId: string | null;
  createdAt: Date;
  updatedAt: Date;
  account?: {
    id: string;
    name: string;
    currency: string;
    type: string;
    color: string;
    icon: string;
  };
  category?: {
    id: string;
    name: string;
    color: string;
    icon: string;
    type: string;
  };
}