"use client";

import { transactionService } from "@/app/services/transactionService";
import { TransactionDTO } from "@/app/types/transaction";
import { useShow } from "@/app/hooks/crud/show";
import { useDelete } from "@/app/hooks/crud/delete";
import { useRouter } from "next/navigation";

export function useTransactions({ id }: { id: string }) {
  const router = useRouter();

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

  const handleBack = () => {
    router.push("/transacoes");
  };

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
