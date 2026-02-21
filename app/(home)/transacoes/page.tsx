"use client";

import { useTransactions, useCategories } from "@/app/hook";
import { ProtectedRoute, TransactionList, Input, Button, Select } from "@/app/components";
import { useMemo, useState } from "react";
import Link from "next/link";
import {
  FaPlus,
  FaSearch,
  FaFilter,
  FaCalendarAlt,
  FaChartPie,
} from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import IconRenderer from "@/app/components/ui/IconRenderer";
import { TransactionStatus } from "@/app/types/transaction";

type FilterType = "ALL" | "INCOME" | "EXPENSE";
type StatusFilter = "ALL" | TransactionStatus;

export default function TransactionsPage() {
  const { transactions, loading } = useTransactions();
  const { categories } = useCategories();
  
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<FilterType>("ALL");
  const [filterStatus, setFilterStatus] = useState<StatusFilter>("ALL"); // ← Novo estado para status
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [showFilters, setShowFilters] = useState(false);

  // Obter meses únicos para filtro
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    transactions.forEach(t => {
      months.add(`${t.year}-${String(t.month).padStart(2, '0')}`);
    });
    return Array.from(months).sort().reverse();
  }, [transactions]);

  const processedTransactions = useMemo(() => {
    let result = [...transactions];

    // 🔎 Busca por descrição
    if (search) {
      result = result.filter((t) =>
        t.description?.toLowerCase().includes(search.toLowerCase())
      );
    }

    // 🏷️ Filtro por tipo (INCOME/EXPENSE)
    if (filterType !== "ALL") {
      result = result.filter((t) => t.type === filterType);
    }

    // 📊 Filtro por status (COMPLETED/PENDING/CANCELLED)
    if (filterStatus !== "ALL") {
      result = result.filter((t) => t.status === filterStatus);
    }

    // 📂 Filtro por categoria
    if (selectedCategory) {
      result = result.filter((t) => t.categoryId === selectedCategory);
    }

    // 📅 Filtro por mês
    if (selectedMonth) {
      const [year, month] = selectedMonth.split('-').map(Number);
      result = result.filter((t) => t.year === year && t.month === month);
    }

    return result;
  }, [transactions, search, filterType, filterStatus, selectedCategory, selectedMonth]);

  // Calcular totais
  const totals = useMemo(() => {
    const income = processedTransactions
      .filter(t => t.type === "INCOME")
      .reduce((sum, t) => sum + t.amount, 0);
    
    const expense = processedTransactions
      .filter(t => t.type === "EXPENSE")
      .reduce((sum, t) => sum + t.amount, 0);
    
    return { income, expense, balance: income - expense };
  }, [processedTransactions]);

  // Opções de tipo (Receita/Despesa)
  const typeOptions = [
    { value: "ALL", label: "Todas", icon: "📊" },
    { value: "INCOME", label: "Receitas", icon: "📈" },
    { value: "EXPENSE", label: "Despesas", icon: "📉" },
  ];

  // Opções de status (CORRIGIDO)
  const statusOptions = [
    { value: "ALL", label: "Todos", icon: "🔄" },
    { value: "COMPLETED", label: "Concluídas", icon: "✅", description: "Transações efetivadas" },
    { value: "PENDING", label: "Pendentes", icon: "⏳", description: "Aguardando confirmação" },
    { value: "CANCELLED", label: "Canceladas", icon: "❌", description: "Transações canceladas" },
  ];

  // Opções de categoria formatadas corretamente para o Select
  const categoryOptions = useMemo(() => {
    if (!categories || categories.length === 0) {
      return [{ value: "", label: "Todas categorias" }];
    }
    
    const options = [
      { value: "", label: "Todas categorias" },
      ...categories.map(c => ({ 
        value: c.id,
        label: c.name,
        icon: (
          <div style={{ color: c.color }}>
            <IconRenderer iconName={c.icon || "wallet"} size={16} />
          </div>
        ),
        description: c.type === 'INCOME' ? 'Receita' : 'Despesa',
        type: c.type
      }))
    ];
    
    return options;
  }, [categories]);

  // Opções de mês formatadas corretamente para o Select
  const monthOptions = useMemo(() => {
    if (!availableMonths || availableMonths.length === 0) {
      return [{ value: "", label: "Todos os meses" }];
    }
    
    const options = [
      { value: "", label: "Todos os meses" },
      ...availableMonths.map(m => {
        const [year, month] = m.split('-');
        const date = new Date(Number(year), Number(month) - 1);
        return {
          value: m,
          label: date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
        };
      }),
    ];
    
    return options;
  }, [availableMonths]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value / 100);
  };

  return (
    <ProtectedRoute>
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white">
            Transações
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Gerencie suas receitas e despesas
          </p>
        </div>

        <Link href="/transacoes/nova" className="w-full sm:w-auto">
          <Button
            variant="primary"
            size="lg"
            icon={<FaPlus />}
            fullWidth
          >
            Nova Transação
          </Button>
        </Link>
      </div>

      {/* RESUMO */}
      {!loading && processedTransactions.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-3 gap-2 sm:gap-4"
        >
          <div className="rounded-xl p-2 sm:p-4 bg-gradient-to-br from-green-600/20 to-emerald-600/20 border border-green-500/20">
            <p className="text-xs sm:text-sm text-slate-400 mb-1">Receitas</p>
            <p className="text-xs sm:text-2xl font-bold text-green-400">
              {formatCurrency(totals.income)}
            </p>
          </div>

          <div className="rounded-xl p-2 sm:p-4 bg-gradient-to-br from-red-600/20 to-rose-600/20 border border-red-500/20">
            <p className="text-xs sm:text-sm text-slate-400 mb-1">Despesas</p>
            <p className="text-xs sm:text-2xl font-bold text-red-400">
              {formatCurrency(totals.expense)}
            </p>
          </div>
          
          <div className="rounded-xl p-2 sm:p-4 bg-gradient-to-br from-purple-600/20 to-indigo-600/20 border border-purple-500/20">
            <p className="text-xs sm:text-sm text-slate-400 mb-1">Saldo</p>
            <p className={`text-xs sm:text-2xl font-bold ${
              totals.balance >= 0 ? 'text-purple-400' : 'text-orange-400'
            }`}>
              {formatCurrency(Math.abs(totals.balance))}
              {totals.balance < 0 && ' (negativo)'}
            </p>
          </div>
        </motion.div>
      )}

      {/* TOOLBAR */}
      <div className="sticky top-4 z-10 rounded-2xl p-4 bg-slate-900/80 backdrop-blur-xl border border-white/10 shadow-[0_10px_40px_rgba(0,0,0,0.4)]">
        <div className="flex flex-col gap-3">
          {/* Primeira linha: Busca e filtros toggle */}
          <div className="flex items-center justify-end gap-2">
            <Button
              variant={showFilters ? "primary" : "outline"}
              size="md"
              onClick={() => setShowFilters(!showFilters)}
              icon={<FaFilter />}
              className={!showFilters ? "!text-slate-400" : ""}
            >
              Filtros
            </Button>
          </div>

          {/* Filtros avançados */}
          <AnimatePresence>
            {showFilters && (
              <>
                <div className="">
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar transação..."
                    icon={<FaSearch />}
                    variant="filled"
                    disabled={loading}
                    clearable
                  />
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="flex bg-slate-800/60 border border-slate-700 rounded-xl p-1">
                    {typeOptions.map(option => (
                      <button
                        key={option.value}
                        onClick={() => setFilterType(option.value as FilterType)}
                        className={`
                          px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex-1
                          ${filterType === option.value
                            ? 'bg-purple-600 text-white'
                            : 'text-slate-400 hover:text-white'
                          }
                        `}
                      >
                        <span className="flex items-center gap-1 justify-center">
                          <span>{option.icon}</span>
                          <span className="hidden sm:inline">{option.label}</span>
                        </span>
                      </button>
                    ))}
                  </div>

                  {/* Botões de status */}
                  <div className="flex bg-slate-800/60 border border-slate-700 rounded-xl p-1">
                    {statusOptions.map(option => (
                      <button
                        key={option.value}
                        onClick={() => setFilterStatus(option.value as StatusFilter)}
                        className={`
                          px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex-1
                          ${filterStatus === option.value
                            ? 'bg-purple-600 text-white'
                            : 'text-slate-400 hover:text-white'
                          }
                        `}
                        title={option.description}
                      >
                        <span className="flex items-center gap-1 justify-center">
                          <span>{option.icon}</span>
                          <span className="hidden sm:inline">{option.label}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-3 border-t border-white/10 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Select
                    value={selectedCategory}
                    onChange={(value) => setSelectedCategory(value?.toString() || "")}
                    options={categoryOptions}
                    placeholder="Filtrar por categoria"
                    variant="filled"
                    size="md"
                    disabled={loading}
                    icon={<FaChartPie />}
                  />

                  <Select
                    value={selectedMonth}
                    onChange={(value) => setSelectedMonth(value?.toString() || "")}
                    options={monthOptions}
                    placeholder="Filtrar por mês"
                    variant="filled"
                    size="md"
                    disabled={loading}
                    icon={<FaCalendarAlt />}
                  />
                </div>
              </>
            )}
          </AnimatePresence>

          {/* Contador de resultados e botão para limpar filtros */}
          {!loading && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">
                {processedTransactions.length} {processedTransactions.length === 1 ? 'transação' : 'transações'} encontradas
              </span>
              
              {(search || filterType !== "ALL" || filterStatus !== "ALL" || selectedCategory || selectedMonth) && (
                <button
                  onClick={() => {
                    setSearch("");
                    setFilterType("ALL");
                    setFilterStatus("ALL");
                    setSelectedCategory("");
                    setSelectedMonth("");
                  }}
                  className="text-purple-400 hover:text-purple-300 transition-colors"
                >
                  Limpar filtros
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* LISTA */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`${processedTransactions.length}-${filterType}-${filterStatus}-${selectedCategory}-${selectedMonth}`}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          <TransactionList
            transactions={processedTransactions}
            categories={categories}
            loading={loading}
            search={search}
          />
        </motion.div>
      </AnimatePresence>

      {/* FAB MOBILE */}
      <Link
        href="/transacoes/nova"
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
