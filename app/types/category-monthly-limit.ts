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
  remaining: number | null;
  percentage: number | null;
};

export type CategoryMonthlyLimitListResponse = {
  year: number;
  month: number;
  currency: SupportedCurrency;
  items: CategoryMonthlyLimitItem[];
};

export type UpsertCategoryMonthlyLimitInput = {
  categoryId: string;
  year: number;
  month: number;
  currency: SupportedCurrency;
  amount: number;
};
