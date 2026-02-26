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
      (acc, t) => {
        if (t.type === "INCOME") acc.totalIncome += Number(t.amount);
        else acc.totalExpenses += Number(t.amount);
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