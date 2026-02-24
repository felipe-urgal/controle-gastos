// importing components
import Index from "@/app/components/account/index";

// importing metadata
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contas | Controle de Gastos",
  description: "Gerencie suas contas bancárias e investimentos",
  openGraph: {
    url: "https://controle-gastos-pessoal.vercel.app/contas",
  },
  alternates: {
    canonical: "https://controle-gastos-pessoal.vercel.app/contas",
  },
};


export default function AccountsPage() {
  return <Index />;
}
