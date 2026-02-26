// importing components
import Show from "@/app/components/transactions/show";

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
    title: `${transaction.description} | Controle de Gastos`,
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

  return <Show id={id} />;
};
