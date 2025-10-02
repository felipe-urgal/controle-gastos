import { Prisma } from '@prisma/client';
import { GetParams } from './params';
import { Pagination } from './components';

// Tipo completo com todas as propriedades (incluindo relações)
export type AccountModel = Prisma.Account;

export interface AccountResponse {
  success: true;
  data: {
    items: AccountModel[];  // Note the singular 'account' as per your error
    total: number;
  };
  pagination: Pagination;
}

export interface GetAccountsParams extends GetParams {
  type?: string;
}

export type AccountType = 'CREDIT_DEBIT' | 'INVESTMENT'; 