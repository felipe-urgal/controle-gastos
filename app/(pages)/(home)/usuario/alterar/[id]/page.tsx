// importing components
import { Edit } from '@/app/components/pages/user';

// importing service
import { getUserById } from "@/app/lib/services/user.service";

// importing metadata
import type { Metadata } from "next";

export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> }
): Promise<Metadata> {
  const { id } = await params;

  const user = await getUserById(id);

  if (!user) {
    return {
      title: "Usuário não encontrada",
    };
  };

  return {
    title: `Editar ${user.name} | Controle de Gastos`,
    description: `Atualize as informações do usuário`,
    openGraph: {
      url: `https://controle-gastos-pessoal.vercel.app/usuario/alterar/${id}`,
    },
    alternates: {
      canonical: `https://controle-gastos-pessoal.vercel.app/usuario/alterar/${id}`,
    },
  };
};

export default async function UserEditPage(
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  return <Edit id={id} />;
};
