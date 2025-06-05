// src/app/services/reports/types.ts

export interface SummaryReport {
  data: {
    year: number;
    month: number;
    income: number;
    expense: number;
    investment: number;
    balance: number;
    categories: {
      categoryId: string | null;
      categoryName: string;
      type: 'INCOME' | 'EXPENSE' | "INVESTMENT";
      amount: number;
    }[];
  }
}

export interface AccountReport {
  data: {
    year: number;
    month: number;
    accounts: {
      accountId: string;
      accountName: string;
      currency: string;
      income: number;
      expense: number;
      investment: number;
      balance: number;
    }[];
    totals: {
      income: number;
      expense: number;
      investment: number;
      balance: number;
    };
  }
}

export interface AccountCategoryReport {
  data: {
    year: number;
    month: number;
    accounts: {
      accountId: string;
      accountName: string;
      currency: string;
      income: number;
      expense: number;
      investment: number;
      balance: number;
      categories: {
        categoryId: string | null;
        categoryName: string;
        income: number;
        expense: number;
        investment: number;
      }[];
    }[];
  }
}

export interface AccountTypeCategoryReport {
  data: {
    year: number;
    month: number;
    accounts: {
      accountId: string;
      accountName: string;
      currency: string;
      income: number;
      expense: number;
      investment: number;
      balance: number;
      types: {
        type: "INCOME" | "EXPENSE" | "INVESTMENT" | string;
        total: number;
        categories: {
          categoryId: string | null;
          categoryName: string;
          amount: number;
        }[];
      }[];
    }[];
  };
}