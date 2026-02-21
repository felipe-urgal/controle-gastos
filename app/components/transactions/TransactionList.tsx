"use client";

import { TransactionModel } from "@/app/types/transaction";
import { CategoryModel } from "@/app/types/category";
import TransactionListCard from "./TransactionListCard";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  transactions: TransactionModel[];
  categories: CategoryModel[];  // ← Array de categorias
  loading: boolean;
  search?: string;
}

export default function TransactionList({
  transactions,
  categories,
  loading,
  search = "",
}: Props) {
  // Função para encontrar a categoria de uma transação
  const getCategoryForTransaction = (transaction: TransactionModel) => {
    return categories.find(c => c.id === transaction.categoryId);
  };

  // Agrupar transações por data
  const groupedTransactions = transactions.reduce((groups, transaction) => {
    const dateKey = `${transaction.year}-${String(transaction.month).padStart(2, '0')}-${String(transaction.day).padStart(2, '0')}`;
    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(transaction);
    return groups;
  }, {} as Record<string, TransactionModel[]>);

  // Ordenar as datas (mais recentes primeiro)
  const sortedDates = Object.keys(groupedTransactions).sort((a, b) => {
    return new Date(b).getTime() - new Date(a).getTime();
  });

  const formatDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('pt-BR', { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="rounded-2xl p-4 bg-white/5 animate-pulse"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-slate-700" />
              <div className="flex-1">
                <div className="h-4 bg-slate-700 rounded w-1/3 mb-2" />
                <div className="h-3 bg-slate-700 rounded w-1/4" />
              </div>
              <div className="w-20 h-8 bg-slate-700 rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!transactions.length) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-center py-24"
      >
        <div className="text-6xl mb-4">📊</div>
        <h3 className="text-xl font-medium text-white mb-2">
          Nenhuma transação encontrada
        </h3>
        <p className="text-slate-400">
          {search ? 'Tente buscar por outro termo' : 'Crie sua primeira transação para começar'}
        </p>
      </motion.div>
    );
  }

  return (
    <div className="space-y-8">
      {sortedDates.map((date) => (
        <motion.div
          key={date}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-3"
        >
          {/* Cabeçalho da data */}
          <div className="sticky top-[140px] z-5">
            <div className="inline-block px-4 py-2 rounded-full bg-slate-800/90 backdrop-blur-xl border border-slate-700 text-sm font-medium text-white">
              {formatDate(date)}
            </div>
          </div>

          {/* Transações do dia */}
          <div className="space-y-2">
            <AnimatePresence mode="popLayout">
              {groupedTransactions[date].map((transaction, index) => (
                <motion.div
                  key={transaction.id}
                  layout
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ 
                    duration: 0.2,
                    delay: index * 0.03
                  }}
                >
                  <TransactionListCard
                    transaction={transaction}
                    category={getCategoryForTransaction(transaction)} // ← Passa a categoria encontrada
                    searchTerm={search}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
