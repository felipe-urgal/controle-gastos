import ImportRuleManagementPage from '@/app/components/pages/transactions/import/rules';

export default async function Page({ searchParams }: { searchParams: Promise<{ ruleId?: string | string[] }> }) {
  const { ruleId } = await searchParams;
  return <ImportRuleManagementPage focusRuleId={Array.isArray(ruleId) ? ruleId[0] : ruleId} />;
}
