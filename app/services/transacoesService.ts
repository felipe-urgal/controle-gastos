export type Transacao = {
  id: number;
  valor: number;
  valorUnitario: number;
  quantidade: number;
  tipo: "renda" | "despesa" | "investimentos";
  descricao: string;
  data: string;
  mes: number;
  ano: number;
  categoriaId?: string;
  categoria?: string;
};

export async function fetchTransacoes(userId: string): Promise<Transacao[]> {
  try {
    const res = await fetch(`/api/transacoes/todas?userId=${userId}`);

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
  mesSelecionado: number,
  anoSelecionado: number,
  page: number = 1,
  itemsPerPage: number = 5,
  tipo?: string,
  categoria?: string,
  search?: string
): Promise<{
  data: Transacao[];
  pagination: {
    totalItems: number;
    totalPages: number;
    currentPage: number;
    itemsPerPage: number;
  };
  allTransacoes: Transacao[];
}> {
  const params = new URLSearchParams({
    userId,
    mes: mesSelecionado.toString(),
    ano: anoSelecionado.toString(),
    page: page.toString(),
    itemsPerPage: itemsPerPage.toString()
  });

  if (tipo) params.append("tipo", tipo);
  if (categoria) params.append("categoria", categoria);
  if (search) params.append("search", search);

  const url = `/api/transacoes?${params.toString()}`;
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`Erro na requisição: ${res.status}`);
  }

  return await res.json();
}