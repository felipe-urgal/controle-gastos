import { useMemo } from 'react';

import { calculateCompletedTransactionTotals } from '@/app/lib/calendar/completed-totals';
import { Transaction } from '@/app/types/calendar';

interface UseDayTransactionsProps {
  initialTransactions: Transaction[];
  isOpen: boolean;
}

export function useDayTransactions({
  initialTransactions,
  isOpen,
}: UseDayTransactionsProps) {
  const transactions = useMemo(
    () => (isOpen ? initialTransactions : []),
    [initialTransactions, isOpen],
  );

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
