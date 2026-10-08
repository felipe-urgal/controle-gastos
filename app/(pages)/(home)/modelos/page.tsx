import type { Metadata } from 'next';
import TransactionTemplatesPage from '@/app/components/pages/transaction-templates/transaction-templates-page';
export const metadata: Metadata = { title: 'Modelos de lançamento | Controle de Gastos', description: 'Crie atalhos reutilizáveis para preencher novas transações.' };
export default async function TemplatesPage({ searchParams }: { searchParams: Promise<{ source?: string | string[]; templateId?: string | string[] }> }) {
  const { source, templateId } = await searchParams;
  const sourceTransactionId = Array.isArray(source) ? source[0] : source;
  return <TransactionTemplatesPage sourceTransactionId={sourceTransactionId} focusTemplateId={Array.isArray(templateId) ? templateId[0] : templateId} />;
}
