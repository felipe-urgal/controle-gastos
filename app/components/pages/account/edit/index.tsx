'use client';

import { EditPage } from '@/app/components/base-pages';
import AccountForm from '@/app/components/pages/account/form';
import { useAccounts } from '@/app/hooks/accounts/account-edit';

export default function Edit({ id }: { id: string }) {
  const { account, loading, error, handleBack } = useAccounts({ id });

  return (
    <EditPage
      title="Editar conta"
      sidebarAligned
      breadcrumb={[
        { label: 'Contas', href: '/contas' },
        { label: account?.name ?? 'Conta', href: `/contas/show/${id}` },
        { label: 'Editar' },
      ]}
      loading={loading}
      error={error}
      backUrl={handleBack}
      errorRedirectTo={handleBack}
      hideHeaderOnMobile
    >
      <AccountForm isEditing account={account || undefined} />
    </EditPage>
  );
}
