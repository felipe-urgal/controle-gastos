export type CategoryType = "INCOME" | "EXPENSE";

export interface CategoryModel {
  id: string;
  name: string;
  color?: string | null;
  icon?: string | null;
  isActive: boolean;
  type: CategoryType;
  description?: string | null;
  position: number;
  transactionsCount: number;
  createdAt: string;
  updatedAt: string;
};

export interface CategoryResponse {
  status: string | number;
  success: boolean;
  message: string;
  data: {
    items: CategoryModel[];
  };
};

