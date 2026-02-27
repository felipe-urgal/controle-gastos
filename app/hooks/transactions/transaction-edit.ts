"use client";

import { transactionService } from "@/app/services/transactionService";
import { TransactionDTO } from "@/app/types/transaction";
import { useEdit } from "@/app/hooks/crud/edit";

export function useTransactions({ id }: { id: string }) {
  const { entity, ...rest } = useEdit<TransactionDTO>({
    id,
    service: transactionService,
    backPath: `/transacoes/show/${id}`,
    errorMessage: "Não foi possível carregar os dados da transação",
  });

  return {
    transaction: entity,
    ...rest,
  };
};
