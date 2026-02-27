// importing types
import { CategoryType } from "@/app/types/category";

export const typeConfig = {
  INCOME: {
    label: "Receita",
    color: "text-green-400",
    bgColor: "bg-green-500/10",
    borderColor: "border-green-500/20"
  },
  EXPENSE: {
    label: "Despesa",
    color: "text-red-400",
    bgColor: "bg-red-500/10",
    borderColor: "border-red-500/20"
  }
};

export const categoryTypeOptions = [
  { value: "EXPENSE", label: "Despesa" },
  { value: "INCOME", label: "Receita" },
];

export const initialFormData = {
  name: "",
  type: "EXPENSE" as CategoryType,
  color: "#3B82F6",
  icon: "tag",
  description: "",
  isActive: true,
};
