"use client";

// importing hooks
import { useEffect } from "react";

// importing libs
import { createPortal } from "react-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

// importing hooks
import { useStandalone } from "@/app/hook/useStandalone";
import { useDayTransactions } from "@/app/hooks/calendar/useDayTransactions";

// importing icons
import { FaCalendarAlt, FaTimes } from "react-icons/fa";

// importing components
import { SummaryCards, TransactionsList } from "@/app/components/calendar/modals";
import { PageEmpty, PageLoading } from "@/app/components/feedback";

export default function DayModal({ isOpen, onClose, selectedDate, transactions, isLoading }) {
  const { transactions: list, totals, isEmpty } = useDayTransactions({ initialTransactions: transactions, isOpen });

  const { isStandalone } = useStandalone();

  const modalHeightClass = isStandalone ? "h-[100dvh] pt-safe" : "h-[95vh] sm:h-[85vh]";

  useEffect(() => {
    if (!isOpen) return;

    const scrollY = window.scrollY;

    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";

    return () => {
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.width = "";
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

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-md"
        onClick={onClose}
      />

      <div
        className={`relative w-full ${modalHeightClass} sm:max-w-4xl lg:max-w-6xl sm:rounded-3xl rounded-t-3xl gap-4 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 border-t sm:border border-white/10 shadow-2xl flex flex-col overflow-hidden`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-20 p-4 border-b border-white/10 bg-slate-900/95 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
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
              <button
                onClick={onClose}
                className="flex w-9 h-9 rounded-full bg-white/10 border border-white/10 items-center justify-center hover:bg-red-500/20 hover:text-red-400 transition-all"
              >
                <FaTimes size={14} />
              </button>
            </div>
          </div>
        </div>

        <SummaryCards
          totalIncome={totals.totalIncome}
          totalExpenses={totals.totalExpenses}
        />

        <div className="flex-1 overflow-y-auto px-4 pb-4">
          {isLoading ? (
            <PageLoading type="list" />
          ) : isEmpty ? (
            <PageEmpty title="Nenhuma transação encontrada"/>
          ) : (
            <TransactionsList transactions={list} />
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};
