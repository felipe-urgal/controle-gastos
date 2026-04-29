import { Show } from "@/app/components/pages/user";
import { ProtectedRoute } from "@/app/components/layout";
import type { Metadata } from "next";

export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> }
): Promise<Metadata> {
  const { id } = await params;

  return {
    title: "Perfil | Controle de Gastos",
    description: "Visualize informações completas do seu perfil",
    openGraph: {
      url: `https://controle-gastos-pessoal.vercel.app/usuario/show/${id}`,
    },
    alternates: {
      canonical: `https://controle-gastos-pessoal.vercel.app/usuario/show/${id}`,
    },
  };
}

export default async function UserShowPage(
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  return (
    <ProtectedRoute>
      <Show id={id} />
    </ProtectedRoute>
  );
};
