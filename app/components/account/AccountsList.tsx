"use client";

import { AccountModel } from "@/app/types/account";
import AccountCard from "./AccountCard";
import { motion } from "framer-motion";

interface Props {
  accounts: AccountModel[];
  loading: boolean;
  viewMode: "grid" | "list";
}

export default function AccountsList({
  accounts,
  loading,
  viewMode,
}: Props) {

  if (loading) return <div>Carregando...</div>;

  if (!accounts.length) {
    return (
      <div className="text-center py-24 text-slate-400">
        Nenhuma conta encontrada
      </div>
    );
  }

  const isGrid = viewMode === "grid";

  return (
    <motion.div
      layout
      className={
        isGrid
          ? "grid gap-6 sm:grid-cols-2 xl:grid-cols-3"
          : "flex flex-col gap-4"
      }
    >
      {accounts.map((account) => (
        <AccountCard
          key={account.id}
          account={account}
          viewMode={viewMode}
        />
      ))}
    </motion.div>
  );
}
