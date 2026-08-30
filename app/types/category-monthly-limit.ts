export type CategoryMonthlyLimitSummary = {
  id: string;
  amount: number;
};

export type CategoryMonthlyLimitItem = {
  category: {
    id: string;
    name: string;
    color: string;
    icon: string;
    isActive: boolean;
  };
  limit: CategoryMonthlyLimitSummary | null;
  realized: number;
  remaining: number | null;
  percentage: number | null;
};

export type CategoryMonthlyLimitListResponse = {
  year: number;
  month: number;
  items: CategoryMonthlyLimitItem[];
};

export type UpsertCategoryMonthlyLimitInput = {
  categoryId: string;
  year: number;
  month: number;
  amount: number;
};
