import { Prisma } from '@prisma/client';
import { GetParams } from './params';
import { Pagination } from './components';

export type InvestmentFormData = {
  id?: string;
  amount: number;
  unitPrice: number;
  type: string;
  description: string;
  investmentDate: Date;
  userId: string;
  quantity: number;
  accountId: string;
  ticker: string;
};

export interface InvestmentPayload {
  id?: string;
  amount: number;
  type: string;
  description: string;
  investmentDate: Date;
  userId: string;
  accountId: string;
  unitPrice: number;
  quantity: number;
  ticker: string;
}

export type InvestmentModel = Prisma.InvestmentGetPayload<{
  include: {
    account: { select: { id: true, name: true } };
  };
}>;

export interface InvestmentResponse {
  success: true;
  data: {
    items: InvestmentModel[];  // Note the singular 'account' as per your error
    total: number;
  };
  pagination: Pagination;
}

export interface GetInvestmentParams extends GetParams {
  type?: string;
  account?: string;
}