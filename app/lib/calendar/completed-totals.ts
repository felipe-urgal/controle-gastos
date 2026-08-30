import type { Transaction } from '@/app/types/calendar';

type TransactionForTotals = Pick<Transaction, 'amount' | 'type' | 'status'>;

export interface CompletedTransactionTotals {
  income: number;
  expense: number;
  balance: number;
}

export function calculateCompletedTransactionTotals(
  transactions: TransactionForTotals[],
): CompletedTransactionTotals {
  const totals = transactions.reduce(
    (acc, transaction) => {
      if (transaction.status !== 'COMPLETED') return acc;

      const amount = Number(transaction.amount) || 0;

      if (transaction.type === 'INCOME') {
        acc.income += amount;
      } else if (transaction.type === 'EXPENSE') {
        acc.expense += amount;
      }

      return acc;
    },
    { income: 0, expense: 0 },
  );

  return {
    ...totals,
    balance: totals.income - totals.expense,
  };
}
