export type TransactionType = "INCOME" | "EXPENSE";

export type TransactionStatus =
  | "COMPLETED"
  | "PENDING"
  | "CANCELLED";

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
    additionalData?: {
      income: number;
      expenses: number;
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


