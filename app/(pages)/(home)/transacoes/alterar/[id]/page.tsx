// importing components
import { ProtectedRoute } from "@/app/components/layout";
import { Edit } from '@/app/components/pages/transactions';

// importing metadata
import type { Metadata } from "next";

export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> }
): Promise<Metadata> {
  const { id } = await params;

  return {
    title: `Editar transação | Controle de Gastos`,
    description: `Atualize as informações da transação`,
    openGraph: {
      url: `https://controle-gastos-pessoal.vercel.app/transacoes/alterar/${id}`,
    },
    alternates: {
      canonical: `https://controle-gastos-pessoal.vercel.app/transacoes/alterar/${id}`,
    },
  };
};

export default async function TransactionEditPage(
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  return (
    <ProtectedRoute>
      <Edit id={id} />
    </ProtectedRoute>
  );
};
