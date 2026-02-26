// SummaryCards.tsx - Mobile otimizado
"use client";

import { formatCurrency } from "@/app/utils";
import { FaArrowUp, FaArrowDown, FaWallet } from "react-icons/fa";

interface SummaryCardsProps {
  totalIncome?: number;
  totalExpenses?: number;
  showBalance?: boolean;
}

export default function SummaryCards({
  totalIncome = 0,
  totalExpenses = 0,
  showBalance = true,
}: SummaryCardsProps) {
  const balance = totalIncome - totalExpenses;

  return (
    <div className="grid grid-cols-3 gap-1 sm:gap-4 px-4">
      {showBalance && (
        <div className="relative overflow-hidden rounded-lg sm:rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border border-white/10 p-2 sm:p-5">
          <div className="absolute top-0 right-0 w-16 h-16 sm:w-24 sm:h-24 bg-purple-500/10 rounded-full blur-2xl" />
          
          <div className="relative">
            <div className="flex items-center justify-center sm:justify-start gap-1 sm:gap-2 mb-0.5 sm:mb-2">
              <div className="w-5 h-5 sm:w-8 sm:h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <FaWallet className="text-purple-400 text-[10px] sm:text-sm" />
              </div>
              <span className="text-[10px] sm:text-sm text-slate-400 truncate">Saldo</span>
            </div>
            
            <p className={`text-xs sm:text-2xl font-bold text-center sm:text-left ${
              balance >= 0 ? "text-green-400" : "text-red-400"
            }`}>
              {formatCurrency(balance)}
            </p>
          </div>
        </div>
      )}

      <div className="relative overflow-hidden rounded-lg sm:rounded-2xl bg-gradient-to-br from-green-900/20 to-green-800/10 border border-green-500/20 p-2 sm:p-5">
        <div className="absolute top-0 right-0 w-16 h-16 sm:w-24 sm:h-24 bg-green-500/10 rounded-full blur-2xl" />
        
        <div className="relative">
          <div className="flex items-center justify-center sm:justify-start gap-1 sm:gap-2 mb-0.5 sm:mb-2">
            <div className="w-5 h-5 sm:w-8 sm:h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
              <FaArrowUp className="text-green-400 text-[10px] sm:text-sm" />
            </div>
            <span className="text-[10px] sm:text-sm text-slate-400 truncate">Receitas</span>
          </div>
          
          <p className="text-xs sm:text-2xl font-bold text-green-400 text-center sm:text-left">
            {formatCurrency(totalIncome)}
          </p>
        </div>
      </div>

      <div className="relative overflow-hidden rounded-lg sm:rounded-2xl bg-gradient-to-br from-red-900/20 to-red-800/10 border border-red-500/20 p-2 sm:p-5">
        <div className="absolute top-0 right-0 w-16 h-16 sm:w-24 sm:h-24 bg-red-500/10 rounded-full blur-2xl" />
        
        <div className="relative">
          <div className="flex items-center justify-center sm:justify-start gap-1 sm:gap-2 mb-0.5 sm:mb-2">
            <div className="w-5 h-5 sm:w-8 sm:h-8 rounded-lg bg-red-500/20 flex items-center justify-center">
              <FaArrowDown className="text-red-400 text-[10px] sm:text-sm" />
            </div>
            <span className="text-[10px] sm:text-sm text-slate-400 truncate">Despesas</span>
          </div>
          
          <p className="text-xs sm:text-2xl font-bold text-red-400 text-center sm:text-left">
            {formatCurrency(totalExpenses)}
          </p>
        </div>
      </div>
    </div>
  );
}
