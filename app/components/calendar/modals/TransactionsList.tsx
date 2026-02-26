"use client";

import TransactionCard from "./TransactionCard";
import { Transaction } from "@/app/types/calendar";

interface TransactionsListProps {
  transactions: Transaction[];
}

export default function TransactionsList({
  transactions,
}: TransactionsListProps) {
  return (
    <div className="flex flex-col gap-3">
      {transactions.map((transaction, index) => (
        <TransactionCard
          key={transaction.id}
          transaction={transaction}
        />
      ))}
    </div>
  );
};
