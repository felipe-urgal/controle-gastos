import { Prisma, TransactionStatus, TransactionType } from '@prisma/client';

export { TransactionStatus, TransactionType };

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

export type TransactionModel = Prisma.TransactionGetPayload<{
  include: {
    account: { select: { id: true, name: true } };
    category: { select: { id: true, name: true } };
  };
}>;

export interface TransactionShowResponse {
  success: boolean;
  message?: string;
  data: TransactionModel;
}

export interface TransactionResponse {
  success: boolean;
  status: number;
  message: string;
  data: {
    items: TransactionModel[];
    additionalData: {
      income: string;
      expenses: string;
      balance: string;
    };
  };
}

export interface GetTransactionsParams {
  month?: string;
  year?: string;
  account?: string;
  day?: string;
}