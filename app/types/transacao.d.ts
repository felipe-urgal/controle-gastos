// types/transacao.d.ts
export type TransacaoTipo = "renda" | "despesa" | "investimentos";

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
  categoriaId?: string;
  categoria?: string;
}

export interface Categoria {
  id: string;
  nome: string;
}

export interface Paginacao {
  paginaAtual: number;
  totalPaginas: number;
  totalItens: number;
  itensPorPagina: number;
}

export interface FiltrosTransacao {
  tipo: string;
  categoria: string;
  busca: string;
}