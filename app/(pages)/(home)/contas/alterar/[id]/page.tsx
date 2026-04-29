// importing components
import { ProtectedRoute } from "@/app/components/layout";
import { Edit } from '@/app/components/pages/account';

// importing metadata
import type { Metadata } from "next";

export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> }
): Promise<Metadata> {
  const { id } = await params;

  return {
    title: "Editar Conta | Controle de Gastos",
    description: `Atualize as informações da sua conta`,
    openGraph: {
      url: `https://controle-gastos-pessoal.vercel.app/contas/alterar/${id}`,
    },
    alternates: {
      canonical: `https://controle-gastos-pessoal.vercel.app/contas/alterar/${id}`,
    },
  };
};

export default async function AccountEditPage(
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  return (
    <ProtectedRoute>
      <Edit id={id} />
    </ProtectedRoute>
  );
};
