// importing components
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

interface TransactionNewPageProps {
  searchParams: Promise<{
    duplicate?: string | string[];
  }>;
}

export default async function TransactionNewPage({
  searchParams,
}: TransactionNewPageProps) {
  const { duplicate } = await searchParams;
  const duplicateId = Array.isArray(duplicate) ? duplicate[0] : duplicate;

  return <New key={duplicateId ?? "new"} duplicateId={duplicateId} />;
};
