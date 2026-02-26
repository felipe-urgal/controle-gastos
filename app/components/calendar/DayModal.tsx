// DayModal.tsx - Versão melhorada
"use client";

import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/app/context";
import {
  SummaryCards,
  LoadingSkeleton,
  EmptyState,
  TransactionsList,
  TransactionFormModal,
  ConfirmationModal,
  Alert
} from "@/app/components";
import { FaPlus, FaTimes, FaCalendarAlt, FaChevronLeft } from "react-icons/fa";
import { transactionService } from "@/app/services/transactionService";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useStandalone } from "@/app/hook";

import { Category, Account, Transaction } from "@/app/types/calendar";

interface DayModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: Date | null;
  transactions: Transaction[];
  isLoading: boolean;
  refreshAccounts?: () => void;
}

export default function DayModal({
  isOpen,
  onClose,
  selectedDate,
  transactions,
  isLoading,
  refreshAccounts,
}: DayModalProps) {
  const { user } = useAuth();
  const { isStandalone } = useStandalone();

  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [optimisticTransactions, setOptimisticTransactions] = useState<Transaction[]>([]);
  const [deletingTransactionId, setDeletingTransactionId] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  
  const [actionLoading, setActionLoading] = useState({
    creating: false,
    updating: false,
    deleting: false,
  });

  const [confirmationModal, setConfirmationModal] = useState({
    isOpen: false,
    transactionId: null as string | null,
    transactionDescription: "",
  });

  // Fetch categorias e contas
  const fetchCategoriesAndAccounts = useCallback(async () => {
    try {
      const [categoriesResponse, accountsResponse] = await Promise.all([
        fetch(`/api/categories`),
        fetch(`/api/accounts`)
      ]);

      if (categoriesResponse.ok) {
        const data = await categoriesResponse.json();
        if (data.success) setCategories(data.data.items);
      }

      if (accountsResponse.ok) {
        const data = await accountsResponse.json();
        if (data.success) setAccounts(data.data.items);
      }
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    }
  }, []);

  // Abrir formulário
  useEffect(() => {
    if (isFormModalOpen) {
      fetchCategoriesAndAccounts();
    }
  }, [isFormModalOpen, fetchCategoriesAndAccounts]);

  // Sincronizar transações
  useEffect(() => {
    if (!isOpen) return;
    setOptimisticTransactions(transactions || []);
  }, [transactions, isOpen]);

  // Prevenir scroll do body
  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [isOpen]);

  const generateId = () => {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  };

  const handleTransactionSubmit = async (data: any) => {
    if (!selectedDate) return;

    const transactionData = {
      ...data,
      year: selectedDate.getFullYear(),
      month: selectedDate.getMonth() + 1,
      day: selectedDate.getDate(),
    };

    try {
      setFormErrors([]);
      setSubmitError(null);

      setActionLoading(prev => ({
        ...prev,
        [editingTransaction ? "updating" : "creating"]: true,
      }));

      let result;

      if (editingTransaction) {
        result = await transactionService.update(editingTransaction.id!, transactionData);
      } else {
        result = await transactionService.create(transactionData);
      }

      if (!result.success) {
        const errorsArray = result.message?.split(";") || [];
        setFormErrors(errorsArray);
        setSubmitError(result.message || "Erro ao salvar transação");
        return;
      }

      // Atualização otimista
      if (editingTransaction) {
        setOptimisticTransactions(prev =>
          prev.map(t =>
            t.id === editingTransaction.id
              ? {
                  ...t,
                  ...transactionData,
                  category: categories.find(c => c.id === transactionData.categoryId),
                  account: accounts.find(a => a.id === transactionData.accountId),
                }
              : t
          )
        );
      } else {
        setOptimisticTransactions(prev => [
          {
            id: result.data?.id ?? generateId(),
            ...transactionData,
            category: categories.find(c => c.id === transactionData.categoryId),
            account: accounts.find(a => a.id === transactionData.accountId),
          },
          ...prev
        ]);
      }

      // Fechar modal e notificar atualização
      setIsFormModalOpen(false);
      setEditingTransaction(null);
      setFormErrors([]);
      window.dispatchEvent(new Event("transactionsUpdated"));

    } catch (error) {
      console.error("Erro ao salvar transação:", error);
      setSubmitError("Erro inesperado ao salvar transação");
    } finally {
      setActionLoading(prev => ({
        ...prev,
        creating: false,
        updating: false,
      }));
    }
  };

  const handleDeleteClick = (id: string, description: string) => {
    setConfirmationModal({
      isOpen: true,
      transactionId: id,
      transactionDescription: description,
    });
  };

  const handleConfirmDelete = async () => {
    const { transactionId } = confirmationModal;
    if (!transactionId) return;

    setActionLoading((p) => ({ ...p, deleting: true }));
    setDeletingTransactionId(transactionId);
    setSubmitError(null);

    try {
      await transactionService.delete(transactionId);
      refreshAccounts?.();

      setOptimisticTransactions(prev =>
        prev.filter(t => t.id !== transactionId)
      );

      window.dispatchEvent(new Event("transactionsUpdated"));
    } catch (error) {
      console.error("Erro ao excluir:", error);
      setSubmitError("Erro ao excluir transação");
    } finally {
      setActionLoading((p) => ({ ...p, deleting: false }));
      setDeletingTransactionId(null);
      setConfirmationModal({
        isOpen: false,
        transactionId: null,
        transactionDescription: "",
      });
    }
  };

  const handleCloseModal = () => {
    onClose();
    setIsFormModalOpen(false);
    setEditingTransaction(null);
    setFormErrors([]);
    setSubmitError(null);
  };

  if (!isOpen) return null;

  const totals = optimisticTransactions.reduce(
    (acc, transaction) => {
      if (transaction.type === "INCOME") {
        acc.totalIncome += Number(transaction.amount);
      } else {
        acc.totalExpenses += Number(transaction.amount);
      }
      return acc;
    },
    { totalIncome: 0, totalExpenses: 0 }
  );

  const formattedDate = selectedDate 
    ? format(selectedDate, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })
    : "";

  const capitalizedDate = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);

  const modalHeightClass = isStandalone
    ? "h-[100dvh] pt-safe"
    : "h-[95vh] sm:h-[85vh]";

  return createPortal(
    <>
      <AnimatePresence mode="wait">
        {isOpen && (
          <motion.div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Overlay com blur melhorado */}
            <motion.div
              className="absolute inset-0 bg-black/70 backdrop-blur-md"
              onClick={handleCloseModal}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />

            {/* Modal Container - Design responsivo aprimorado */}
            <motion.div
              initial={{ opacity: 0, y: "100%" }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: "100%" }}
              transition={{ 
                duration: 0.4, 
                type: "spring", 
                damping: 30,
                stiffness: 300
              }}
              className={`
                relative
                w-full
                ${modalHeightClass}
                sm:max-w-4xl lg:max-w-6xl
                sm:rounded-3xl
                rounded-t-3xl
                bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800
                border-t sm:border border-white/10
                shadow-2xl
                flex flex-col
                overflow-hidden
              `}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header com gradiente e efeito vidro */}
              <div className="sticky top-0 z-20 px-4 sm:px-6 py-3 sm:py-4 border-b border-white/10 bg-slate-900/95 backdrop-blur-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {/* Botão voltar mobile */}
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={handleCloseModal}
                      className="sm:hidden w-8 h-8 rounded-full bg-white/10 flex items-center justify-center"
                    >
                      <FaChevronLeft className="text-white/60 text-sm" />
                    </motion.button>

                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-indigo-500/20 flex items-center justify-center border border-purple-500/30">
                        <FaCalendarAlt className="text-purple-400 text-base" />
                      </div>
                      <div>
                        <h2 className="text-lg sm:text-xl font-semibold text-white">
                          Transações
                        </h2>
                        {selectedDate && (
                          <p className="text-xs sm:text-sm text-slate-400">
                            {capitalizedDate}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Botão Nova Transação - Mobile adaptado */}
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        setEditingTransaction(null);
                        setIsFormModalOpen(true);
                      }}
                      className="
                        flex items-center gap-2
                        px-3 sm:px-4 py-2
                        rounded-xl
                        bg-gradient-to-r from-purple-600 to-indigo-600
                        text-white text-sm font-medium
                        shadow-lg shadow-purple-600/30
                        active:shadow-purple-600/50
                        transition-all
                      "
                    >
                      <FaPlus size={12} />
                      <span className="hidden sm:inline">Nova Transação</span>
                      <span className="sm:hidden">Novo</span>
                    </motion.button>

                    {/* Botão Fechar Desktop */}
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handleCloseModal}
                      className="
                        hidden sm:flex
                        w-9 h-9
                        rounded-full
                        bg-white/10
                        border border-white/10
                        items-center justify-center
                        hover:bg-red-500/20
                        hover:text-red-400
                        transition-all
                      "
                    >
                      <FaTimes size={14} />
                    </motion.button>
                  </div>
                </div>
              </div>

              {/* Error Alert */}
              <AnimatePresence>
                {submitError && !isFormModalOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="px-4 sm:px-6 pt-4"
                  >
                    <Alert
                      variant="error"
                      message={submitError}
                      onClose={() => setSubmitError(null)}
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Content Area - Scroll suave */}
              <div className="flex-1 overflow-y-auto overscroll-contain">
                <div className="p-4 sm:p-6 space-y-6">
                  <AnimatePresence mode="wait">
                    {isFormModalOpen ? (
                      /* Formulário com animação de entrada */
                      <motion.div
                        key="form"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.3 }}
                      >
                        <TransactionFormModal
                          isOpen={true}
                          onClose={() => {
                            setIsFormModalOpen(false);
                            setEditingTransaction(null);
                            setFormErrors([]);
                          }}
                          editingTransaction={editingTransaction}
                          categories={categories}
                          accounts={accounts}
                          onSubmit={handleTransactionSubmit}
                          selectedDate={selectedDate}
                          actionLoading={actionLoading}
                          errors={formErrors}
                        />
                      </motion.div>
                    ) : (
                      /* Lista de Transações */
                      <motion.div
                        key="list"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="space-y-6"
                      >
                        {/* Summary Cards - Mobile otimizado */}
                        <SummaryCards
                          user={user}
                          totalIncome={totals.totalIncome}
                          totalExpenses={totals.totalExpenses}
                        />

                        {/* Lista com header */}
                        <div>
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-medium text-slate-400">
                              {optimisticTransactions.length} {optimisticTransactions.length === 1 ? 'transação' : 'transações'}
                            </h3>
                          </div>

                          {isLoading ? (
                            <LoadingSkeleton count={5} />
                          ) : optimisticTransactions.length === 0 ? (
                            <EmptyState
                              title="Nenhuma transação"
                              description="Adicione sua primeira transação para este dia"
                              buttonText="Nova Transação"
                              onAddClick={() => {
                                setEditingTransaction(null);
                                setIsFormModalOpen(true);
                              }}
                            />
                          ) : (
                            <TransactionsList
                              transactions={optimisticTransactions}
                              onEdit={(t) => {
                                setEditingTransaction(t);
                                setIsFormModalOpen(true);
                              }}
                              onDelete={handleDeleteClick}
                              user={user}
                              deletingTransactionId={deletingTransactionId}
                            />
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Footer Loading - Mobile otimizado */}
              <AnimatePresence>
                {actionLoading.deleting && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    className="absolute bottom-0 left-0 right-0 p-4 bg-slate-900/95 backdrop-blur-xl border-t border-white/10"
                  >
                    <div className="flex items-center justify-center gap-3 text-sm text-slate-400">
                      <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                      <span>Excluindo transação...</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de Confirmação */}
      <ConfirmationModal
        isOpen={confirmationModal.isOpen}
        onClose={() =>
          setConfirmationModal((p) => ({ ...p, isOpen: false }))
        }
        onConfirm={handleConfirmDelete}
        title="Excluir Transação"
        message={`Tem certeza que deseja excluir a transação "${confirmationModal.transactionDescription}"? Esta ação não poderá ser desfeita.`}
        confirmText="Excluir"
        cancelText="Cancelar"
        variant="danger"
        isLoading={actionLoading.deleting}
      />
    </>,
    document.body
  );
}
