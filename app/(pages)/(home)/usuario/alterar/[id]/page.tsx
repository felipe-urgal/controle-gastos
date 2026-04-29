import { Edit } from "@/app/components/pages/user";
import { ProtectedRoute } from "@/app/components/layout";

import type { Metadata } from "next";

export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> }
): Promise<Metadata> {
  const { id } = await params;

  return {
    title: "Editar Perfil | Controle de Gastos",
    description: "Atualize as informações do seu perfil",
    openGraph: {
      url: `https://controle-gastos-pessoal.vercel.app/usuario/alterar/${id}`,
    },
    alternates: {
      canonical: `https://controle-gastos-pessoal.vercel.app/usuario/alterar/${id}`,
    },
  };
}

export default async function UserEditPage(
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  return (
    <ProtectedRoute>
      <Edit id={id} />
    </ProtectedRoute>
  );
};
