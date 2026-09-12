// importing components
import { Show } from "@/app/components/pages/account";

// importing metadata
import type { Metadata } from "next";

export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> }
): Promise<Metadata> {
  const { id } = await params;

  return {
    title: "Conta | Controle de Gastos",
    description: "Informações da sua conta",
    openGraph: {
      url: `https://controle-gastos-pessoal.vercel.app/contas/show/${id}`,
    },
    alternates: {
      canonical: `https://controle-gastos-pessoal.vercel.app/contas/show/${id}`,
    },
  };
};

export default async function AccountShowPage(
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  return <Show id={id} />;
};
