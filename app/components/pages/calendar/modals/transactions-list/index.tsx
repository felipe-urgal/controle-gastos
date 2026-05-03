"use client";

import { TransactionCard } from "@/app/components/pages/calendar/modals";
import { Transaction } from "@/app/types/calendar";

interface TransactionsListProps {
  transactions: Transaction[];
  onEdit?: (transaction: Transaction) => void;
  onDelete?: (transaction: Transaction) => void;
  isBusy?: boolean;
}

export default function TransactionsList({
  transactions,
  onEdit,
  onDelete,
  isBusy = false,
}: TransactionsListProps) {
  return (
    <div className="flex flex-col gap-3">
      {transactions.map((transaction) => (
        <TransactionCard
          key={transaction.id}
          transaction={transaction}
          onEdit={onEdit}
          onDelete={onDelete}
          isBusy={isBusy}
        />
      ))}
    </div>
  );
}