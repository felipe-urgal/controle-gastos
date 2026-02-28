// importing components
import { Edit } from '@/app/components/pages/category';

// importing service
import { getCategoryById } from "@/app/lib/services/category.service";

// importing metadata
import type { Metadata } from "next";

export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> }
): Promise<Metadata> {
  const { id } = await params;

  const category = await getCategoryById(id);

  if (!category) {
    return {
      title: "Categoria não encontrada",
    };
  };

  return {
    title: `Editar ${category.name} | Controle de Gastos`,
    description: `Atualize as informações da sua categoria`,
    openGraph: {
      url: `https://controle-gastos-pessoal.vercel.app/categorias/alterar/${id}`,
    },
    alternates: {
      canonical: `https://controle-gastos-pessoal.vercel.app/categorias/alterar/${id}`,
    },
  };
};

export default async function CategoryEditPage(
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  return <Edit id={id} />;
};
