'use client';

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaArrowLeft,
  FaEdit,
  FaTrash,
  FaTag,
  FaCalendarAlt,
  FaInfoCircle,
  FaArrowUp,
  FaArrowDown,
  FaCopy,
  FaSpinner,
  FaWallet,
  FaFileInvoice,
} from "react-icons/fa";

import { transactionService, accountService, categoryService } from "@/app/services";
import { TransactionModel } from "@/app/types/transaction";
import { AccountModel } from "@/app/types/account";
import { CategoryModel } from "@/app/types/category";
import { useAuth } from "@/app/context";
import { ProtectedRoute, ConfirmationModal, Button, IconRenderer } from "@/app/components";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function TransactionShowPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAuth();

  const [transaction, setTransaction] = useState<TransactionModel | null>(null);
  const [account, setAccount] = useState<AccountModel | null>(null);
  const [category, setCategory] = useState<CategoryModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function load() {
      if (!user?.id) return;

      try {
        // Buscar transação
        const transactionRes = await transactionService.getTransactionById(String(id));
        const tx = transactionRes.data;
        setTransaction(tx);

        // Buscar conta associada
        if (tx.accountId) {
          const accountRes = await accountService.getAccountById(tx.accountId);
          setAccount(accountRes.data);
        }

        // Buscar categoria associada
        if (tx.categoryId) {
          const categoryRes = await categoryService.getCategoryById(tx.categoryId);
          setCategory(categoryRes.data);
        }

      } catch (error) {
        console.error("Erro ao carregar transação:", error);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [id, user?.id]);

  async function handleDelete() {
    if (!transaction) return;
    
    try {
      setIsDeleting(true);
      await transactionService.deleteTransaction(transaction.id);
      router.push("/transacoes");
    } catch (error) {
      console.error("Erro ao excluir transação:", error);
    } finally {
      setIsDeleting(false);
      setIsDeleteModalOpen(false);
    }
  }

  const handleCopyId = () => {
    if (transaction?.id) {
      navigator.clipboard.writeText(transaction.id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleBack = () => {
    router.push('/transacoes');
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value / 100);
  };

  const getStatusBadge = (status: string) => {
    const config = {
      COMPLETED: { label: 'Concluída', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
      PENDING: { label: 'Pendente', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
      CANCELLED: { label: 'Cancelada', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
    };
    return config[status as keyof typeof config] || config.COMPLETED;
  };

  const transactionDate = transaction 
    ? new Date(transaction.year, transaction.month - 1, transaction.day)
    : null;

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="space-y-6">
          <div className="h-10 w-32 bg-white/5 rounded-xl animate-pulse" />
          <div className="h-64 bg-white/5 rounded-3xl animate-pulse" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 h-96 bg-white/5 rounded-3xl animate-pulse" />
            <div className="h-64 bg-white/5 rounded-3xl animate-pulse" />
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (!transaction) {
    return (
      <ProtectedRoute>
        <div className="text-center py-24">
          <div className="text-6xl mb-4">❌</div>
          <h3 className="text-xl font-medium text-white mb-2">
            Transação não encontrada
          </h3>
          <Button
            variant="primary"
            onClick={() => router.push('/transacoes')}
          >
            Voltar para listagem
          </Button>
        </div>
      </ProtectedRoute>
    );
  }

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
              <h3 className="text-xl font-bold text-white mb-2">Excluindo transação</h3>
              <p className="text-slate-400 mb-6">
                Por favor, aguarde...
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
              Detalhes da Transação
            </h1>
            <p className="text-sm text-slate-400">
              Visualize informações completas
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <Button
            variant="primary"
            size="md"
            onClick={() => router.push(`/transacoes/alterar/${transaction.id}`)}
            icon={<FaEdit />}
            disabled={isDeleting}
          >
            Editar
          </Button>

          <Button
            variant="danger"
            size="md"
            onClick={() => setIsDeleteModalOpen(true)}
            icon={<FaTrash />}
            disabled={isDeleting}
            isLoading={isDeleting}
          >
            Excluir
          </Button>
        </div>
      </div>

      {/* CONTEÚDO PRINCIPAL */}
      <div className={`grid lg:grid-cols-3 gap-6 transition-opacity duration-300 ${isDeleting ? 'opacity-50 pointer-events-none' : ''}`}>
        {/* COLUNA PRINCIPAL - 2/3 */}
        <div className="lg:col-span-2 space-y-6">
          {/* CARD PRINCIPAL */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative rounded-3xl overflow-hidden"
          >
            <div className="relative backdrop-blur-xl bg-white/5 border border-white/10 p-6 lg:p-8">
              {/* Header com tipo */}
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className={`
                    w-16 h-16 rounded-2xl flex items-center justify-center text-2xl
                    ${transaction.type === 'INCOME' 
                      ? 'bg-green-500/20 text-green-400' 
                      : 'bg-red-500/20 text-red-400'
                    }
                  `}>
                    {transaction.type === 'INCOME' ? <FaArrowUp /> : <FaArrowDown />}
                  </div>
                  
                  <div>
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className={`
                        text-xs px-2 py-1 rounded-full border
                        ${getStatusBadge(transaction.status).color}
                      `}>
                        {getStatusBadge(transaction.status).label}
                      </span>
                      
                      <span className="text-xs px-2 py-1 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                        ID: {transaction.id.slice(0, 8)}...
                      </span>
                    </div>
                    
                    <h2 className="text-2xl font-bold text-white">
                      {transaction.description || "Sem descrição"}
                    </h2>
                  </div>
                </div>

                {/* Botão copiar ID */}
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

              {/* Valor */}
              <div className="mb-8">
                <p className="text-sm text-slate-400 uppercase tracking-wider mb-2">
                  Valor
                </p>
                <div className="flex items-baseline gap-4">
                  <h1 className={`
                    text-5xl lg:text-6xl font-bold
                    ${transaction.type === 'INCOME' ? 'text-green-400' : 'text-red-400'}
                  `}>
                    {transaction.type === 'INCOME' ? '+' : '-'}
                    {formatCurrency(transaction.amount)}
                  </h1>
                </div>
              </div>

              {/* Grid de informações */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/50">
                  <p className="text-xs text-slate-500 mb-1">Data</p>
                  <p className="text-sm text-white flex items-center gap-2">
                    <FaCalendarAlt size={12} className="text-slate-400" />
                    {transactionDate && format(transactionDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/50">
                  <p className="text-xs text-slate-500 mb-1">Criada em</p>
                  <p className="text-sm text-white flex items-center gap-2">
                    <FaCalendarAlt size={12} className="text-slate-400" />
                    {format(new Date(transaction.createdAt), "dd/MM/yyyy HH:mm")}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* DETALHES ADICIONAIS - CORRIGIDO COM IconRenderer */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 p-6"
          >
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <FaInfoCircle className="text-purple-400" />
              Informações Adicionais
            </h3>

            <div className="space-y-4">
              {category && (
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/40">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                      <FaTag className="text-purple-400 text-sm" />
                    </div>
                    <span className="text-sm text-slate-300">Categoria</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* CORRIGIDO: Usando IconRenderer com a cor da categoria */}
                    <div style={{ color: category.color }}>
                      <IconRenderer 
                        iconName={category.icon || "tag"} 
                        size={16} 
                      />
                    </div>
                    <span className="text-white font-medium">{category.name}</span>
                  </div>
                </div>
              )}

              {account && (
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/40">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                      <FaWallet className="text-blue-400 text-sm" />
                    </div>
                    <span className="text-sm text-slate-300">Conta</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* CORRIGIDO: Usando IconRenderer para a conta também */}
                    <div 
                      className="w-5 h-5 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: account.color }}
                    >
                      <IconRenderer 
                        iconName={account.icon || "wallet"} 
                        size={12}
                        className="text-white"
                      />
                    </div>
                    <span className="text-white font-medium">{account.name}</span>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* SIDEBAR - 1/3 */}
        <div className="space-y-6">
          {/* RESUMO */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 p-6"
          >
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <FaFileInvoice className="text-purple-400" />
              Resumo
            </h3>

            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-gradient-to-br from-purple-600/20 to-indigo-600/20 border border-purple-500/20">
                <p className="text-xs text-slate-400 mb-1">Tipo</p>
                <p className="text-white font-medium flex items-center gap-2">
                  {transaction.type === 'INCOME' ? (
                    <>
                      <FaArrowUp className="text-green-400" />
                      <span>Receita</span>
                    </>
                  ) : (
                    <>
                      <FaArrowDown className="text-red-400" />
                      <span>Despesa</span>
                    </>
                  )}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-gradient-to-br from-blue-600/20 to-cyan-600/20 border border-blue-500/20">
                <p className="text-xs text-slate-400 mb-1">Status</p>
                <p className="text-white font-medium">
                  {getStatusBadge(transaction.status).label}
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* MODAL DE CONFIRMAÇÃO */}
      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => !isDeleting && setIsDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title="Excluir transação"
        message={`Tem certeza que deseja excluir esta transação? Esta ação não poderá ser desfeita.`}
        confirmText="Excluir"
        variant="danger"
        isLoading={isDeleting}
      />
    </ProtectedRoute>
  );
}