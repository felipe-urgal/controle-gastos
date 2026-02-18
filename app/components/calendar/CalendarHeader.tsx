"use client";

import { motion } from "framer-motion";
import { HiChevronLeft, HiChevronRight } from "react-icons/hi";
import { Account } from "@/app/types/calendar";
import { useThemeColors } from "@/app/hook";
import { monthNames, formatCurrency } from "@/app/utils";
import { Select, Button } from "@/app/components";
import { useAuth } from "@/app/context";

interface CalendarHeaderProps {
  currentDate: Date;
  selectedAccount: string | "all";
  accounts: Account[];
  onGoToPreviousMonth: () => void;
  onGoToNextMonth: () => void;
  onGoToToday: () => void;
  onAccountChange: (accountId: string | number) => void;
  isLoading: boolean;
}

export default function CalendarHeader({
  currentDate,
  selectedAccount,
  accounts,
  onGoToPreviousMonth,
  onGoToNextMonth,
  onGoToToday,
  onAccountChange,
  isLoading,
}: CalendarHeaderProps) {
  const colors = useThemeColors();
  const { user } = useAuth();

  const accountOptions = accounts.map((account) => {
    const balance =
      typeof account.balance === "number"
        ? account.balance
        : Number(account.balance) || 0;

    return {
      id: account.id,
      value: account.id,
      label: `${account.name} • ${
        user?.showValues ? formatCurrency(balance) : "•••••"
      }`,
    };
  });

  return (
    <div className="px-4 sm:px-8 py-4 sm:py-8 relative z-50">
      <div className="flex flex-col gap-4 sm:gap-5">

        {/* Linha 1 — Mês + Navegação */}
        <div className="
          order-2 sm:order-1
          flex items-center justify-between
          gap-3
        ">

          <div className="
            flex items-center justify-between w-full
            bg-white/10 dark:bg-slate-800/40
            px-2 sm:px-4 py-1 sm:py-3
            rounded-2xl
            border border-white/10
            shadow-inner
          ">

            <button
              onClick={onGoToPreviousMonth}
              className="p-2 rounded-lg hover:bg-white/10 transition"
            >
              <HiChevronLeft className="w-5 h-5" />
            </button>

            <motion.h2
              key={currentDate.toISOString()}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className="
                text-lg sm:text-2xl
                font-semibold
                tracking-tight
                text-center
                flex-1
              "
            >
              {monthNames[currentDate.getMonth()]}{" "}
              {currentDate.getFullYear()}
            </motion.h2>

            <button
              onClick={onGoToNextMonth}
              className="p-2 rounded-lg hover:bg-white/10 transition"
            >
              <HiChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Linha 2 — Hoje + Select */}
        <div className="
          order-1 sm:order-2
          flex flex-col sm:flex-row
          gap-3
          sm:items-center sm:justify-between
        ">

          <button
            onClick={onGoToToday}
            className="
              w-full sm:w-auto
              px-5 py-2 sm:py-2.5
              rounded-xl
              bg-gradient-to-r from-purple-600 to-indigo-600
              text-white
              text-sm sm:text-base font-medium
              shadow-lg
              active:scale-95
              hover:scale-[1.03]
              transition-all
            "
          >
            Hoje
          </button>

          <div className="w-full sm:w-80 relative z-50">
            <Select
              options={accountOptions}
              value={selectedAccount}
              onChange={onAccountChange}
              placeholder="Todas as contas"
              searchable
              searchPlaceholder="Buscar conta..."
              variant="outlined"
              size="sm"
              disabled={isLoading}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
