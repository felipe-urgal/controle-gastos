"use client";

// importing hooks
import { useAccounts } from "@/app/hooks/accounts/account-show";

// importing components
import { EntityShowPage } from "@/app/components/pages";
import { AccountInfo } from "@/app/components/account";

export default function Show({ id }: { id: string }) {
  const {
    account,
    loading,
    isDeleteModalOpen,
    setIsDeleteModalOpen,
    isDeleting,
    handleDelete,
    handleBack,
    typeLabels,
  } = useAccounts({ id });

  return (
    <EntityShowPage
      entity={account}
      entityName="conta"
      loading={loading}
      editUrl={`/contas/alterar/${id}`}
      backUrl={handleBack}
      isDeleting={isDeleting}
      isDeleteModalOpen={isDeleteModalOpen}
      setIsDeleteModalOpen={setIsDeleteModalOpen}
      onDelete={handleDelete}
      emptyRedirectTo="/contas"
    >
      <AccountInfo
        account={account!}
        isDeleting={isDeleting}
        typeLabels={typeLabels}
      />
    </EntityShowPage>
  );
};
