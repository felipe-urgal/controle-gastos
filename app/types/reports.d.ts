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
    accounts: {
      accountId: string;
      accountName: string;
      balance: number;
      currency: string;
      totalInvested: number;
      currentValue: number;
      return: {
        absolute: number;
        percentage: number;
      };
      tickers: {
        ticker: string;
        quantity: number;
        totalInvested: number;
        currentValue: number;
        avgPrice: number;
        currentPrice: number;
        operations: {
          buy: {
            date: string;
            quantity: number;
            unitPrice: number;
            totalAmount: number;
          }[];
          sell: {
            date: string;
            quantity: number;
            unitPrice: number;
            totalAmount: number;
          }[];
          other: {
            date: string;
            quantity: number;
            unitPrice: number;
            totalAmount: number;
          }[];
        };
      }[];
    }[];
    totalInvested: number;
    totalCurrentValue: number;
    totalReturn: {
      absolute: number;
      percentage: number;
    };
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