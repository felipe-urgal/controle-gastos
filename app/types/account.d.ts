export type AccountType = 'CREDIT_DEBIT' | 'INVESTMENT' | 'CREDIT_CARD';

export interface AccountModel {
  id: string;
  name: string;
  type: AccountType;
  balance: number;
  currency: string;
  isActive: boolean;
  color?: string | null;
  icon?: string | null;
  description?: string | null;
  creditLimit?: number | null;
  statementClosingDay?: number | null;
  statementDueDay?: number | null;
  createdAt: string;
  updatedAt: string;
  transactions: any[];
};

export interface AccountResponse {
  status: string | number;
  success: boolean;
  message: string;
  data: {
    items: AccountModel[];
  };
};
