// importing components
import New from '@/app/components/category/new';

// importing metadata
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Nova Categoria | Controle de Gastos",
  description: "Crie uma categoria para organizar suas transações",
  openGraph: {
    url: "https://controle-gastos-pessoal.vercel.app/categorias/nova",
  },
  alternates: {
    canonical: "https://controle-gastos-pessoal.vercel.app/categorias/nova",
  },
};

export default function CategoryNewPage() {
  return <New />;
}
