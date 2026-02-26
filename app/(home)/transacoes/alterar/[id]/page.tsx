// importing components
import Edit from '@/app/components/transactions/edit/index';

// importing prisma
import { prisma } from "@/app/lib/prisma";

// importing metadata
import type { Metadata } from "next";

export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> }
): Promise<Metadata> {
  const { id } = await params;

  const transaction = await prisma.transaction.findUnique({
    where: { id },
  });

  if (!transaction) {
    return {
      title: "Transação não encontrada",
    };
  };

  return {
    title: `Editar ${transaction.description} | Controle de Gastos`,
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

  return <Edit id={id} />;
};
