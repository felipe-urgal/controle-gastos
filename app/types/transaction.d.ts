import type { CurrencyFinancialSummary } from '@/app/types/financial-summary';

export type TransactionType = "INCOME" | "EXPENSE";

export type TransactionStatus = "COMPLETED" | "PENDING" | "CANCELLED";

export type ReconciliationStatus = "UNCLEARED" | "CLEARED" | "RECONCILED";

export type TransactionKind = "NORMAL" | "TRANSFER";

export type TransferRole = "SOURCE" | "DESTINATION";

export type TransactionSeriesType = "RECURRING" | "INSTALLMENT";

export type RecurrenceFrequency = "WEEKLY" | "MONTHLY" | "YEARLY";

export type TransactionSeriesDTO = {
  id: string;
  type: TransactionSeriesType;
  frequency: RecurrenceFrequency;
  interval: number;
  description?: string | null;
  anchorDay: number;
  occurrenceCount: number;
  start: {
    year: number;
    month: number;
    day: number;
  };
  end: {
    year: number;
    month: number;
    day: number;
  };
};

export type TransactionDTO = {
  id: string;
  amount: number;
  type: TransactionType;
  kind: TransactionKind;
  description: string;
  status: TransactionStatus;
  reconciliationStatus: ReconciliationStatus;
  reconciledAt: string | null;
  year: number;
  month: number;
  day: number;

  account: {
    id: string;
    name: string;
    currency: string;
    type: string;
    color: string;
    icon: string;
  };

  category: {
    id: string;
    name: string;
    type: string;
    color: string;
    icon: string;
  };

  series?: TransactionSeriesDTO | null;
  seriesIndex?: number | null;

  transferId?: string | null;
  transferRole?: TransferRole | null;

  createdAt: string;
  updatedAt: string;
};

export type TransactionFormData = {
  id?: string;
  amount: number;
  type: TransactionType;
  description: string;
  categoryId: string;
  accountId: string;
  day: number;
  month: number;
  year: number;
  status?: TransactionStatus;
};

export type MonthlyRecurrenceInput =
  | { mode: "count"; occurrences: number }
  | { mode: "endDate"; endDate: string };

export type CreateMonthlyRecurringTransactionInput = {
  transaction: {
    amount: number;
    description: string;
    categoryId: string;
    accountId: string;
    day: number;
    month: number;
    year: number;
    status: TransactionStatus;
    type: TransactionType;
  };
  recurrence: MonthlyRecurrenceInput;
};

export type CreateMonthlyRecurringTransactionResponse = {
  series: TransactionSeriesDTO;
  occurrenceCount: number;
  firstOccurrence: TransactionDTO;
};

export type CreateInstallmentTransactionInput = {
  transaction: {
    amount: number;
    description: string;
    categoryId: string;
    accountId: string;
    day: number;
    month: number;
    year: number;
    status: TransactionStatus;
    type: "EXPENSE";
  };
  installmentCount: number;
};

export type CreateInstallmentTransactionResponse = {
  series: TransactionSeriesDTO;
  occurrenceCount: number;
  firstOccurrence: TransactionDTO;
};

export interface TransactionShowResponse {
  success: boolean;
  message?: string;
  data: TransactionDTO;
};

export interface TransactionListResponse {
  success: boolean;
  message: string;
  data: {
    items: TransactionDTO[];
    summary?: CurrencyFinancialSummary[];
  };
};

export interface GetTransactionsParams {
  month?: number;
  year?: number;
  account?: string;
  day?: number;
  status?: TransactionStatus;
};
