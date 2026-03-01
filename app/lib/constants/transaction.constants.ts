import { FilterField } from "@/app/components/navigation/dynamic-filters";

export const statusOptions = [
  { value: "COMPLETED", label: "Concluída" },
  { value: "PENDING", label: "Pendente" },
  { value: "CANCELLED", label: "Cancelada" },
];

export const statusConfig = {
  COMPLETED: {
    label: "Concluída",
    color: "bg-green-500/20 text-green-400 border-green-500/30",
  },
  PENDING: {
    label: "Pendente",
    color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  },
  CANCELLED: {
    label: "Cancelada",
    color: "bg-red-500/20 text-red-400 border-red-500/30",
  },
};

export const transactionFilters = [
  {
    type: "search",
    key: "search",
    placeholder: "Buscar conta...",
  },
  // {
  //   type: "select",
  //   key: "isActive",
  //   label: "Status",
  //   options: [
  //     { label: "Ativa", value: "true" },
  //     { label: "Inativa", value: "false" },
  //   ],
  // },
  // {
  //   type: "select",
  //   key: "type",
  //   label: "Tipo",
  //   options: accountTypeOptions,
  // },
  // {
  //   type: "select",
  //   key: "currency",
  //   label: "Moeda",
  //   options: currencyOptions,
  // },
] satisfies FilterField[];