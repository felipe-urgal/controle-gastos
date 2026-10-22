export type MerchantDTO = {
  id: string;
  name: string;
  isActive: boolean;
  transactionsCount: number;
  aliasesCount: number;
  /** Gasto do mês por moeda; só vem na listagem. */
  monthSpend?: MerchantSpend[];
  /** Só vem na leitura de um estabelecimento. */
  activity?: MerchantActivity | null;
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

export type MerchantActivity = {
  /** Moeda dos valores; as demais com gasto aparecem em `otherCurrencies`. */
  currency: "BRL" | "USD" | "EUR";
  otherCurrencies: Array<"BRL" | "USD" | "EUR">;
  month: { year: number; month: number; expense: number; previousExpense: number; count: number };
  /** Seis meses, do mais antigo para o atual. */
  history: Array<{ year: number; month: number; expense: number }>;
  previousAverage: number;
  /** Categoria com mais gasto nos seis meses (na moeda principal). */
  topCategory: { id: string; name: string; color: string; share: number } | null;
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
};
