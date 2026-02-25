// importing components
import Show from "@/app/components/category/show";

// importing prisma
import { prisma } from "@/app/lib/prisma";

// importing metadata
import type { Metadata } from "next";

export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> }
): Promise<Metadata> {
  const { id } = await params;

  const category = await prisma.category.findUnique({
    where: { id },
  });

  if (!category) {
    return {
      title: "Categoria não encontrada",
    };
  };

  return {
    title: `${category.name} | Controle de Gastos`,
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

  return <Show id={id} />;
};
