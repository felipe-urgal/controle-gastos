import { Prisma } from '@prisma/client';

export function formatCurrency(value: number | Prisma.Decimal): string {
  const num = typeof value === 'number' ? value : Number(value.toString());
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(num);
}

export const formatarData = (dataISO: string) => {
  const [ano, mes, dia] = dataISO.split("T")[0].split("-");
  return `${dia}/${mes}/${ano}`;
};

export const months = [
  "Janeiro", "Fevereiro", "Março",
  "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro",
  "Outubro", "Novembro", "Dezembro"
];

export const AccountType = [
  { id: "CHECKING", name: "Conta Corrente" },
  { id: "SAVINGS", name: "Conta Poupança" },
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
  { id: 'INVESTMENT', name: 'Investimentos' }
];
