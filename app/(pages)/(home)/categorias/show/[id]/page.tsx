// importing components
import { ProtectedRoute } from "@/app/components/layout";
import { Show } from "@/app/components/pages/category";

// importing metadata
import type { Metadata } from "next";

export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> }
): Promise<Metadata> {
  const { id } = await params;

  return {
    title: "Categoria | Controle de Gastos",
    description: `Informações da sua categoria`,
    openGraph: {
      url: `https://controle-gastos-pessoal.vercel.app/categorias/show/${id}`,
    },
    alternates: {
      canonical: `https://controle-gastos-pessoal.vercel.app/categorias/show/${id}`,
    },
  };
};

export default async function CategoryShowPage(
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  return (
    <ProtectedRoute>
      <Show id={id} />
    </ProtectedRoute>
  );
};
