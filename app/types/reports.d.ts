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

export interface InvestimentReport {
  data: {
    totalInvested: number;
    totalCurrentValue: number;
    totalReturn: {
      absolute: number;
      percentage: number;
    };
    assetAllocation: {
      asset: string;
      totalAmount: number;
      totalQuantity: number;
      percentage: number;
      costBasis: number;
      unrealizedGain: number;
    }[];
    recentTransactions: {
      date: Date;
      asset: string;
      type: 'BUY' | 'SELL';
      quantity: number;
      unitPrice: number;
      totalAmount: number;
    }[];
    assetTransactionHistory: {
      asset: string;
      transactions: {
        date: Date;
        type: 'BUY' | 'SELL';
        quantity: number;
        unitPrice: number;
        totalAmount: number;
        accountName: string;
      }[];
    }[];
  }
}

export interface AnnualByAccount {
  data: {
    year: number;
    accounts: {
      accountId: string;
      accountName: string;
      currency: string;
      monthlyData: {
        month: number;
        income: number;
        expense: number;
        investment: number;
        balance: number;
      }[];
      annualTotals: {
        income: number;
        expense: number;
        investment: number;
        balance: number;
      };
    }[];
    annualTotals: {
      income: number;
      expense: number;
      investment: number;
      balance: number;
    };
  }
}

export interface AnnualAccountTypeCategoryReport {
  data: {
    year: number;
    accounts: {
      accountId: string;
      accountName: string;
      currency: string;
      monthlyData: {
        month: number;
        income: number;
        expense: number;
        investment: number;
        balance: number;
        types: {
          type: string;
          total: number;
          categories: {
            categoryId: string | null;
            categoryName: string | undefined;
            amount: number;
          }[];
        }[];
      }[];
      annualTotals: {
        income: number;
        expense: number;
        investment: number;
        balance: number;
      };
      annualTypes: {
        type: string;
        total: number;
        categories: {
          categoryId: string | null;
          categoryName: string | undefined;
          amount: number;
        }[];
      }[];
    }[];
    annualTotals: {
      income: number;
      expense: number;
      investment: number;
      balance: number;
    };
  }
}