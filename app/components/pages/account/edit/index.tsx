'use client';

import { EditPage } from '@/app/components/base-pages';
import { AccountForm } from '@/app/components/pages/account';
import { useAccounts } from '@/app/hooks/accounts/account-edit';

export default function Edit({ id }: { id: string }) {
  const { account, loading, error, handleBack } = useAccounts({ id });

  return (
    <EditPage
      title="Editar conta"
      description="Atualize os dados cadastrais e a identidade visual sem alterar a origem do saldo, que continua sendo calculado pelas transações."
      loading={loading}
      error={error}
      backUrl={handleBack}
      errorRedirectTo={handleBack}
    >
      <AccountForm isEditing account={account || undefined} />
    </EditPage>
  );
}
