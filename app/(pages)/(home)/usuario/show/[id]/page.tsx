// importing components
import { Show } from "@/app/components/pages/user";

// importing metadata
import type { Metadata } from "next";

export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> }
): Promise<Metadata> {
  const { id } = await params;

  return {
    title: "Perfil | Controle de Gastos",
    description: "Visualize informações do seu perfil",
    openGraph: {
      url: `https://controle-gastos-pessoal.vercel.app/usuario/show/${id}`,
    },
    alternates: {
      canonical: `https://controle-gastos-pessoal.vercel.app/usuario/show/${id}`,
    },
  };
};

export default async function userShowPage(
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  return <Show id={id} />;
};
