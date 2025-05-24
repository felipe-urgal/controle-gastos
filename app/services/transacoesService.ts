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
    const res = await fetch(`/api/transacoes?userId=${userId}`);

    if (!res.ok) {
      throw new Error(`Erro na requisição: ${res.status}`);
    }

    return await res.json();
  } catch (error) {
    console.error("Erro ao buscar transações:", error);
    throw error;
  }
}


export async function fetchTransacao(userId: string, mesSelecionado: number, anoSelecionado: number): Promise<Transacao[]> {
  const url = `/api/transacoes?userId=${userId}&mes=${mesSelecionado}&ano=${anoSelecionado}`;
  const res = await fetch(url);
  const data: Transacao[] = await res.json();
  return data;
}

export async function deleteTransacao(id: number): Promise<void> {
  try {
    await fetch(`/api/transacoes`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
  } catch (error) {
    console.error("Erro ao remover transação:", error);
    throw new Error("Erro ao remover transação");
  }
}
