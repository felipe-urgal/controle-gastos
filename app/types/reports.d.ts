// src/app/services/reports/types.ts

export interface SummaryReport {
  data: {
    year: number;
    month: number;
    income: number;
    expense: number;
    balance: number;
    investments: {
      buys: number;
      sells: number;
      net: number;
    };
    categories: {
      categoryId: string | null;
      categoryName: string;
      type: 'INCOME' | 'EXPENSE';
      amount: number;
    }[];
  };
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
      balance: number;
      investments: {
        buys: number;
        sells: number;
        net: number;
      };
    }[];
    totals: {
      income: number;
      expense: number;
      balance: number;
      investments: {
        buys: number;
        sells: number;
        net: number;
      };
    };
  };
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
      balance: number;
      investments: {
        buys: number;
        sells: number;
        net: number;
      };
      categories: {
        categoryId: string | null;
        categoryName: string | undefined;
        income: number;
        expense: number;
      }[];
    }[];
  };
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
      balance: number;
      investments: {
        buys: number;
        sells: number;
        net: number;
      };
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
  };
}

export interface InvestmentReport {
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
      accountName: string;
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
  };
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
        balance: number; // Removido investment daqui (agora está separado)
      }[];
      investments: { // Nova seção específica para investimentos
        buys: number; // Total de compras no ano
        sells: number; // Total de vendas no ano
        net: number; // Saldo líquido (vendas - compras)
      };
      annualTotals: {
        income: number;
        expense: number;
        balance: number;
        investmentNet: number; // Renomeado para ficar claro que é o saldo líquido
      };
    }[];
    annualTotals: {
      income: number;
      expense: number;
      balance: number;
      investments: { // Nova seção para totais de investimentos
        buys: number;
        sells: number;
        net: number;
      };
    };
  };
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
      investments: {
        buys: number;
        sells: number;
        net: number;
      };
      annualTotals: {
        income: number;
        expense: number;
        balance: number;
        investmentNet: number;
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
      investments: {
        buys: number;
        sells: number;
        net: number;
      };
    };
  };
}