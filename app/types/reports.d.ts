// src/app/services/reports/types.ts

export interface SummaryReport {
  data: SummaryReportData
}

export interface AccountReport {
  data: AccountReportData
}

export interface AccountCategoryReport {
  data: AccountCategoryReportData
}

export interface AccountTypeCategoryReport {
  data: AccountTypeCategoryReportData
}

export interface InvestmentReport {
  data: InvestmentReportData
}

export interface AnnualByAccount {
  data: AnnualAccountReportData
}

export interface AnnualAccountTypeCategoryReport {
  data: AnnualAccountTypeCategoryReportData
}

export interface SummaryReportData {
  income: number;
  expense: number;
  balance: number;
  categories: {
    categoryName: string;
    type: "INCOME" | "EXPENSE";
    amount: number;
  }[];
}

export interface AccountReportData {
  accounts: {
    accountId: string;
    accountName: string;
    income: number;
    expense: number;
    balance: number;
  }[];
  totals: {
    income: number;
    expense: number;
    balance: number;
  };
}

export interface AccountCategoryReportData {
  accounts: {
    accountId: string;
    accountName: string;
    income: number;
    expense: number;
    balance: number;
    categories: {
      categoryId: string | null;
      categoryName: string | undefined;
      income: number;
      expense: number;
    }[];
  }[];
}

export interface AccountTypeCategoryReportData {
  year: number;
  month: number;
  accounts: {
    accountId: string;
    accountName: string;
    income: number;
    expense: number;
    balance: number;
    types: {
      type: "INCOME" | "EXPENSE";
      total: number;
      categories: {
        categoryId: string | null;
        categoryName: string | undefined;
        amount: number;
      }[];
    }[];
  }[];
}

export interface InvestmentReportData {
  accounts: {
    accountId: string;
    accountName: string;
    balance: number;
    currency: string;
    totalInvested: number;
    currentValue: number;
    totalDividends: number;
    return: {
      absolute: number;
      percentage: number;
    };
    tickers: {
      ticker: string;
      quantity: number;
      totalInvested: number;
      totalDividends: number;
      currentValue: number;
      avgPrice: number;
      currentPrice: number;
      operations: {
        BUY: {
          date: string;
          quantity: number;
          unitPrice: number;
          totalAmount: number;
          type: string;
        }[];
        SELL: {
          date: string;
          quantity: number;
          unitPrice: number;
          totalAmount: number;
          type: string;
        }[];
        DIVIDEND: {
          date: string;
          quantity: number;
          unitPrice: number;
          totalAmount: number;
          type: string;
        }[];
        OTHER: {
          date: string;
          quantity: number;
          unitPrice: number;
          totalAmount: number;
          type: string;
        }[];
      };
    }[];
  }[];
  totalInvested: number;
  totalCurrentValue: number;
  totalDividends: number;
  totalReturn: {
    absolute: number;
    percentage: number;
  };
}

export interface AnnualAccountReportData {
  year: number;
  accounts: {
    accountId: string;
    accountName: string;
    monthlyData: {
      month: number;
      income: number;
      expense: number;
      balance: number;
    }[];
    annualTotals: {
      income: number;
      expense: number;
      balance: number;
    };
  }[];
  annualTotals: {
    income: number;
    expense: number;
    balance: number;
  };
}

export interface AnnualAccountTypeCategoryReportData {
  year: number;
  accounts: {
    accountId: string;
    accountName: string;
    monthlyData: {
      month: number;
      income: number;
      expense: number;
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
    balance: number;
  };
}

export type ReportData = SummaryReportData | AccountReportData | 
                        AccountCategoryReportData | AccountTypeCategoryReportData | 
                        InvestmentReportData | AnnualAccountReportData |
                        AnnualAccountTypeCategoryReportData;

export type ReportType = 
  "summary" | "by-account" | "annual-by-account" | 
  "annual-by-account-type-category" | "by-account-category" | 
  "by-account-type-category" | "investment";