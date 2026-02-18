"use client";

import { AccountModel } from "@/app/types/account";
import AccountCard from "./AccountCard";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  accounts: AccountModel[];
  loading: boolean;
  viewMode: "grid" | "list";
  search?: string; // Adicionando search como opcional
}

export default function AccountsList({
  accounts,
  loading,
  viewMode,
  search = "", // Valor padrão
}: Props) {
  if (loading) {
    return (
      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="rounded-3xl p-6 bg-white/5 animate-pulse"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-slate-700" />
              <div className="flex-1 h-6 bg-slate-700 rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!accounts.length) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-center py-24"
      >
        <div className="text-6xl mb-4">🏦</div>
        <h3 className="text-xl font-medium text-white mb-2">
          Nenhuma conta encontrada
        </h3>
        <p className="text-slate-400">
          {search ? 'Tente buscar por outro termo' : 'Crie sua primeira conta para começar'}
        </p>
      </motion.div>
    );
  }

  const isGrid = viewMode === "grid";

  return (
    <motion.div
      layout
      className={
        isGrid
          ? "grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3"
          : "flex flex-col gap-3"
      }
    >
      <AnimatePresence mode="popLayout">
        {accounts.map((account, index) => (
          <motion.div
            key={account.id}
            layout
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ 
              duration: 0.2,
              delay: index * 0.03
            }}
          >
            <AccountCard
              account={account}
              viewMode={viewMode}
              searchTerm={search}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </motion.div>
  );
}
