"use client";

import { motion, AnimatePresence } from "framer-motion";
import TransactionCard from "./TransactionCard";
import { Transaction } from "@/app/types/calendar";

interface TransactionsListProps {
  transactions: Transaction[];
  onEdit: (transaction: Transaction) => void;
  onDelete: (id: string, description: string) => void;
  user: any;
  deletingTransactionId: string | null;
}

export default function TransactionsList({
  transactions,
  onEdit,
  onDelete,
  user,
  deletingTransactionId,
}: TransactionsListProps) {
  return (
    <motion.div
      layout
      className="flex flex-col gap-3"
    >
      <AnimatePresence mode="popLayout">
        {transactions.map((transaction, index) => (
          <motion.div
            key={transaction.id}
            layout
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ 
              duration: 0.2,
              delay: index * 0.03
            }}
          >
            <TransactionCard
              transaction={transaction}
              onEdit={onEdit}
              onDelete={onDelete}
              user={user}
              isDeleting={deletingTransactionId === transaction.id}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </motion.div>
  );
}
