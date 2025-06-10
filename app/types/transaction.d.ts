import { Prisma } from '@prisma/client';
import { GetParams } from './params';
import { Pagination } from './components';

export type TransactionFormData = {
  id?: string;
  amount: number;
  unitPrice?: number;
  type: string;
  description: string;
  transactionDate: Date;
  userId: string;
  quantity?: number;
  categoryId: string | null;
  accountId: string | null;
  investmentType?: string;
};

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
  };
  pagination: Pagination;
}

export interface GetTransactionsParams extends GetParams {
  type?: string;
  month?: string;
  year?: string;
}