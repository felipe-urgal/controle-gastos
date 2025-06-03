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
      byType: ByType;
    }[];
    byCategory: {
      categoryId: string | null;
      categoryName: string | null;
      total: number;
      count: number;
      byType: ByType;
      byAccount: {
        accountId: string;
        accountName: string;
        total: number;
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