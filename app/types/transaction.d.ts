export type TransactionType = "INCOME" | "EXPENSE";

export type TransactionStatus = "COMPLETED" | "PENDING" | "CANCELLED";

export type TransactionSeriesDTO = {
  id: string;
  frequency: "MONTHLY";
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
  description: string;
  status: TransactionStatus;
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
    type?: TransactionType;
  };
  recurrence: MonthlyRecurrenceInput;
};

export type CreateMonthlyRecurringTransactionResponse = {
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
    summary?: {
      income: number;
      expense: number;
      balance: number;
    };
  };
};

export interface GetTransactionsParams {
  month?: number;
  year?: number;
  account?: string;
  day?: number;
  status?: TransactionStatus;
};


