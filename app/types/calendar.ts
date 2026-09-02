import type { CurrencyFinancialSummary } from '@/app/types/financial-summary';

export interface Transaction {
  id?: string;
  _id?: string;
  amount?: string | number;
  type?: 'INCOME' | 'EXPENSE' | string;
  description?: string;
  transactionDate?: string;
  category?: {
    id?: string;
    name?: string;
    icon?: string;
    type?: string;
    [key: string]: any;
  };
  account?: {
    id?: string;
    name?: string;
    currency?: string;
    [key: string]: any;
  };
  categoryId?: string | null;
  accountId?: string;
  userId?: string;
  year?: number;
  month?: number;
  day?: number;
  status?: "PENDING" | "COMPLETED" | "CANCELLED" | string;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: any;
};

export interface Category {
  id?: string;
  _id?: string;
  name?: string;
  type?: string;
  icon?: string;
  color?: string;
  userId?: string;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: any;
};

export interface Account {
  id: string;
  name?: string;
  currency?: string;
  type?: string;
  balance?: number | string;
  userId?: string;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: any;
};

export interface CalendarDay {
  date?: Date;
  isCurrentMonth?: boolean;
  isToday?: boolean;
  summaries?: CurrencyFinancialSummary[];
  transactions?: Transaction[];
  [key: string]: any;
};
