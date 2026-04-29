// importing components
import { ProtectedRoute } from "@/app/components/layout";
import { Index } from "@/app/components/pages/account";

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
  return (
    <ProtectedRoute>
      <Index />
    </ProtectedRoute>
  );
};
