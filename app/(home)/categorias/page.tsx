"use client";

import { useRouter } from "next/navigation";
import { useCategories } from "@/app/hook";
import { CategoriesList, ProtectedRoute } from "@/app/components";
import { useMemo, useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FaPlus, 
  FaSearch, 
  FaThLarge, 
  FaList, 
  FaSortAlphaDown,
  FaSortAmountDown,
  FaTimes,
  FaChevronDown,
  FaTag,
  FaCalendarAlt
} from "react-icons/fa";

type ViewMode = "grid" | "list";
type SortOption = "NAME" | "TYPE" | "POSITION" | "CREATED_AT" | "UPDATED_AT";

export default function CategoriesPage() {
  const { categories, loading } = useCategories();
  const router = useRouter();

  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [sortBy, setSortBy] = useState<SortOption>("NAME");
  const [filterType, setFilterType] = useState<"ALL" | "INCOME" | "EXPENSE">("ALL");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  
  const sortMenuRef = useRef<HTMLDivElement>(null);
  const filterMenuRef = useRef<HTMLDivElement>(null);

  // Fechar menus ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (sortMenuRef.current && !sortMenuRef.current.contains(event.target as Node)) {
        setShowSortMenu(false);
      }
      if (filterMenuRef.current && !filterMenuRef.current.contains(event.target as Node)) {
        setShowFilterMenu(false);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const processedCategories = useMemo(() => {
    let result = [...categories];

    // 🔎 Busca
    if (search) {
      result = result.filter((c) =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.description?.toLowerCase().includes(search.toLowerCase())
      );
    }

    // 🏷️ Filtro por tipo
    if (filterType !== "ALL") {
      result = result.filter((c) => c.type === filterType);
    }

    // 📊 Ordenação
    result.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case "NAME":
          comparison = a.name.localeCompare(b.name);
          break;
        case "TYPE":
          comparison = a.type.localeCompare(b.type);
          break;
        case "POSITION":
          comparison = (a.position || 0) - (b.position || 0);
          break;
        case "CREATED_AT":
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case "UPDATED_AT":
          comparison = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
          break;
        default:
          comparison = 0;
      }
      
      return sortOrder === "asc" ? comparison : -comparison;
    });

    return result;
  }, [categories, search, sortBy, filterType, sortOrder]);

  const sortOptions = [
    { 
      value: "NAME", 
      label: "Nome", 
      icon: <FaSortAlphaDown />,
      description: "Ordem alfabética"
    },
    { 
      value: "TYPE", 
      label: "Tipo", 
      icon: <FaTag />,
      description: "Receitas e despesas"
    },
    { 
      value: "CREATED_AT", 
      label: "Data de criação", 
      icon: <FaCalendarAlt />,
      description: "Mais antigas ou recentes primeiro"
    },
    { 
      value: "UPDATED_AT", 
      label: "Data de atualização", 
      icon: <FaSortAmountDown />,
      description: "Últimas modificações"
    },
  ];

  const filterOptions = [
    { value: "ALL", label: "Todas", icon: "📋" },
    { value: "INCOME", label: "Receitas", icon: "💰", color: "text-green-400" },
    { value: "EXPENSE", label: "Despesas", icon: "💸", color: "text-red-400" },
  ];

  const currentSortOption = sortOptions.find(opt => opt.value === sortBy);
  const currentFilterOption = filterOptions.find(opt => opt.value === filterType);

  const toggleSortOrder = () => {
    setSortOrder(prev => prev === "asc" ? "desc" : "asc");
  };

  return (
    <ProtectedRoute>
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white">
            Categorias
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Organize suas receitas e despesas
          </p>
        </div>

        <button
          onClick={() => router.push("/categorias/nova")}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl
                     bg-gradient-to-r from-purple-600 to-indigo-600
                     text-white font-medium shadow-lg hover:shadow-purple-600/20 transition-shadow"
        >
          <FaPlus className="text-sm" />
          <span>Nova Categoria</span>
        </button>
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
                  placeholder="Buscar categoria..."
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

            {/* VIEW MODE TOGGLE */}
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

          {/* Segunda linha: Filtros e ordenação */}
          <div className="flex items-center gap-2">
            {/* FILTER BUTTON */}
            <div className="relative flex-1 sm:flex-none" ref={filterMenuRef}>
              <button
                onClick={() => setShowFilterMenu(!showFilterMenu)}
                className={`
                  w-full sm:w-auto
                  flex items-center gap-2 px-4 py-2.5 rounded-xl
                  bg-slate-800/60 border transition-all
                  ${filterType !== "ALL" 
                    ? 'border-purple-500/50 bg-purple-500/5' 
                    : 'border-slate-700 hover:border-slate-600'
                  }
                `}
              >
                <span className={filterType !== "ALL" ? 'text-purple-400' : 'text-slate-400'}>
                  {currentFilterOption?.icon}
                </span>
                <span className="flex-1 text-left text-sm text-white">
                  {currentFilterOption?.label}
                </span>
                <FaChevronDown className={`text-slate-400 text-xs transition-transform ${showFilterMenu ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {showFilterMenu && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                    className="
                      absolute left-0 right-0 sm:w-48 mt-2 z-20
                      bg-slate-800 border border-slate-700 rounded-xl
                      shadow-2xl overflow-hidden
                    "
                  >
                    <div className="p-2">
                      {filterOptions.map((option) => (
                        <button
                          key={option.value}
                          onClick={() => {
                            setFilterType(option.value as any);
                            setShowFilterMenu(false);
                          }}
                          className={`
                            w-full flex items-center gap-3 px-4 py-3 rounded-lg
                            transition-colors
                            ${filterType === option.value 
                              ? 'bg-purple-600/20' 
                              : 'hover:bg-slate-700/50'
                            }
                          `}
                        >
                          <span className="text-lg">{option.icon}</span>
                          <span className={`flex-1 text-left text-sm ${
                            filterType === option.value ? 'text-purple-400' : 'text-white'
                          }`}>
                            {option.label}
                          </span>
                          {filterType === option.value && (
                            <span className="text-purple-400 text-sm">✓</span>
                          )}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* SORT BUTTON */}
            <div className="relative w-full sm:w-auto" ref={sortMenuRef}>
              <button
                onClick={() => setShowSortMenu(!showSortMenu)}
                className={`
                  w-full sm:w-auto
                  flex items-center justify-between sm:justify-start gap-2 px-4 py-3 sm:py-2.5 rounded-xl
                  bg-slate-800/60 border transition-all
                  ${sortBy !== "NAME" || sortOrder !== "asc"
                    ? 'border-purple-500/50 bg-purple-500/5' 
                    : 'border-slate-700 hover:border-slate-600'
                  }
                `}
              >
                <div className="flex items-center gap-2 min-w-0 flex-1 sm:flex-initial">
                  <span className={sortBy !== "NAME" || sortOrder !== "asc" ? 'text-purple-400' : 'text-slate-400 shrink-0'}>
                    {currentSortOption?.icon}
                  </span>
                  
                  <span className="text-sm text-white truncate">
                    {currentSortOption?.label}
                  </span>
                </div>
                
                {/* Badge de ordem - AGORA CLICÁVEL */}
                <div className="flex items-center gap-1 shrink-0">
                  <span 
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSortOrder();
                    }}
                    className={`
                      text-xs px-2 py-1 rounded-md cursor-pointer
                      transition-all active:scale-95
                      ${sortOrder === "asc" 
                        ? 'bg-purple-500/20 text-purple-400 active:bg-purple-500/30' 
                        : 'bg-slate-700 text-slate-400 active:bg-slate-600 active:text-white'
                      }
                      sm:hover:scale-110
                    `}
                    title={sortOrder === "asc" ? "Ordem crescente" : "Ordem decrescente"}
                  >
                    {sortOrder === "asc" ? "↑" : "↓"}
                  </span>
                  
                  <FaChevronDown 
                    className={`
                      text-slate-400 text-xs transition-transform cursor-pointer
                      ${showSortMenu ? 'rotate-180' : ''}
                    `} 
                  />
                </div>
              </button>

              {/* Menu mobile com overlay */}
              <AnimatePresence>
                {showSortMenu && (
                  <>
                    {/* Overlay para mobile (fecha ao clicar fora) */}
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="fixed inset-0 bg-black/50 z-40 sm:hidden"
                      onClick={() => setShowSortMenu(false)}
                    />
                    
                    {/* Menu dropdown - responsivo */}
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: -10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -10 }}
                      className="
                        absolute left-0 right-0 sm:left-0 sm:w-56 mt-2 z-50
                        bg-slate-800 border border-slate-700 rounded-xl
                        shadow-2xl overflow-hidden
                        sm:absolute sm:right-auto
                        mx-4 sm:mx-0
                      "
                    >
                      <div className="p-2">
                        {/* Header do menu no mobile */}
                        <div className="sm:hidden flex items-center justify-between p-3 border-b border-slate-700 mb-2">
                          <span className="text-sm font-medium text-slate-300">Ordenar por</span>
                          <button
                            onClick={() => setShowSortMenu(false)}
                            className="p-1.5 rounded-lg bg-slate-700 text-slate-400"
                          >
                            <FaTimes size={14} />
                          </button>
                        </div>

                        {sortOptions.map((option) => (
                          <button
                            key={option.value}
                            onClick={() => {
                              setSortBy(option.value as SortOption);
                              setShowSortMenu(false);
                            }}
                            className={`
                              w-full flex items-start gap-3 px-4 py-3 sm:py-2.5 rounded-lg
                              transition-colors text-left
                              ${sortBy === option.value 
                                ? 'bg-purple-600/20' 
                                : 'hover:bg-slate-700/50 active:bg-slate-700'
                              }
                            `}
                          >
                            <span className={`
                              mt-0.5 text-lg shrink-0
                              ${sortBy === option.value ? 'text-purple-400' : 'text-slate-400'}
                            `}>
                              {option.icon}
                            </span>
                            <div className="flex-1 min-w-0">
                              <div className={`
                                font-medium text-sm sm:text-sm
                                ${sortBy === option.value ? 'text-purple-400' : 'text-white'}
                              `}>
                                {option.label}
                              </div>
                              <div className="text-xs text-slate-500 truncate">
                                {option.description}
                              </div>
                            </div>
                            {sortBy === option.value && (
                              <span className="text-purple-400 text-sm shrink-0">✓</span>
                            )}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>


          </div>

          {/* RESULTS COUNT */}
          {!loading && (
            <div className="text-xs text-slate-500">
              {processedCategories.length} {processedCategories.length === 1 ? 'categoria' : 'categorias'} encontradas
            </div>
          )}
        </div>
      </div>

      {/* LISTA */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`${viewMode}-${processedCategories.length}-${search}-${sortBy}-${sortOrder}`}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          <CategoriesList
            categories={processedCategories}
            loading={loading}
            viewMode={viewMode}
            search={search}
          />
        </motion.div>
      </AnimatePresence>

      {/* FAB MOBILE */}
      <button
        onClick={() => router.push("/categorias/nova")}
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
      </button>
    </ProtectedRoute>
  );
}
