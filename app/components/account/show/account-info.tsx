'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";

import { motion, AnimatePresence } from "framer-motion";

import { FaEye, FaCalendarAlt, FaArrowUp, FaArrowDown, FaTag, FaChartLine, FaWallet } from "react-icons/fa";

import { format } from "date-fns";

import { IconRenderer } from "@/app/components";

interface AccountInfoProps {
  account: any;
  transactions: any[];
  summary?: {
    income: number;
    expenses: number;
    balance: number;
  } | null;
  isDeleting: boolean;
  typeLabels: Record<string, string>;
};

export default function AccountInfo({
  account,
  transactions,
  summary,
  isDeleting,
  typeLabels,
}: AccountInfoProps) {
  const router = useRouter();

  const [showAllTransactions, setShowAllTransactions] = useState(false);

  const displayedTransactions = showAllTransactions
    ? transactions
    : transactions.slice(0, 5);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: account.currency,
    }).format(value / 100);

  return (
    <div className={`grid xl:grid-cols-3 gap-4 transition-opacity duration-300 ${isDeleting ? 'opacity-50 pointer-events-none' : ''}`}>
      <div className="xl:col-span-2 space-y-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="relative rounded-2xl overflow-hidden"
        >
          <div
            className="absolute inset-0 opacity-30"
            style={{
              background: `linear-gradient(135deg, ${account.color}40, transparent 70%)`
            }}
          />
          
          <div className="relative backdrop-blur-xl bg-white/5 border border-white/5 p-4">

            <div className="flex items-center gap-2 mb-4">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-xl"
                style={{ 
                  backgroundColor: account.color,
                  boxShadow: `0 10px 20px ${account.color}40`
                }}
              >
                <IconRenderer iconName={account.icon || "wallet"} size={20} />
              </div>

              <div>
                <h1 className="text-2xl font-bold text-white">
                  {account.name}
                </h1>
                <div className="flex items-center gap-2">
                  <span className={`
                    text-xs px-2 py-1 rounded-full
                    ${account.type === 'INVESTMENT' 
                      ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                      : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                    }
                  `}>
                    {typeLabels[account.type]}
                  </span>
                  
                  {!account.isActive && (
                    <span className="text-xs px-2 py-1 rounded-full bg-slate-700 text-slate-400 border border-slate-600">
                      Inativa
                    </span>
                  )}
                </div>
              </div>
            </div>

            {account.description && (
              <div className="p-2 rounded-xl bg-slate-800/40 border border-slate-700/50">
                <p className="text-sm text-slate-300 italic">
                  {account.description}
                </p>
              </div>
            )}

            <div className="mt-4">
              <p className="text-sm text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <FaEye size={12} />
                Saldo Atual
              </p>
              <div className="flex items-baseline justify-between">
                <h2
                  className="text-2xl font-bold"
                  style={{
                    color: account.isActive ? account.color : "#6B7280",
                  }}
                >
                  {formatCurrency(account.balance)}
                </h2>
                
                <span className="text-sm text-slate-500 bg-slate-800/60 px-3 py-1 rounded-full">
                  {account.currency}
                </span>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/50">
                <p className="text-xs text-slate-500 mb-1">Criada em</p>
                <p className="text-sm text-white flex items-center gap-2">
                  <FaCalendarAlt size={12} className="text-slate-400" />
                  {format(new Date(account.createdAt), "dd/MM/yyyy")}
                </p>
              </div>
              
              <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/50">
                <p className="text-xs text-slate-500 mb-1">Última atualização</p>
                <p className="text-sm text-white flex items-center gap-2">
                  <FaCalendarAlt size={12} className="text-slate-400" />
                  {format(new Date(account.updatedAt), "dd/MM/yyyy")}
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="rounded-2xl bg-white/5 backdrop-blur-xl border border-white/5 overflow-hidden"
        >
          <div className="p-4 border-b border-white/5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">
                Últimas Transações
              </h3>
              
              {transactions.length > 5 && (
                <button
                  onClick={() => setShowAllTransactions(!showAllTransactions)}
                  className="text-sm text-purple-400 hover:text-purple-300 transition-colors"
                  disabled={isDeleting}
                >
                  {showAllTransactions ? 'Mostrar menos' : 'Ver todas'}
                </button>
              )}
            </div>
          </div>

          {transactions.length === 0 ? (
            <div className="p-4 text-center">
              <p className="text-slate-400 mb-2">
                Nenhuma transação registrada
              </p>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              <AnimatePresence mode="popLayout">
                {displayedTransactions.map((tx, index) => (
                  <motion.div
                    key={tx.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: index * 0.05 }}
                    className="p-4 hover:bg-white/5 transition-colors cursor-pointer"
                    onClick={() => !isDeleting && router.push(`/transacoes/show/${tx.id}`)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`
                          w-8 h-8 rounded-xl flex items-center justify-center
                          ${tx.type === "INCOME" 
                            ? 'bg-green-500/20 text-green-400' 
                            : 'bg-red-500/20 text-red-400'
                          }
                        `}>
                          {tx.type === "INCOME" ? <FaArrowUp /> : <FaArrowDown />}
                        </div>
                        
                        <div>
                          <p className="font-medium text-white">
                            {tx.description || "Sem descrição"}
                          </p>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-500">
                              {format(new Date(tx.year, tx.month - 1, tx.day), "dd/MM/yyyy")}
                            </span>
                            {tx.category && (
                              <>
                                <span className="text-slate-600">•</span>
                                <span className="text-xs text-slate-400 flex items-center gap-1">
                                  <FaTag size={10} />
                                  {tx.category.name}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <p className={`font-semibold text-sm ${
                        tx.type === "INCOME" ? "text-green-400" : "text-red-400"
                      }`}>
                        {tx.type === "INCOME" ? "+" : "-"}
                        {formatCurrency(tx.amount)}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </motion.div>
      </div>

      <div className="space-y-4">
        {summary && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            className="rounded-2xl bg-white/5 backdrop-blur-xl border border-white/5 p-4"
          >
            <h3 className="text-sm font-semibold mb-6 flex items-center gap-2">
              <FaChartLine className="text-purple-400" />
              Resumo do Período
            </h3>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-xl bg-green-500/5 border border-green-500/5">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
                    <FaArrowUp className="text-green-400 text-sm" />
                  </div>
                  <span className="text-sm text-slate-300">Receitas</span>
                </div>
                <span className="text-green-400 font-semibold text-sm">
                  + {formatCurrency(summary.income)}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-red-500/5 border border-red-500/5">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center">
                    <FaArrowDown className="text-red-400 text-sm" />
                  </div>
                  <span className="text-sm text-slate-300">Despesas</span>
                </div>
                <span className="text-red-400 font-semibold text-sm">
                  - {formatCurrency(summary.expenses)}
                </span>
              </div>

              <div className="border-t border-white/5 pt-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-400">Resultado Líquido</span>
                  <span className={`font-bold text-sm ${
                    summary.balance >= 0 ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {summary.balance >= 0 ? '+' : '-'}
                    {formatCurrency(Math.abs(summary.balance))}
                  </span>
                </div>

                {summary.income + summary.expenses > 0 && (
                  <div className="mt-4">
                    <div className="flex justify-between text-xs text-slate-500 mb-1">
                      <span>Receitas {Math.round((summary.income / (summary.income + summary.expenses)) * 100)}%</span>
                      <span>Despesas {Math.round((summary.expenses / (summary.income + summary.expenses)) * 100)}%</span>
                    </div>
                    <div className="h-2 bg-red-400 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-green-400 rounded-full"
                        style={{ 
                          width: `${(summary.income / (summary.income + summary.expenses)) * 100}%` 
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
          className="grid grid-cols-2 gap-4"
        >
          <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-600/20 to-indigo-600/20 border border-purple-500/20">
            <div className="w-8 h-8 rounded-xl bg-purple-600/30 flex items-center justify-center mb-3">
              <FaWallet className="text-purple-400" />
            </div>
            <p className="text-xs text-slate-400 mb-1">Total de Transações</p>
            <p className="text-sm font-bold text-white">
              {account._count?.transactions ?? 0}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-600/20 to-cyan-600/20 border border-blue-500/20">
            <div className="w-8 h-8 rounded-xl bg-blue-600/30 flex items-center justify-center mb-3">
              <FaTag className="text-blue-400" />
            </div>
            <p className="text-xs text-slate-400 mb-1">Média por Transação</p>
            <p className="text-sm font-bold text-white">
              {transactions.length > 0 
                ? formatCurrency(transactions.reduce((acc, t) => acc + t.amount, 0) / transactions.length)
                : "R$ 0"}
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
