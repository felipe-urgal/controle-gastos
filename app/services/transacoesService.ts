export type Transacao = {
  id: number;
  amount: number;
  unitPrice: number;
  quantity: number;
  type: "INVESTMENT" | "INCOME" | "EXPENSE" | "TRANSFER";
  description: string;
  data: string;
  month: number;
  year: number;
  categoryId?: string;
  category?: {
    id: string;
    name: string;
  } | null;
  accountId?: string;
  account?: {
    id: string;
    name: string;
  } | null;
  transactionDate?: string | number | Date;
};

export type Pagination = {
  totalItems: number;
  totalPages: number;
  currentPage: number;
  itemsPerPage: number;
  total: number;
};


interface TransactionAnalytics {
  total: number;
  count: number;
  byCategory: {
    categoryId: string | null;
    categoryName: string | null;
    total: number;
    count: number;
  }[];
  byType: {
    income: number;
    expense: number;
  };
}

export async function fetchTransacoes(userId: string): Promise<Transacao[]> {
  try {
    const res = await fetch(`/api/transactions/all?userId=${userId}`);

    if (!res.ok) {
      throw new Error(`Erro na requisição: ${res.status}`);
    }

    return await res.json();
  } catch (error) {
    console.error("Erro ao buscar transações:", error);
    throw error;
  }
}

export async function fetchTransacao(
  userId: string, 
  page: number = 1, 
  itemsPerPage: number = 5, 
  type?: string, 
  category?: string,
  account?: string,
  search?: string,
  month?: string,
  year?: string
): Promise<{ data: Transacao[]; pagination: Pagination; allTransacoes: Transacao[]; }> {
  const params = new URLSearchParams({
    userId,
    page: page.toString(),
    limit: itemsPerPage.toString() // usar limit para consistência com a API
  });

  if (type) params.append("type", type);
  if (category) params.append("categoryId", category); // usar categoryId para consistência
  if (account) params.append("accountId", account); // usar categoryId para consistência
  if (search) params.append("search", search);
  if (month) params.append("month", month);
  if (year) params.append("year", year);

  const url = `/api/transactions?${params.toString()}`;
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`Erro na requisição: ${res.status}`);
  }

  return await res.json();
}

export async function fetchTransactionsReports(
  userId: string,
  month: number,
  year: number,
  type?: string,
  category?: string
): Promise<{ transactions: Transacao[]; analytics: TransactionAnalytics }> {
  const params = new URLSearchParams({
    userId,
    month: month.toString(),
    year: year.toString(),
  });

  if (type) params.append("type", type);
  if (category) params.append("category", category);

  const url = `/api/transactions/reports?${params.toString()}`;
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`Erro na requisição: ${res.status}`);
  }

  return await res.json();
}