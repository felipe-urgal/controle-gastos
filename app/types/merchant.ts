export type MerchantDTO = {
  id: string;
  name: string;
  isActive: boolean;
  transactionsCount: number;
  aliasesCount: number;
  /** Gasto do mês por moeda; só vem na listagem. */
  monthSpend?: MerchantSpend[];
  createdAt: string;
  updatedAt: string;
};

export type MerchantSpend = {
  currency: "BRL" | "USD" | "EUR";
  /** Despesa líquida do mês atual. */
  expense: number;
  /** Despesa líquida do mês anterior. */
  previousExpense: number;
  count: number;
};

export type MerchantMonthSummary = {
  /** Uma entrada por moeda com gasto, a de maior valor em estabelecimentos primeiro. */
  currencies: Array<{
    currency: "BRL" | "USD" | "EUR";
    assigned: number;
    unassigned: number;
    top: Array<{ id: string; name: string; expense: number }>;
  }>;
};
