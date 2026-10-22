export type CategoryType = "INCOME" | "EXPENSE";

export interface CategoryActivity {
  /** Moeda dos valores; as demais com movimento aparecem em `otherCurrencies`. */
  currency: "BRL" | "USD" | "EUR";
  otherCurrencies: Array<"BRL" | "USD" | "EUR">;
  month: { year: number; month: number; realized: number; committed: number; limit: number | null };
  /** Seis meses, do mais antigo para o atual. */
  history: Array<{ year: number; month: number; realized: number }>;
  previousAverage: number;
  recent: Array<{
    id: string;
    amount: number;
    type: "INCOME" | "EXPENSE";
    status: "PENDING" | "COMPLETED";
    description: string;
    year: number;
    month: number;
    day: number;
    account: { id: string; name: string; currency: string };
  }>;
}

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
  /** Só vem na leitura de uma categoria. */
  activity?: CategoryActivity | null;
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
