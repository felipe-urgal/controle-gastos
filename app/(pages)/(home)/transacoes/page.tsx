// importing components
import { ProtectedRoute } from "@/app/components/layout";
import { Index } from "@/app/components/pages/transactions";

// importing metadata
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Transações | Controle de Gastos",
  description: "Gerencie suas receitas e despesas",
  openGraph: {
    url: "https://controle-gastos-pessoal.vercel.app/transacoes",
  },
  alternates: {
    canonical: "https://controle-gastos-pessoal.vercel.app/transacoes",
  },
};

export default function TransactionPage() {
  return (
    <ProtectedRoute>
      <Index />
    </ProtectedRoute>
  );
};
