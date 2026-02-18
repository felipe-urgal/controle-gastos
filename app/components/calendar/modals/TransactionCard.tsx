"use client";

import { motion } from "framer-motion";
import { FaTrash, FaEdit } from "react-icons/fa";
import { Button } from "@/app/components";
import { formatCurrency } from "@/app/utils";

export default function TransactionCard({
  transaction,
  onEdit,
  onDelete,
  user,
  isDeleting = false,
}) {
  return (
    <motion.div
      layout
      whileHover={{ scale: 1.01 }}
      transition={{ duration: 0.2 }}
      className="
        relative
        p-5
        rounded-2xl
        bg-white/10 dark:bg-slate-800/40
        backdrop-blur-xl
        border border-white/10 dark:border-slate-700
        shadow-[0_10px_30px_-10px_rgba(0,0,0,0.4)]
      "
    >
      <div className="flex justify-between items-start gap-4">
        <div className="min-w-0">
          <h3 className="font-semibold text-lg truncate">
            {transaction.description}
          </h3>

          <p className="text-sm text-slate-400 mt-1 truncate">
            {transaction.category?.name} • {transaction.account?.name}
          </p>
        </div>

        <motion.span
          layout
          className={`text-lg font-semibold tracking-tight ${
            transaction.type === "INCOME"
              ? "text-green-400"
              : "text-red-400"
          }`}
        >
          {user?.showValues
            ? formatCurrency(transaction.amount)
            : "••••"}
        </motion.span>
      </div>

      <div className="flex justify-end gap-2 mt-5 opacity-70 hover:opacity-100 transition">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onEdit(transaction)}
          icon={<FaEdit size={14} />}
          className="rounded-xl"
        />

        <Button
          variant="danger"
          size="sm"
          onClick={() =>
            onDelete(transaction.id, transaction.description)
          }
          icon={<FaTrash size={14} />}
          isLoading={isDeleting}
          className="rounded-xl"
        />
      </div>
    </motion.div>
  );
}
