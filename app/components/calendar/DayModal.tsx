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
  LoadingAction,
  ConfirmationModal,
} from "@/app/components";
import { FaPlus, FaTimes } from "react-icons/fa";
import { transactionService } from "@/app/services";

import { Category, Account, Transaction } from "@/app/types/calendar";

export default function DayModal({
  isOpen,
  onClose,
  selectedDate,
  transactions,
  isLoading,
  refreshAccounts,
}) {
  const { user } = useAuth();

  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] =
  useState<Transaction | null>(null);

  const [optimisticTransactions, setOptimisticTransactions] =
    useState<Transaction[]>([]);

  const [deletingTransactionId, setDeletingTransactionId] =
    useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState({
    creating: false,
    updating: false,
    deleting: false,
  });

  const [confirmationModal, setConfirmationModal] = useState({
    isOpen: false,
    transactionId: null,
    transactionDescription: "",
  });

  const fetchCategoriesAndAccounts = useCallback(async () => {
    if (!user?.id) return;

    const [categoriesResponse, accountsResponse] = await Promise.all([
      fetch(`/api/category/all?userId=${user.id}`),
      fetch(`/api/account/all?userId=${user.id}`)
    ]);

    if (categoriesResponse.ok) {
      const data = await categoriesResponse.json();
      if (data.success) setCategories(data.categorias);
    }

    if (accountsResponse.ok) {
      const data = await accountsResponse.json();
      if (data.success) setAccounts(data.data.items);
    }
  }, [user?.id]);

  useEffect(() => {
    if (isFormModalOpen) {
      fetchCategoriesAndAccounts();
    }
  }, [isFormModalOpen, fetchCategoriesAndAccounts]);

  useEffect(() => {
    if (!isOpen) return;
    setOptimisticTransactions(transactions || []);
  }, [transactions, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [isOpen]);

  function generateId() {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
      return crypto.randomUUID();
    }

    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  const handleTransactionSubmit = async (data: any) => {
    if (!user || !selectedDate) return;

    const transactionData = {
      ...data,
      userId: user.id,
      year: selectedDate.getFullYear(),
      month: selectedDate.getMonth() + 1,
      day: selectedDate.getDate(),
    };

    try {
      setFormErrors([]);

      setActionLoading(prev => ({
        ...prev,
        [editingTransaction ? "updating" : "creating"]: true,
      }));

      let result;

      if (editingTransaction) {
        result = await transactionService.updateTransaction({
          id: editingTransaction.id,
          ...transactionData,
        });
      } else {
        result = await transactionService.createTransaction(transactionData);
      }

      if (!result.success) {
        // 🔥 Aqui é o ponto importante
        const errorsArray = result.message?.split(";") || [];
        setFormErrors(errorsArray);
        return;
      }

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

      setIsFormModalOpen(false);
      setEditingTransaction(null);
      setFormErrors([]);

      window.dispatchEvent(new Event("transactionsUpdated"));

    } catch (error) {
      console.error("Erro ao salvar transação:", error);
    } finally {
      setActionLoading(prev => ({
        ...prev,
        creating: false,
        updating: false,
      }));
    }
  };

  const handleDeleteClick = (id, description) => {
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

    try {
      await transactionService.deleteTransaction(transactionId);
      refreshAccounts?.();

      setOptimisticTransactions(prev =>
        prev.filter(t => t.id !== transactionId)
      );

      window.dispatchEvent(new Event("transactionsUpdated"));
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

  return createPortal(
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Overlay */}
            <motion.div
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
              onClick={onClose}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />

            {/* Container */}
            <motion.div
              initial={{ opacity: 0, y: 40, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 40, scale: 0.98 }}
              transition={{ duration: 0.25 }}
              className="
                relative
                w-full
                h-[95vh] sm:h-[85vh]
                sm:max-w-6xl
                rounded-t-3xl sm:rounded-3xl
                bg-white/20 dark:bg-slate-900/50
                ring-1 ring-white/10
                backdrop-blur-2xl
                border border-white/10 dark:border-slate-700
                shadow-[0_40px_120px_-20px_rgba(0,0,0,0.6)]
                flex flex-col
                overflow-hidden
              "
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="sticky top-0 z-10 px-6 py-5 border-b border-white/10 dark:border-slate-700 bg-white/5 backdrop-blur-xl flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-semibold tracking-tight">
                    Transações
                  </h2>
                  {selectedDate && (
                    <p className="text-sm text-slate-400 mt-1">
                      {selectedDate.toLocaleDateString("pt-BR")}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  {/* Criar */}
                  <button
                    onClick={() => setIsFormModalOpen(true)}
                    className="
                      flex items-center gap-2
                      px-4 py-2
                      rounded-xl
                      bg-gradient-to-r from-purple-600 to-indigo-600
                      text-white text-sm font-medium
                      shadow-lg shadow-purple-600/30
                      hover:scale-[1.03]
                      transition-all duration-200
                    "
                  >
                    <FaPlus size={12} />
                    Nova
                  </button>

                  {/* Fechar */}
                  <button
                    onClick={() => {
                      onClose();
                      setIsFormModalOpen(false);
                      setEditingTransaction(null);
                      setFormErrors([]);
                    }}
                    className="
                      w-9 h-9
                      rounded-full
                      bg-white/10 dark:bg-slate-700/40
                      backdrop-blur-md
                      border border-white/10
                      flex items-center justify-center
                      hover:bg-red-500/20
                      hover:text-red-400
                      transition-all duration-200
                    "
                  >
                    <FaTimes size={13} />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto py-4 sm:py-6 px-4 sm:px-6">
                <AnimatePresence mode="wait">
                  {isFormModalOpen ? (
                    <motion.div
                      key="form"
                      initial={{ opacity: 0, y: 20, filter: "blur(6px)" }}
                      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                      exit={{ opacity: 0, y: -20, filter: "blur(4px)" }}
                      transition={{
                        duration: 0.35,
                        ease: [0.16, 1, 0.3, 1] // cubic-bezier moderna
                      }}
                    >
                      <TransactionFormModal
                        isOpen={true}
                        onClose={() => {
                          setIsFormModalOpen(false);
                          setEditingTransaction(null);
                          setFormErrors([]);
                        }}
                        editingTransaction={editingTransaction}
                        isSubmitting={actionLoading.creating || actionLoading.updating}
                        categories={categories}
                        accounts={accounts}
                        onSubmit={handleTransactionSubmit}
                        selectedDate={selectedDate}
                        actionLoading={actionLoading}
                        errors={formErrors}   // 🔥 AQUI
                      />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="list"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      <SummaryCards
                        user={user}
                        totalIncome={totals.totalIncome}
                        totalExpenses={totals.totalExpenses}
                      />

                      <div className="mt-6">
                        {isLoading ? (
                          <LoadingSkeleton />
                        ) : optimisticTransactions.length === 0 ? (
                          <EmptyState />
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

              {/* Footer loading */}
              {actionLoading.deleting && (
                <div className="px-6 py-3 border-t border-white/10 dark:border-slate-700 bg-white/5 backdrop-blur-md">
                  <LoadingAction message="Excluindo..." />
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmationModal
        isOpen={confirmationModal.isOpen}
        onClose={() =>
          setConfirmationModal((p) => ({ ...p, isOpen: false }))
        }
        onConfirm={handleConfirmDelete}
        title="Excluir Transação"
        message={`Tem certeza que deseja excluir "${confirmationModal.transactionDescription}"?`}
        confirmText="Excluir"
        cancelText="Cancelar"
        variant="danger"
        isLoading={actionLoading.deleting}
      />
    </>,
    document.body
  );
}
