import type { Metadata } from "next";

import { Edit } from "@/app/components/pages/user";

export const metadata: Metadata = {
  title: "Editar perfil | Controle de Gastos",
  description: "Atualize as informações do seu perfil",
  openGraph: {
    url: "https://controle-gastos-pessoal.vercel.app/usuario/editar",
  },
  alternates: {
    canonical: "https://controle-gastos-pessoal.vercel.app/usuario/editar",
  },
};

export default function UserEditPage() {
  return <Edit />;
}
