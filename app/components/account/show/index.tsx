"use client";

import { useAccounts } from "@/app/hooks/accounts/account-show";
import EntityShowPage from "@/app/components/ui/EntityShowPage";
import AccountInfo from "@/app/components/account/show/account-info";

export default function Show({ id }: { id: string }) {
  const {
    account,
    transactions,
    summary,
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
      titleFallback="Detalhes da Conta"
      description="Visualize e gerencie esta conta"
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
        transactions={transactions}
        summary={summary}
        isDeleting={isDeleting}
        typeLabels={typeLabels}
      />
    </EntityShowPage>
  );
};
