'use client';

// hooks
import { useAccounts } from "@/app/hooks/accounts/account-edit";

// components
import EditPage from '@/app/components/ui/EditPage';
import AccountForm from '@/app/components/account/form';

export default function Edit({ id }: { id: string }) {
  const { account, loading, error, handleBack } = useAccounts({ id });

  return (
    <EditPage
      loading={loading}
      error={error}
      onBack={handleBack}
      errorRedirectTo="/contas"
    >
      <AccountForm isEditing account={account} />
    </EditPage>
  );
};
