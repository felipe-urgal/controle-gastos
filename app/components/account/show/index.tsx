"use client";

import { useAccounts } from "@/app/hooks/accounts/account-show";
import EntityShowPage from "@/app/components/ui/EntityShowPage";
import AccountInfo from "@/app/components/account/show/account-info";

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
      back={handleBack}
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
