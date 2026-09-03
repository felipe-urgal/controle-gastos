"use client";

import { transactionService } from '@/app/services/transaction-service';
import { TransactionDTO } from "@/app/types/transaction";
import { useIndex } from "@/app/hooks/crud/index";

export function useTransactions() {
  const now = new Date();
  
  const { items, summary, ...rest } = useIndex<TransactionDTO>({
    service: transactionService,
    pagination: true,
    initialFilters: {
      status: "COMPLETED",
      month: String(now.getMonth() + 1),
      year: String(now.getFullYear()),
    },
  });

  return {
    transactions: items,
    summary,
    ...rest,
  };
}