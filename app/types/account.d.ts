import { Prisma } from '@prisma/client';
import { GetParams } from './params';

export type AccountModel = Prisma.Account;

export interface AccountResponse {
  status: string | number;
  success: boolean;
  message: string;
  data: {
    items: AccountModel[];
  };
}

export interface GetAccountsParams extends GetParams {
  type?: string;
}

export type AccountType = 'CREDIT_DEBIT' | 'INVESTMENT'; 