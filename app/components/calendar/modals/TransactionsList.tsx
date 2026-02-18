"use client";

import { motion, AnimatePresence } from "framer-motion";
import TransactionCard from "./TransactionCard";

import { Transaction } from "@/app/types/calendar";

interface TransactionsListProps {
  transactions: Transaction[];
  onEdit: (transaction: Transaction) => void;
  onDelete: (id: string, description: string) => void;
  user: any; // pode tipar depois se quiser
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
      className="flex flex-col gap-4"
      initial="hidden"
      animate="visible"
      variants={{
        visible: {
          transition: { staggerChildren: 0.05 }
        }
      }}
    >
      <AnimatePresence>
        {transactions.map((t) => (
          <motion.div
            key={t.id}
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <TransactionCard
              transaction={t}
              onEdit={onEdit}
              onDelete={onDelete}
              user={user}
              isDeleting={deletingTransactionId === t.id}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </motion.div>
  );
}
