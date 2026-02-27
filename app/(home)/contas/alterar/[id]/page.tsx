// importing components
import { Edit } from '@/app/components/account';

// importing service
import { getAccountById } from "@/app/lib/services/account.service";

// importing metadata
import type { Metadata } from "next";

export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> }
): Promise<Metadata> {
  const { id } = await params;

  const account = await getAccountById(id);

  if (!account) {
    return {
      title: "Conta não encontrada",
    };
  };

  return {
    title: `Editar ${account.name} | Controle de Gastos`,
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

  return <Edit id={id} />;
};
