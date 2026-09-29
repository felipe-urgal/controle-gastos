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
    mode?: string | string[];
    type?: string | string[];
    template?: string | string[];
  }>;
}

export default async function TransactionNewPage({
  searchParams,
}: TransactionNewPageProps) {
  const { duplicate, mode, type, template } = await searchParams;
  const duplicateId = Array.isArray(duplicate) ? duplicate[0] : duplicate;
  const templateId = Array.isArray(template) ? template[0] : template;
  const modeValue = Array.isArray(mode) ? mode[0] : mode;
  const typeValue = Array.isArray(type) ? type[0] : type;
  const initialMode = modeValue === 'transfer' ? 'transfer' : 'transaction';
  const initialCategoryType = typeValue === 'income' ? 'INCOME' : 'EXPENSE';
  const pageKey = [duplicateId ?? templateId ?? 'new', initialMode, initialCategoryType].join(':');

  return (
    <New
      key={pageKey}
      duplicateId={duplicateId}
      templateId={duplicateId ? undefined : templateId}
      initialMode={initialMode}
      initialCategoryType={initialCategoryType}
    />
  );
};
