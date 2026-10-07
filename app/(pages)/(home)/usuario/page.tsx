import type { Metadata } from "next";

import { Show } from "@/app/components/pages/user";

export const metadata: Metadata = {
  title: "Perfil | Controle de Gastos",
  description: "Gerencie sua conta, preferências e segurança",
  openGraph: {
    url: "https://controle-gastos-pessoal.vercel.app/usuario",
  },
  alternates: {
    canonical: "https://controle-gastos-pessoal.vercel.app/usuario",
  },
};

export default function UserPage() {
  return <Show />;
}
