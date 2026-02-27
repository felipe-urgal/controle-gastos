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