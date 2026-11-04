"use client";

import { transactionService } from '@/app/services/transaction-service';
import { TransactionDTO } from "@/app/types/transaction";
import { useIndex } from "@/app/hooks/crud/index";
import { todayLogicalDate } from '@/app/lib/date/logical-date';

type UseTransactionsOptions = {
  pagination?: boolean;
  appendPagination?: boolean;
  initialPageSize?: number;
};

export function useTransactions({
  pagination = true,
  appendPagination = false,
  initialPageSize,
}: UseTransactionsOptions = {}) {
  const today = todayLogicalDate();

  const { items, summary, ...rest } = useIndex<TransactionDTO>({
    service: transactionService,
    pagination,
    appendPagination,
    initialPageSize,
    initialFilters: {
      month: String(today.month),
      year: String(today.year),
    },
  });

  return {
    transactions: items,
    summary,
    ...rest,
  };
}
