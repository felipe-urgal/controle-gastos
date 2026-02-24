"use client";

// importing hooks
import { AccountModel } from "@/app/types/account";

// importing components
import AccountCard from "@/app/components/account/index/card";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  accounts: AccountModel[];
  loading: boolean;
  viewMode: "grid" | "list";
  search?: string;
};

export default function AccountsList({
  accounts,
  loading,
  viewMode,
  search = "",
}: Props) {
  const isGrid = viewMode === "grid";
  const isEmpty = !loading && accounts.length === 0;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={`${viewMode}-${accounts.length}-${search}`}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.2 }}
      >
        {loading && (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="rounded-2xl p-4 bg-white/5 animate-pulse"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-slate-700" />
                  <div className="flex-1 h-6 bg-slate-700 rounded" />
                </div>
              </div>
            ))}
          </div>
        )}

        {isEmpty && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16"
          >
            <h3 className="text-xl font-medium text-white mb-2">
              Nenhuma conta encontrada
            </h3>
            <p className="text-slate-400">
              {search
                ? "Tente buscar por outro termo"
                : "Crie sua primeira conta para começar"}
            </p>
          </motion.div>
        )}

        {!loading && !isEmpty && (
          <motion.div
            layout
            className={
              isGrid
                ? "grid gap-3 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3"
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
                    delay: index * 0.03,
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
        )}
      </motion.div>
    </AnimatePresence>
  );
};
