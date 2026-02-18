"use client";

import { useAccounts } from "@/app/hook";
import { ProtectedRoute, AccountsList } from "@/app/components";
import { useMemo, useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  FaPlus,
  FaSearch,
  FaThLarge,
  FaList,
  FaSortAmountDown,
  FaSortAlphaDown,
  FaSortNumericDown,
  FaTimes,
  FaChevronDown,
} from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";

type SortOption = "NAME" | "BALANCE" | "DATE";
type ViewMode = "grid" | "list";

export default function AccountsPage() {
  const { accounts, loading } = useAccounts();

  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("NAME");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [showSortMenu, setShowSortMenu] = useState(false);
  
  const sortMenuRef = useRef<HTMLDivElement>(null);

  // Fechar menu ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (sortMenuRef.current && !sortMenuRef.current.contains(event.target as Node)) {
        setShowSortMenu(false);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  const currentSortOption = sortOptions.find(opt => opt.value === sortBy);

  return (
    <ProtectedRoute>
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-3xl sm:text-4xl font-bold text-white">
          Contas
        </h1>

        <Link
          href="/contas/nova"
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl
                     bg-gradient-to-r from-purple-600 to-indigo-600
                     text-white font-medium shadow-lg hover:shadow-purple-600/20 transition-shadow"
        >
          <FaPlus className="text-sm" />
          <span>Nova Conta</span>
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
          {/* Primeira linha: Busca e ações principais */}
          <div className="flex items-center gap-2">
            {/* SEARCH BAR */}
            <div className="flex-1 relative">
              <div className={`
                relative flex items-center
                bg-slate-800/60 border rounded-xl
                transition-all duration-200
                ${isSearchFocused 
                  ? 'border-purple-500 ring-2 ring-purple-500/20' 
                  : 'border-slate-700'
                }
              `}>
                <FaSearch className="absolute left-3 text-slate-400 text-sm" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onFocus={() => setIsSearchFocused(true)}
                  onBlur={() => setIsSearchFocused(false)}
                  placeholder="Buscar conta..."
                  className="w-full bg-transparent pl-10 pr-10 py-3 text-white placeholder-slate-400 outline-none text-base sm:text-sm"
                  style={{ fontSize: '16px' }}
                />
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    className="absolute right-3 text-slate-400 hover:text-white transition-colors"
                  >
                    <FaTimes />
                  </button>
                )}
              </div>
            </div>

            {/* VIEW MODE TOGGLE - Versão compacta */}
            <div className="flex bg-slate-800/60 border border-slate-700 rounded-xl p-1 shrink-0">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-2.5 rounded-lg transition-all ${
                  viewMode === "grid"
                    ? "bg-purple-600 text-white shadow-lg shadow-purple-600/20"
                    : "text-slate-400 hover:text-white"
                }`}
                aria-label="Visualização em grade"
              >
                <FaThLarge />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-2.5 rounded-lg transition-all ${
                  viewMode === "list"
                    ? "bg-purple-600 text-white shadow-lg shadow-purple-600/20"
                    : "text-slate-400 hover:text-white"
                }`}
                aria-label="Visualização em lista"
              >
                <FaList />
              </button>
            </div>
          </div>

          {/* Segunda linha: Ordenação e resultados */}
          <div className="flex items-center justify-between gap-2">
            {/* SORT BUTTON - MELHORADO */}
            <div className="relative flex-1 sm:flex-none" ref={sortMenuRef}>
              <button
                onClick={() => setShowSortMenu(!showSortMenu)}
                className={`
                  w-full sm:w-auto
                  flex items-center gap-2 px-4 py-2.5 rounded-xl
                  bg-slate-800/60 border transition-all
                  ${sortBy !== "NAME" 
                    ? 'border-purple-500/50 bg-purple-500/5' 
                    : 'border-slate-700 hover:border-slate-600'
                  }
                `}
              >
                <span className={sortBy !== "NAME" ? 'text-purple-400' : 'text-slate-400'}>
                  {currentSortOption?.icon}
                </span>
                <span className="flex-1 text-left text-sm text-white">
                  Ordenar por: <span className="font-medium">{currentSortOption?.label}</span>
                </span>
                <FaChevronDown className={`text-slate-400 text-xs transition-transform ${showSortMenu ? 'rotate-180' : ''}`} />
              </button>

              {/* DROPDOWN MENU - VERSÃO ÚNICA PARA MOBILE E DESKTOP */}
              <AnimatePresence>
                {showSortMenu && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                    transition={{ duration: 0.15 }}
                    className="
                      absolute left-0 right-0 sm:right-auto sm:w-64 mt-2 z-20
                      bg-slate-800 border border-slate-700 rounded-xl
                      shadow-2xl overflow-hidden
                    "
                  >
                    <div className="p-2">
                      {sortOptions.map((option) => (
                        <button
                          key={option.value}
                          onClick={() => {
                            setSortBy(option.value as SortOption);
                            setShowSortMenu(false);
                          }}
                          className={`
                            w-full flex items-start gap-3 px-4 py-3 rounded-lg
                            transition-colors text-left
                            ${sortBy === option.value 
                              ? 'bg-purple-600/20' 
                              : 'hover:bg-slate-700/50'
                            }
                          `}
                        >
                          <span className={`
                            mt-0.5 text-lg
                            ${sortBy === option.value ? 'text-purple-400' : 'text-slate-400'}
                          `}>
                            {option.icon}
                          </span>
                          <div className="flex-1">
                            <div className={`
                              font-medium text-sm
                              ${sortBy === option.value ? 'text-purple-400' : 'text-white'}
                            `}>
                              {option.label}
                            </div>
                            <div className="text-xs text-slate-500">
                              {option.description}
                            </div>
                          </div>
                          {sortBy === option.value && (
                            <span className="text-purple-400 text-sm">✓</span>
                          )}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* RESULTS COUNT */}
            {!loading && (
              <div className="text-xs text-slate-500 whitespace-nowrap">
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
        className="
          fixed bottom-6 right-6 md:hidden
          w-14 h-14 rounded-full
          bg-gradient-to-r from-purple-600 to-indigo-600
          flex items-center justify-center text-white
          shadow-xl hover:shadow-purple-600/30
          transition-shadow
        "
      >
        <FaPlus />
      </Link>

    </ProtectedRoute>
  );
}