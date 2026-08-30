import { FilterField } from "@/app/components/navigation/dynamic-filters";
import { monthOptions, yearOptions } from "@/app/lib/date/constants";

export const statusOptions = [
  { value: "COMPLETED", label: "Concluída" },
  { value: "PENDING", label: "Pendente" },
  { value: "CANCELLED", label: "Cancelada" },
];

export const statusConfig = {
  COMPLETED: {
    label: "Concluída",
    color: "bg-[var(--primary-subtle)] text-[var(--income)] border-[var(--primary)]/35",
  },
  PENDING: {
    label: "Pendente",
    color: "bg-[var(--warning-subtle)] text-[var(--pending)] border-[var(--warning)]/35",
  },
  CANCELLED: {
    label: "Cancelada",
    color: "bg-[var(--danger-subtle)] text-[var(--expense)] border-[var(--danger)]/35",
  },
};

export const transactionFilters = [
  {
    type: "search",
    key: "search",
    placeholder: "Buscar transação...",
  },
  {
    type: "select",
    key: "status",
    label: "Status",
    options: statusOptions,
  },
  {
    type: "select",
    key: "month",
    label: "Mês",
    options: monthOptions,
  },
  {
    type: "select",
    key: "year",
    label: "Ano",
    options: yearOptions,
  },
] satisfies FilterField[];
