import { useState, useMemo, useEffect } from "react";
import { Transaction } from "@/app/types/calendar";

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
    return transactions.reduce(
      (acc, transaction) => {
        if (transaction.status !== "COMPLETED") return acc;

        if (transaction.type === "INCOME") {
          acc.totalIncome += Number(transaction.amount);
        } else if (transaction.type === "EXPENSE") {
          acc.totalExpenses += Number(transaction.amount);
        }

        return acc;
      },
      { totalIncome: 0, totalExpenses: 0 }
    );
  }, [transactions]);

  const isEmpty = transactions.length === 0;

  return {
    transactions,
    totals,
    isEmpty,
  };
}
