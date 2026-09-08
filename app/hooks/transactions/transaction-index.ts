"use client";

import { transactionService } from '@/app/services/transaction-service';
import { TransactionDTO } from "@/app/types/transaction";
import { useIndex } from "@/app/hooks/crud/index";

type UseTransactionsOptions = {
  pagination?: boolean;
};

export function useTransactions({ pagination = true }: UseTransactionsOptions = {}) {
  const now = new Date();
  
  const { items, summary, ...rest } = useIndex<TransactionDTO>({
    service: transactionService,
    pagination,
    initialFilters: {
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
