"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/app/context";
import { AccountModel } from "@/app/types/account";
import { motion } from "framer-motion";
import { IconRenderer } from "@/app/components";

interface Props {
  account: AccountModel;
  viewMode: "grid" | "list";
}

export default function AccountCard({
  account,
  viewMode,
}: Props) {
  const router = useRouter();
  const { user } = useAuth();

  const balanceFormatted = user?.showValues
    ? new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: account.currency,
      }).format(account.balance / 100)
    : "••••••";

  if (viewMode === "list") {
    return (
      <motion.div
        layout
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        onClick={() => router.push(`/contas/show/${account.id}`)}
        className="
          cursor-pointer
          p-5 rounded-2xl
          bg-white/5 backdrop-blur-xl
          border border-white/10
          hover:border-purple-500/40
          transition-all
        "
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white"
              style={{ backgroundColor: account.color }}
            >
              <IconRenderer iconName={account.icon || "wallet"} size={16} />
            </div>

            <div>
              <p className="font-medium">{account.name}</p>
            </div>
          </div>

          <p className="font-semibold">
            {balanceFormatted}
          </p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      layout
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => router.push(`/contas/show/${account.id}`)}
      className="
        cursor-pointer
        rounded-3xl p-6
        bg-white/5 backdrop-blur-2xl
        border border-white/10
        hover:border-purple-500/40
        shadow-[0_10px_40px_rgba(0,0,0,0.4)]
        transition-all duration-300
      "
    >
      <div className="flex items-center gap-4">
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center text-white"
          style={{ backgroundColor: account.color }}
        >
          <IconRenderer iconName={account.icon || "wallet"} size={20} />
        </div>

        <div>
          <h3 className="font-semibold text-lg">
            {account.name}
          </h3>
        </div>
      </div>

      <div className="mt-6">
        <p className="text-xs text-slate-400 uppercase">
          Saldo Atual
        </p>

        <h2
          className="text-2xl font-bold mt-2"
          style={{
            color: account.isActive
              ? account.color
              : "#6B7280",
          }}
        >
          {balanceFormatted}
        </h2>
      </div>
    </motion.div>
  );
}
