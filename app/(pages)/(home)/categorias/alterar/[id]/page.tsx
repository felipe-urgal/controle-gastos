// importing components
import { ProtectedRoute } from "@/app/components/layout";
import { Edit } from '@/app/components/pages/category';

// importing metadata
import type { Metadata } from "next";

export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> }
): Promise<Metadata> {
  const { id } = await params;

  return {
    title: "Editar Categoria | Controle de Gastos",
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

  return (
    <ProtectedRoute>
      <Edit id={id} />
    </ProtectedRoute>
  );
};
