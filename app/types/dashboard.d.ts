import { TransactionModel } from "./transaction"

export interface DashboardResponse {
  transactions: TransactionModel[];
  analytics: {
    total: number;
    count: number;
    byAccount: {
      accountId: string;
      accountName: string;
      total: number;
      count: number;
      byType: {
        income: {
          total: number;
          byCategory: ByCategory[];
        };
        expense: {
          total: number;
          byCategory: ByCategory[];
        };
        investment: {
          total: number;
          byCategory: ByCategory[];
        };
      };
    }[];
    byType: ByType;
  };
}

export interface GetDashboardParams {
  month?: string;
  year?: string;
}

export interface ByType {
  expense: number;
  income: number;
  investment: number;
}

export interface ByCategory {
  categoryId: string;
  categoryName: string;
  total: number;
}