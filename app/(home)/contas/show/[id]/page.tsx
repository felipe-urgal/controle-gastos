'use client';

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaArrowLeft,
  FaEdit,
  FaWallet,
  FaTrash,
  FaChartLine,
  FaArrowUp,
  FaArrowDown,
  FaCopy,
  FaEye,
  FaCalendarAlt,
  FaTag,
  FaSpinner
} from "react-icons/fa";

import { accountService, transactionService } from "@/app/services";
import { AccountModel } from "@/app/types/account";
import { useAuth } from "@/app/context";
import { ProtectedRoute, ConfirmationModal, Button, IconRenderer } from "@/app/components";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function AccountShowPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAuth();

  const [account, setAccount] = useState<AccountModel | null>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showAllTransactions, setShowAllTransactions] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function load() {
      if (!user?.id) return;

      try {
        const [accountRes, transactionsRes] = await Promise.all([
          accountService.getAccountById(String(id)),
          transactionService.getTransactions(user.id, {
            account: String(id),
            status: "COMPLETED",
          }),
        ]);

        setAccount(accountRes.data);

        const items = transactionsRes.data.items;
        setTransactions(items);
        setSummary(transactionsRes.data.additionalData);

      } finally {
        setLoading(false);
      }
    }

    load();
  }, [id, user?.id]);

  async function handleDelete() {
    if (!account) return;
    try {
      setIsDeleting(true);
      await accountService.deleteAccount(account.id);
      router.push("/contas");
    } finally {
      setIsDeleting(false);
      setIsDeleteModalOpen(false);
    }
  }

  const handleCopyId = () => {
    if (account?.id) {
      navigator.clipboard.writeText(account.id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleBack = () => {
    router.push('/contas');
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="h-10 w-32 bg-white/5 rounded-xl" />
        <div className="h-64 bg-white/5 rounded-3xl" />
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="xl:col-span-2 h-96 bg-white/5 rounded-3xl" />
          <div className="h-64 bg-white/5 rounded-3xl" />
        </div>
      </ProtectedRoute>
    );
  }

  if (!account) {
    return (
      <ProtectedRoute>
        <div className="text-6xl mb-4">🏦</div>
        <h3 className="text-xl font-medium text-white mb-2">
          Conta não encontrada
        </h3>
        <Button
          variant="primary"
          onClick={() => router.push('/contas')}
        >
          Voltar para listagem
        </Button>
      </ProtectedRoute>
    );
  }

  const formatCurrency = (value: number) =>
    user?.showValues
      ? new Intl.NumberFormat("pt-BR", {
          style: "currency",
          currency: account.currency,
        }).format(value / 100)
      : "••••••";

  const displayedTransactions = showAllTransactions 
    ? transactions 
    : transactions.slice(0, 5);

  const typeLabels = {
    CREDIT_DEBIT: "Conta Corrente",
    INVESTMENT: "Investimento"
  };

  return (
    <ProtectedRoute>
      {/* Overlay de loading durante exclusão */}
      <AnimatePresence>
        {isDeleting && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-slate-900 rounded-2xl p-8 text-center max-w-sm mx-4 border border-white/10"
            >
              <div className="relative w-20 h-20 mx-auto mb-6">
                <div className="absolute inset-0 rounded-full border-4 border-red-500/30" />
                <div className="absolute inset-0 rounded-full border-4 border-red-500 border-t-transparent animate-spin" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Excluindo conta</h3>
              <p className="text-slate-400 mb-6">
                Por favor, aguarde enquanto excluímos a conta...
              </p>
              <div className="flex items-center justify-center gap-2 text-sm text-slate-500">
                <FaSpinner className="animate-spin" />
                <span>Processando</span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleBack}
            className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
            disabled={isDeleting}
          >
            <FaArrowLeft size={14} className="text-slate-400" />
          </motion.button>
          
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">
              Detalhes da Conta
            </h1>
            <p className="text-sm text-slate-400">
              Visualize informações e transações
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <Button
            variant="primary"
            size="md"
            onClick={() => router.push(`/contas/alterar/${account.id}`)}
            icon={<FaEdit />}
            disabled={isDeleting}
          >
            <span className="">Editar</span>
          </Button>

          <Button
            variant="danger"
            size="md"
            onClick={() => setIsDeleteModalOpen(true)}
            icon={<FaTrash />}
            disabled={isDeleting}
            isLoading={isDeleting}
          >
            <span className="">Excluir</span>
          </Button>
        </div>
      </div>

      {/* DASHBOARD GRID */}
      <div className={`grid xl:grid-cols-3 gap-6 lg:gap-8 transition-opacity duration-300 ${isDeleting ? 'opacity-50 pointer-events-none' : ''}`}>
        {/* MAIN CONTENT - 2/3 */}
        <div className="xl:col-span-2 space-y-4 lg:space-y-8">
          {/* HERO CARD */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="relative rounded-3xl overflow-hidden"
          >
            {/* Background com gradiente */}
            <div
              className="absolute inset-0 opacity-30"
              style={{
                background: `linear-gradient(135deg, ${account.color}40, transparent 70%)`
              }}
            />
            
            <div className="relative backdrop-blur-xl bg-white/5 border border-white/10 p-6 lg:p-8">
              {/* Status Badge */}
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-3">
                  <div
                    className="w-14 h-14 lg:w-16 lg:h-16 rounded-2xl flex items-center justify-center text-white shadow-xl"
                    style={{ 
                      backgroundColor: account.color,
                      boxShadow: `0 10px 20px ${account.color}40`
                    }}
                  >
                    <IconRenderer iconName={account.icon || "wallet"} size={24} />
                  </div>

                  <div>
                    <h1 className="text-2xl lg:text-3xl font-bold text-white">
                      {account.name}
                    </h1>
                    <div className="flex items-center gap-2 mt-1">
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

                {/* Copy ID Button */}
                <button
                  onClick={handleCopyId}
                  className="relative group"
                  disabled={isDeleting}
                >
                  <div className="p-2 rounded-lg bg-slate-800/60 border border-slate-700 hover:border-purple-500/40 transition-colors">
                    <FaCopy size={14} className="text-slate-400 group-hover:text-purple-400" />
                  </div>
                  
                  <AnimatePresence>
                    {copied && (
                      <motion.span
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute right-0 top-full mt-2 text-xs bg-purple-600 text-white px-2 py-1 rounded-lg whitespace-nowrap"
                      >
                        ID copiado!
                      </motion.span>
                    )}
                  </AnimatePresence>
                </button>
              </div>

              {/* Descrição */}
              {account.description && (
                <div className="mb-6 p-4 rounded-xl bg-slate-800/40 border border-slate-700/50">
                  <p className="text-sm text-slate-300 italic">
                    {account.description}
                  </p>
                </div>
              )}

              {/* Balance */}
              <div className="mt-8">
                <p className="text-sm text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <FaEye size={12} />
                  Saldo Atual
                </p>
                <div className="flex items-baseline justify-between mt-2">
                  <h2
                    className="text-4xl lg:text-5xl font-bold"
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

              {/* Metadata */}
              <div className="mt-8 grid grid-cols-2 gap-4">
                <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/50">
                  <p className="text-xs text-slate-500 mb-1">Criada em</p>
                  <p className="text-sm text-white flex items-center gap-2">
                    <FaCalendarAlt size={12} className="text-slate-400" />
                    {format(new Date(account.createdAt), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
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

          {/* TRANSAÇÕES */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 overflow-hidden"
          >
            <div className="p-6 border-b border-white/10">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">
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
              <div className="p-12 text-center">
                <div className="text-4xl mb-3">💸</div>
                <p className="text-slate-400 mb-2">
                  Nenhuma transação registrada
                </p>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => router.push(`/transacoes/nova?account=${account.id}`)}
                  disabled={isDeleting}
                >
                  + Criar primeira transação
                </Button>
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
                        <div className="flex items-center gap-4">
                          <div className={`
                            w-10 h-10 rounded-xl flex items-center justify-center
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
                            <div className="flex items-center gap-2 mt-1">
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

                        <p className={`font-semibold text-lg ${
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

        {/* SIDEBAR - 1/3 */}
        <div className="space-y-4">
          {/* RESUMO FINANCEIRO */}
          {summary && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.2 }}
              className="rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 p-6"
            >
              <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                <FaChartLine className="text-purple-400" />
                Resumo do Período
              </h3>

              <div className="space-y-5">
                <div className="flex items-center justify-between p-3 rounded-xl bg-green-500/5 border border-green-500/10">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
                      <FaArrowUp className="text-green-400 text-sm" />
                    </div>
                    <span className="text-sm text-slate-300">Receitas</span>
                  </div>
                  <span className="text-green-400 font-semibold">
                    + {formatCurrency(summary.income)}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-red-500/5 border border-red-500/10">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center">
                      <FaArrowDown className="text-red-400 text-sm" />
                    </div>
                    <span className="text-sm text-slate-300">Despesas</span>
                  </div>
                  <span className="text-red-400 font-semibold">
                    - {formatCurrency(summary.expenses)}
                  </span>
                </div>

                <div className="border-t border-white/10 pt-5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-400">Resultado Líquido</span>
                    <span className={`font-bold text-lg ${
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
                      <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-green-500 rounded-full"
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

          {/* STATS CARDS */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.3 }}
            className="grid grid-cols-2 gap-4"
          >
            <div className="p-5 rounded-2xl bg-gradient-to-br from-purple-600/20 to-indigo-600/20 border border-purple-500/20">
              <div className="w-10 h-10 rounded-xl bg-purple-600/30 flex items-center justify-center mb-3">
                <FaWallet className="text-purple-400" />
              </div>
              <p className="text-xs text-slate-400 mb-1">Total de Transações</p>
              <p className="text-2xl font-bold text-white">
                {account._count?.transactions ?? 0}
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-gradient-to-br from-blue-600/20 to-cyan-600/20 border border-blue-500/20">
              <div className="w-10 h-10 rounded-xl bg-blue-600/30 flex items-center justify-center mb-3">
                <FaTag className="text-blue-400" />
              </div>
              <p className="text-xs text-slate-400 mb-1">Média por Transação</p>
              <p className="text-2xl font-bold text-white">
                {transactions.length > 0 
                  ? formatCurrency(transactions.reduce((acc, t) => acc + t.amount, 0) / transactions.length)
                  : "R$ 0"}
              </p>
            </div>
          </motion.div>
        </div>
      </div>

      {/* MODAL DE CONFIRMAÇÃO */}
      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => !isDeleting && setIsDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title="Excluir conta"
        message={`Tem certeza que deseja excluir a conta "${account.name}"? Esta ação não poderá ser desfeita e todas as transações associadas serão removidas.`}
        confirmText="Excluir"
        variant="danger"
        isLoading={isDeleting}
      />
    </ProtectedRoute>
  );
}
