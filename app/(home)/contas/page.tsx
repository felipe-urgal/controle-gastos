"use client";

import { useAccounts } from "@/app/hook";
import { ProtectedRoute, AccountsList } from "@/app/components";
import { useMemo, useState } from "react";
import Link from "next/link";
import {
  FaPlus,
  FaSearch,
  FaThLarge,
  FaList,
  FaSortAmountDown,
} from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";

type SortOption = "NAME" | "BALANCE" | "DATE";
type ViewMode = "grid" | "list";

export default function AccountsPage() {
  const { accounts, loading } = useAccounts();

  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("NAME");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [searchOpen, setSearchOpen] = useState(false);

  const processedAccounts = useMemo(() => {
    let result = [...accounts];

    // 🔎 Busca
    if (search) {
      result = result.filter((a) =>
        a.name.toLowerCase().includes(search.toLowerCase())
      );
    }

    // 🔀 Ordenação
    switch (sortBy) {
      case "BALANCE":
        result.sort((a, b) => b.balance - a.balance);
        break;
      case "DATE":
        result.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() -
            new Date(a.createdAt).getTime()
        );
        break;
      default:
        result.sort((a, b) => a.name.localeCompare(b.name));
    }

    return result;
  }, [accounts, search, sortBy]);

  return (
    <ProtectedRoute>
      <div className="px-6 py-12 space-y-10">

        {/* HEADER */}
        <div className="flex items-center justify-between">
          <h1 className="text-4xl font-bold text-white">Contas</h1>

          <Link
            href="/contas/nova"
            className="hidden md:inline-flex items-center gap-2 px-6 py-3 rounded-xl
                       bg-gradient-to-r from-purple-600 to-indigo-600
                       text-white font-medium shadow-lg"
          >
            <FaPlus />
            Nova Conta
          </Link>
        </div>

        {/* TOOLBAR PREMIUM */}
        <div className="
          relative rounded-2xl p-5
          bg-white/5 backdrop-blur-2xl
          border border-white/10
          shadow-[0_10px_40px_rgba(0,0,0,0.4)]
        ">

          <div className="flex flex-wrap items-center gap-4">

            {/* TOGGLE GRID/LISTA */}
            <div className="flex bg-slate-900/60 border border-slate-700 rounded-xl p-1">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-2 rounded-lg ${
                  viewMode === "grid"
                    ? "bg-purple-600 text-white"
                    : "text-slate-400"
                }`}
              >
                <FaThLarge />
              </button>

              <button
                onClick={() => setViewMode("list")}
                className={`p-2 rounded-lg ${
                  viewMode === "list"
                    ? "bg-purple-600 text-white"
                    : "text-slate-400"
                }`}
              >
                <FaList />
              </button>
            </div>

          </div>
        </div>

        {/* LISTA */}
        <AnimatePresence mode="wait">
          <motion.div
            key={viewMode}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
          >
            <AccountsList
              accounts={processedAccounts}
              loading={loading}
              viewMode={viewMode}
            />
          </motion.div>
        </AnimatePresence>

        {/* FAB MOBILE */}
        <Link
          href="/contas/nova"
          className="
            fixed top-10 right-6 md:hidden
            w-12 h-12 rounded-full
            bg-gradient-to-r from-purple-600 to-indigo-600
            flex items-center justify-center text-white
            shadow-xl
          "
        >
          <FaPlus />
        </Link>

      </div>
    </ProtectedRoute>
  );
}
