// importing components
import { ProtectedRoute } from "@/app/components/layout";
import { Show } from "@/app/components/pages/transactions";

// importing metadata
import type { Metadata } from "next";

export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> }
): Promise<Metadata> {
  const { id } = await params;

  return {
    title: `Transação | Controle de Gastos`,
    description: `Visualize informações completas`,
    openGraph: {
      url: `https://controle-gastos-pessoal.vercel.app/transacoes/show/${id}`,
    },
    alternates: {
      canonical: `https://controle-gastos-pessoal.vercel.app/transacoes/show/${id}`,
    },
  };
};

export default async function TransactionShowPage(
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  return (
    <ProtectedRoute>
      <Show id={id} />
    </ProtectedRoute>
  );
};
