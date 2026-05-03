"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

import { useStandalone } from "@/app/hooks/use-standalone";
import { useDayTransactions } from "@/app/hooks/calendar/use-day-transactions";

import {
  SummaryCards,
  TransactionsList,
} from "@/app/components/pages/calendar/modals";

import { PageEmpty, PageLoading } from "@/app/components/feedback";
import { TransactionForm } from "@/app/components/pages/transactions";
import { ConfirmationModal } from "@/app/components/overlays";

import { transactionService } from "@/app/services/transaction-service";

import { FaTimes, FaPlus, FaArrowLeft } from "react-icons/fa";

// ✅ IMPORTANTE: usa seu tipo real
import { Transaction } from "@/app/types/calendar";

interface DayModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate?: Date;
  transactions: Transaction[];
  isLoading: boolean;
  onRefreshCalendar?: () => Promise<void> | void;
}

type Mode = "list" | "create" | "edit";

export default function DayModal({
  isOpen,
  onClose,
  selectedDate,
  transactions,
  isLoading,
  onRefreshCalendar,
}: DayModalProps) {
  const [mode, setMode] = useState<Mode>("list");

  const [selectedTransaction, setSelectedTransaction] =
    useState<Transaction | null>(null);

  const [transactionToDelete, setTransactionToDelete] =
    useState<Transaction | null>(null);

  const [isDeleting, setIsDeleting] = useState(false);

  const {
    transactions: list,
    totals,
    isEmpty,
  } = useDayTransactions({
    initialTransactions: transactions,
    isOpen,
  });

  const { isStandalone } = useStandalone();

  const modalHeightClass = isStandalone
    ? "h-[100dvh] pt-safe"
    : "h-[95vh] sm:h-[85vh]";

  // reset state
  useEffect(() => {
    if (!isOpen) {
      setMode("list");
      setSelectedTransaction(null);
      setTransactionToDelete(null);
    }
  }, [isOpen]);

  // scroll lock
  useEffect(() => {
    if (!isOpen) return;

    const scrollY = window.scrollY;

    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;

    return () => {
      document.body.style.position = "";
      document.body.style.top = "";
      window.scrollTo(0, scrollY);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const formattedDate = selectedDate
    ? format(selectedDate, "EEEE, dd 'de' MMMM 'de' yyyy", {
        locale: ptBR,
      })
    : "";

  const capitalizedDate =
    formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);

  // actions
  const handleEdit = (t: Transaction) => {
    setSelectedTransaction(t);
    setMode("edit");
  };

  const handleDelete = (t: Transaction) => {
    setTransactionToDelete(t);
  };

  const handleConfirmDelete = async () => {
    if (!transactionToDelete?.id) return;

    setIsDeleting(true);

    try {
      await transactionService.delete(transactionToDelete.id);
      await onRefreshCalendar?.();
      setTransactionToDelete(null);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSuccess = async () => {
    await onRefreshCalendar?.();
    setMode("list");
    setSelectedTransaction(null);
  };

  return createPortal(
    <>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
        <div className="absolute inset-0 bg-black/70" onClick={onClose} />

        <div
          className={`
            relative w-full ${modalHeightClass}
            sm:max-w-4xl lg:max-w-6xl
            sm:rounded-3xl rounded-t-3xl
            gap-4
            bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800
            border-t sm:border border-white/10
            flex flex-col overflow-hidden
          `}
          onClick={(e) => e.stopPropagation()}
        >
          {/* HEADER */}
          <div className="p-4 border-b border-white/10 flex justify-between">
            <div>
              <h2 className="text-white font-semibold">
                {mode === "list"
                  ? "Transações"
                  : mode === "edit"
                  ? "Editar"
                  : "Nova"}
              </h2>

              <p className="text-xs text-slate-400">
                {capitalizedDate}
              </p>
            </div>

            {/* 🔥 BOTÕES MELHORADOS */}
            <div className="flex items-center gap-2">
              {(mode === "create" || mode === "edit") && (
                <button
                  onClick={() => setMode("list")}
                  className="w-9 h-9 flex items-center justify-center rounded-full bg-white/10 border border-white/10 hover:bg-white/20 transition-all active:scale-95"
                >
                  <FaArrowLeft size={12} />
                </button>
              )}

              {mode === "list" && (
                <button
                  onClick={() => setMode("create")}
                  className="w-9 h-9 flex items-center justify-center rounded-full bg-gradient-to-br from-purple-500/20 to-indigo-500/20 border border-purple-500/30 text-purple-300 hover:bg-purple-500/30 transition-all active:scale-95"
                >
                  <FaPlus size={12} />
                </button>
              )}

              <button
                onClick={onClose}
                className="w-9 h-9 flex items-center justify-center rounded-full bg-white/10 border border-white/10 hover:bg-red-500/20 hover:text-red-400 transition-all active:scale-95"
              >
                <FaTimes size={12} />
              </button>
            </div>
          </div>

          {/* LIST */}
          {mode === "list" ? (
            <>
              <SummaryCards
                totalIncome={totals.totalIncome}
                totalExpenses={totals.totalExpenses}
              />

              <div className="flex-1 overflow-y-auto px-4 pb-4">
                {isLoading ? (
                  <PageLoading type="list" />
                ) : isEmpty ? (
                  <PageEmpty title="Nenhuma transação encontrada" />
                ) : (
                  <TransactionsList
                    transactions={list}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    isBusy={isDeleting}
                  />
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 overflow-y-auto px-4 pb-4">
              <TransactionForm
                isEditing={mode === "edit"}
                transaction={selectedTransaction ?? undefined}
                initialDate={selectedDate}
                onCancelOverride={() => setMode("list")}
                onSuccess={handleSuccess}
              />
            </div>
          )}
        </div>
      </div>

      {/* CONFIRM DELETE */}
      <ConfirmationModal
        isOpen={!!transactionToDelete}
        onClose={() => setTransactionToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Remover transação"
        message="Tem certeza?"
        isLoading={isDeleting}
      />
    </>,
    document.body
  );
}
