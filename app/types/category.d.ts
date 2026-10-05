export type CategoryType = "INCOME" | "EXPENSE";

export interface CategoryModel {
  id: string;
  name: string;
  color: string;
  icon: string;
  isActive: boolean;
  type: CategoryType;
  description: string | null;
  /**
   * Ordem persistida para compatibilidade com planejamento/importações.
   * A tela atual pode aplicar uma ordenação contextual por uso.
   */
  position: number;
  transactionsCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CategoryListData {
  items: CategoryModel[];
  total?: number;
  page?: number;
  pageSize?: number;
  totalPages?: number;
}

export interface CategoryResponse {
  success: boolean;
  message?: string;
  data: CategoryListData;
}
