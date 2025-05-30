import { Prisma } from '@prisma/client';

// Tipo completo com todas as propriedades (incluindo relações)
export type AccountModel = Prisma.Account;

export interface ErrorResponse {
  success: boolean;
  error: string;
  details?: Record<string, unknown>;
}

export interface AccountResponse {
  success: true;
  data: {
    accounts: AccountModel[];  // Note the singular 'account' as per your error
    total: number;
  };
  pagination: {
    currentPage: number;
    totalPages: number;
  };
}