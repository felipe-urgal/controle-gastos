"use client";

import { transactionService } from "@/app/services/transactionService";
import { TransactionDTO } from "@/app/types/transaction";
import { useIndex } from "@/app/hooks/crud/index";

export function useTransactions() {
  const { items, summary, ...rest } = useIndex<TransactionDTO>({
    service: transactionService,
    pagination: true,
  });

  return {
    transactions: items,
    summary,
    ...rest,
  };
}