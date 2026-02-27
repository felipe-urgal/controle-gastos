"use client";

// importing hooks
import { useTransactions } from "@/app/hooks/transactions/transaction-show";

// importing hooks
import { EntityShowPage } from "@/app/components/pages";
import { TransactionInfo } from "@/app/components/transactions";

export default function Show({ id }: { id: string }) {
  const {
    transaction,
    loading,
    isDeleteModalOpen,
    setIsDeleteModalOpen,
    isDeleting,
    handleDelete,
    handleBack,
  } = useTransactions({ id });

  return (
    <EntityShowPage
      entity={transaction}
      entityName="transacao"
      loading={loading}
      editUrl={`/transacoes/alterar/${id}`}
      backUrl={handleBack}
      isDeleting={isDeleting}
      isDeleteModalOpen={isDeleteModalOpen}
      setIsDeleteModalOpen={setIsDeleteModalOpen}
      onDelete={handleDelete}
      emptyRedirectTo="/transacoes"
    >
      <TransactionInfo
        transaction={transaction!}
        isDeleting={isDeleting}
      />
    </EntityShowPage>
  );
};
