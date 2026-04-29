"use client";

import { transactionService } from '@/app/services/transaction-service';
import { TransactionDTO } from "@/app/types/transaction";
import { useShow } from "@/app/hooks/crud/show";
import { useDelete } from "@/app/hooks/crud/delete";

export function useTransactions({ id }: { id: string }) {
  const { entity: transaction, loading } =
    useShow<TransactionDTO>({
      id,
      service: transactionService,
    });

  const {
    isDeleteModalOpen,
    setIsDeleteModalOpen,
    isDeleting,
    handleDelete,
  } = useDelete({
    redirectPath: "/transacoes",
    deleteService: transactionService.delete,
  });

  const handleBack = "/transacoes";

  return {
    transaction,
    loading,
    isDeleteModalOpen,
    setIsDeleteModalOpen,
    isDeleting,
    handleDelete: () =>
      transaction && handleDelete(transaction.id),
    handleBack,
  };
};
