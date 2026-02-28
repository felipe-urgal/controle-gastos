// importing components
import { Index } from "@/app/components/pages/category";

// importing metadata
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Categorias | Controle de Gastos",
  description: "Organize suas receitas e despesas",
  openGraph: {
    url: "https://controle-gastos-pessoal.vercel.app/contas",
  },
  alternates: {
    canonical: "https://controle-gastos-pessoal.vercel.app/contas",
  },
};

export default function CategoriesPage() {
  return <Index />;
};
