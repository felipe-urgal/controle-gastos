// importing components
import { ProtectedRoute } from "@/app/components/layout";
import { New } from '@/app/components/pages/transactions';

// importing metadata
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Nova Transação | Controle de Gastos",
  description: "Crie uma transação para organizar suas transações",
  openGraph: {
    url: "https://controle-gastos-pessoal.vercel.app/transacoes/nova",
  },
  alternates: {
    canonical: "https://controle-gastos-pessoal.vercel.app/transacoes/nova",
  },
};

export default function TransactionNewPage() {
  return (
    <ProtectedRoute>
      <New />
    </ProtectedRoute>
  );
};
