import { useState, useMemo, useEffect } from "react";
import { Transaction } from "@/app/types/calendar";
import { calculateCompletedTransactionTotals } from "@/app/lib/calendar/completed-totals";

interface UseDayTransactionsProps {
  initialTransactions: Transaction[];
  isOpen: boolean;
}

export function useDayTransactions({
  initialTransactions,
  isOpen,
}: UseDayTransactionsProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    if (isOpen) {
      setTransactions(initialTransactions || []);
    }
  }, [initialTransactions, isOpen]);

  const totals = useMemo(() => {
    const completedTotals = calculateCompletedTransactionTotals(transactions);

    return {
      totalIncome: completedTotals.income,
      totalExpenses: completedTotals.expense,
    };
  }, [transactions]);

  const isEmpty = transactions.length === 0;

  return {
    transactions,
    totals,
    isEmpty,
  };
}
