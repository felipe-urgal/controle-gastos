import type { SupportedCurrency } from '@/app/types/financial-summary';

export type ForecastHorizonDays = 30 | 60 | 90;

export type ForecastLogicalDate = {
  year: number;
  month: number;
  day: number;
};

export type ForecastTimelinePoint = {
  date: ForecastLogicalDate;
  income: number;
  expense: number;
  transferDelta?: number;
  delta: number;
  balance: number;
};

export type ForecastAccount = {
  id: string;
  name: string;
  realizedBalance: number;
  pendingIncome: number;
  pendingExpense: number;
  projectedBalance: number;
  lowestProjectedBalance: number;
  lowestProjectedBalanceDate: ForecastLogicalDate;
  timeline: ForecastTimelinePoint[];
};

export type ForecastItem = ForecastLogicalDate & {
  id: string;
  accountId: string;
  amount: number;
  type: 'INCOME' | 'EXPENSE';
  kind: 'NORMAL' | 'TRANSFER';
  status: 'PENDING';
  description: string;
};

export type ForecastData = {
  currency: SupportedCurrency;
  asOf: ForecastLogicalDate;
  horizonDays: ForecastHorizonDays;
  horizonEnd: ForecastLogicalDate;
  accounts: ForecastAccount[];
  overdue: ForecastItem[];
  upcoming: ForecastItem[];
};
