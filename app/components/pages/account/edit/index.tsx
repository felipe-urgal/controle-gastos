'use client';

// importing hooks
import { useAccounts } from "@/app/hooks/accounts/account-edit";

// importing components
import { EditPage } from '@/app/components/base-pages';
import { AccountForm } from '@/app/components/pages/account';

export default function Edit({ id }: { id: string }) {
  const { account, loading, error, handleBack } = useAccounts({ id });

  return (
    <EditPage
      loading={loading}
      error={error}
      backUrl={handleBack}
      errorRedirectTo={handleBack}
    >
      <AccountForm isEditing account={account || undefined} />
    </EditPage>
  );
};
