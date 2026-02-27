// importing components
import { New } from '@/app/components/account';

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
  return <New />;
};
