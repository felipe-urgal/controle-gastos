import type { Metadata } from 'next';

import ImportRuleManagementPage from '@/app/components/pages/transactions/import/rules';

export const metadata: Metadata = {
  title: 'Regras de importação | Controle de Gastos',
  description: 'Gerencie as regras que categorizam transações importadas automaticamente.',
};

export default async function Page({ searchParams }: { searchParams: Promise<{ ruleId?: string | string[] }> }) {
  const { ruleId } = await searchParams;
  return <ImportRuleManagementPage focusRuleId={Array.isArray(ruleId) ? ruleId[0] : ruleId} />;
}
