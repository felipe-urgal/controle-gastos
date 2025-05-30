// types/transacao.d.ts
export type TransacaoTipo = "INVESTMENT" | "INCOME" | "EXPENSE" | "TRANSFER";

export interface Transacao {
  id: number;
  valor: number;
  valorUnitario: number;
  quantidade: number;
  tipo: TransacaoTipo;
  descricao: string;
  data: string;
  mes: number;
  ano: number;
  categoryId: string | null;
  category: string | null;
}

export interface FiltrosTransacao {
  tipo: string;
  categoria: string;
  busca: string;
}