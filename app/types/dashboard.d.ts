import { TransactionModel } from "./transaction";
import { InvestmentModel } from "./investment";

export interface DashboardResponse {
  transactions: TransactionModel[];
  investments: InvestmentModel[]; // Novo campo para investimentos
  analytics: {
    total: number;
    transactionCount: number; // Renomeado para ser mais específico
    investmentCount: number; // Novo campo
    byAccount: {
      accountId: string;
      accountName: string;
      accountType: string;
      total: number;
      transactionCount: number; // Renomeado
      investmentCount: number; // Novo campo
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
          buy: { 
            total: number;
            byTicker: ByTicker[]; // Alterado de byCategory para byTicker
          };
          sell: { 
            total: number;
            byTicker: ByTicker[]; // Alterado de byCategory para byTicker
          };
          net: number;
        };
      };
    }[];
    byType: ByType & {
      investment: {
        buy: number;
        sell: number;
        net: number;
        byTicker: ByTicker[]; // Novo campo para agrupamento por ticker
      };
    };
  };
}

export interface GetDashboardParams {
  month?: string;
  year?: string;
}

export interface ByType {
  expense: number;
  income: number;
}

export interface ByCategory {
  categoryId: string | null; // Permitindo null
  categoryName: string;
  total: number;
}

// Novo tipo para agrupamento por ticker
export interface ByTicker {
  ticker: string | null; // Permitindo null
  total: number;
}