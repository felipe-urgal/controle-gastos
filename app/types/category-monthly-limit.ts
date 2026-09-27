import type { SupportedCurrency } from '@/app/types/financial-summary';

export type CategoryMonthlyLimitSummary = {
  id: string;
  amount: number;
  currency: SupportedCurrency;
};

export type CategoryMonthlyLimitItem = {
  category: {
    id: string;
    name: string;
    color: string;
    icon: string;
    isActive: boolean;
  };
  currency: SupportedCurrency;
  limit: CategoryMonthlyLimitSummary | null;
  realized: number;
  committed: number;
  consumption: number;
  remaining: number | null;
  available: number | null;
  percentage: number | null;
  isOverBudget: boolean;
};

export type CategoryMonthlyLimitListResponse = {
  year: number;
  month: number;
  currency: SupportedCurrency;
  items: CategoryMonthlyLimitItem[];
  summary: {
    budget: number;
    realized: number;
    committed: number;
    available: number;
    overBudgetCategories: number;
    realizedIncome: number;
    expectedIncome: number;
    totalIncome: number;
  };
};

export type UpsertCategoryMonthlyLimitInput = {
  categoryId: string;
  year: number;
  month: number;
  currency: SupportedCurrency;
  amount: number;
};


export type BatchCategoryMonthlyLimitsInput = {
  year: number;
  month: number;
  currency: SupportedCurrency;
  items: Array<{ categoryId: string; amount: number }>;
};

export type CopyCategoryMonthlyLimitsInput = {
  sourceYear: number;
  sourceMonth: number;
  targetYear: number;
  targetMonth: number;
  currency: SupportedCurrency;
};
