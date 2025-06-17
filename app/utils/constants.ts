import { ReportType } from "@/app/types/reports";

export const REPORT_TYPES: { value: ReportType; label: string }[] = [
  { value: "summary", label: "Resumo Geral" },
  { value: "by-account", label: "Por Conta" },
  { value: "annual-by-account", label: "Por Conta (Anual)" },
  { value: "annual-by-account-type-category", label: "Por Conta/Tipo/Categoria (Anual)" },
  { value: "by-account-category", label: "Por Conta/Categoria" },
  { value: "by-account-type-category", label: "Por Conta/Tipo/Categoria" },
  { value: "investment", label: "Relatório de Investimentos" },
];

export const COLORS = {
  income: [39, 174, 96] as [number, number, number], // Green
  expense: [231, 76, 60] as [number, number, number], // Red
  neutral: [52, 73, 94] as [number, number, number], // Dark gray
  primary: [22, 160, 133] as [number, number, number], // Teal
  secondary: [41, 128, 185] as [number, number, number], // Blue
  white: [255, 255, 255] as [number, number, number],
};

export const MONTHS = Array.from({ length: 12 }, (_, i) => {
  const monthName = new Date(2000, i, 1).toLocaleString('default', { month: 'long' });
  return {
    value: i + 1,
    label: monthName.charAt(0).toUpperCase() + monthName.slice(1)
  };
});

export const getYears = () => {
  return Array.from({ length: 11 }, (_, i) => {
    const year = new Date().getFullYear() - 5 + i;
    return { value: year, label: String(year) };
  });
};