"use client";

import { useTransactions } from "@/app/hooks/transactions/transaction-show";
import EntityShowPage from "@/app/components/ui/EntityShowPage";
import TransactionInfo from "@/app/components/transactions/show/transaction-info";

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
      back={handleBack}
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
