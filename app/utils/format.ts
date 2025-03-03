export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

export const formatarData = (dataISO: string) => {
  const [ano, mes, dia] = dataISO.split("T")[0].split("-");
  return `${dia}/${mes}/${ano}`;
};

export const MESES_NOME = [
  "Janeiro", "Fevereiro", "Março",
  "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro",
  "Outubro", "Novembro", "Dezembro"
];

