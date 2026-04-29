// importing components
import { ProtectedRoute } from "@/app/components/layout";
import { New } from '@/app/components/pages/account';

// importing metadata
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Nova Conta | Controle de Gastos",
  description: "Configure os detalhes da sua conta financeira",
  openGraph: {
    url: "https://controle-gastos-pessoal.vercel.app/contas/nova",
  },
  alternates: {
    canonical: "https://controle-gastos-pessoal.vercel.app/contas/nova",
  },
};

export default function AccountNewPage() {
  return (
    <ProtectedRoute>
      <New />
    </ProtectedRoute>
  );
};
