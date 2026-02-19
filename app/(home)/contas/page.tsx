"use client";

import { useAccounts } from "@/app/hook";
import { ProtectedRoute, AccountsList, Input, Button, Select } from "@/app/components";
import { useMemo, useState } from "react";
import Link from "next/link";
import {
  FaPlus,
  FaSearch,
  FaThLarge,
  FaList,
  FaSortAmountDown,
  FaSortAlphaDown,
  FaSortNumericDown,
} from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";

type SortOption = "NAME" | "BALANCE" | "DATE";
type ViewMode = "grid" | "list";

export default function AccountsPage() {
  const { accounts, loading } = useAccounts();

  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("NAME");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");

  const processedAccounts = useMemo(() => {
    let result = [...accounts];

    // 🔎 Busca
    if (search) {
      result = result.filter((a) =>
        a.name.toLowerCase().includes(search.toLowerCase())
      );
    }

    // 📊 Ordenação
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
      default: // "NAME"
        result.sort((a, b) => a.name.localeCompare(b.name));
    }

    return result;
  }, [accounts, search, sortBy]);

  const sortOptions = [
    { 
      value: "NAME", 
      label: "Nome", 
      icon: <FaSortAlphaDown />,
      description: "Ordem alfabética A-Z"
    },
    { 
      value: "BALANCE", 
      label: "Saldo", 
      icon: <FaSortNumericDown />,
      description: "Maior saldo primeiro"
    },
    { 
      value: "DATE", 
      label: "Data", 
      icon: <FaSortAmountDown />,
      description: "Mais recentes primeiro"
    },
  ];

  return (
    <ProtectedRoute>
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white">
            Contas
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Gerencie suas contas bancárias e investimentos
          </p>
        </div>

        <Link href="/contas/nova" className="w-full sm:w-auto">
          <Button
            variant="primary"
            size="lg"
            icon={<FaPlus />}
            fullWidth
          >
            Nova Conta
          </Button>
        </Link>
      </div>

      {/* TOOLBAR */}
      <div className="
        sticky top-4 z-10
        rounded-2xl p-4
        bg-slate-900/80 backdrop-blur-xl
        border border-white/10
        shadow-[0_10px_40px_rgba(0,0,0,0.4)]
      ">
        <div className="flex flex-col gap-3">
          {/* Primeira linha: Busca e view mode */}
          <div className="flex items-center gap-2">
            {/* SEARCH BAR */}
            <div className="flex-1">
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar conta..."
                icon={<FaSearch />}
                variant="filled"
                size="md"
                disabled={loading}
                clearable
              />
            </div>

            {/* VIEW MODE TOGGLE - CORRIGIDO */}
            <div className="flex bg-slate-800/60 border border-slate-700 rounded-xl p-1 shrink-0">
              <Button
                variant={viewMode === "grid" ? "primary" : "ghost"}
                size="sm"
                onClick={() => setViewMode("grid")}
                icon={<FaThLarge />}
                className={viewMode !== "grid" ? "!text-slate-400 hover:!text-white" : ""}
              />
              <Button
                variant={viewMode === "list" ? "primary" : "ghost"}
                size="sm"
                onClick={() => setViewMode("list")}
                icon={<FaList />}
                className={viewMode !== "list" ? "!text-slate-400 hover:!text-white" : ""}
              />
            </div>
          </div>

          {/* Segunda linha: Ordenação e resultados */}
          <div className="flex items-center justify-between gap-2">
            {/* SORT SELECT */}
            <div className="flex-1 sm:flex-none sm:w-64">
              <Select
                value={sortBy}
                onChange={(value) => setSortBy(value as SortOption)}
                options={sortOptions}
                placeholder="Ordenar por"
                variant="filled"
                size="md"
                disabled={loading}
                searchable={false}
              />
            </div>

            {/* RESULTS COUNT */}
            {!loading && (
              <div className="text-sm text-slate-500 whitespace-nowrap bg-slate-800/60 px-4 py-2 rounded-xl border border-slate-700">
                {processedAccounts.length} {processedAccounts.length === 1 ? 'conta' : 'contas'}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* LISTA */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`${viewMode}-${processedAccounts.length}-${search}`}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          <AccountsList
            accounts={processedAccounts}
            loading={loading}
            viewMode={viewMode}
            search={search}
          />
        </motion.div>
      </AnimatePresence>

      {/* FAB MOBILE */}
      <Link
        href="/contas/nova"
        className="fixed bottom-6 right-6 md:hidden"
      >
        <Button
          variant="primary"
          size="lg"
          icon={<FaPlus />}
          className="w-14 h-14 rounded-full shadow-xl"
        />
      </Link>
    </ProtectedRoute>
  );
}
