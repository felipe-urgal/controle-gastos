"use client";

// importing hooks
import { useAccounts } from "@/app/hooks/accounts/account-show";

// importing components
import { ShowPage } from "@/app/components/base-pages";
import { AccountInfo } from "@/app/components/pages/account";

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
    <ShowPage
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
    </ShowPage>
  );
};
