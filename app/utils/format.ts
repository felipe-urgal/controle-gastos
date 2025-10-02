// import { Prisma } from '@prisma/client';

// export function formatCurrency(value: string | number | Prisma.Decimal): string {
//   const num = typeof value === 'number' ? value : Number(value.toString());
//   return new Intl.NumberFormat('pt-BR', {
//     style: 'currency',
//     currency: 'BRL'
//   }).format(num);
// }

export const formatCurrency = (value: number, currency: string = 'BRL') => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: currency
  }).format(value);
};

export const formatarData = (dataISO: string) => {
  const [ano, mes, dia] = dataISO.split("T")[0].split("-");
  return `${dia}/${mes}/${ano}`;
};

// Adicione esta função no seu arquivo de utils
export const formatDate = (date: Date | string): string => {
  const d = new Date(date);
  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

export const months = [
  "Janeiro", "Fevereiro", "Março",
  "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro",
  "Outubro", "Novembro", "Dezembro"
];

export const AccountType = [
  { id: "CHECKING", name: "Conta Corrente" },
  // { id: "SAVINGS", name: "Conta Poupança" },
  { id: "INVESTMENT", name: "Investimento" },
];

export const TypeCurrency = [
  { id: "BRL", name: "Real Brasileiro (R$)" },
  { id: "USD", name: "Dólar Americano (US$)" },
  { id: "EUR", name: "Euro (€)" },
  { id: "GBP", name: "Libra Esterlina (£)" },
  { id: "", name: "Outra" },
];

export const TransactionType = [
  { id: 'INCOME', name: 'Renda' },
  { id: 'EXPENSE', name: 'Despesa' },
];

export const InvestmentType = [
  { id: 'BUY', name: 'Compra' },
  { id: 'SELL', name: 'Venda' },
  { id: 'DIVIDEND', name: 'Dividendos Recebidos' },
];

