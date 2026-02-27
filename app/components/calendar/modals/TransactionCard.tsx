"use client";

// importing icons
import { FaArrowUp, FaArrowDown, FaTag, FaWallet } from "react-icons/fa";

// importing libs
import { formatCurrency } from "@/app/lib/currency/formatCurrency";

interface TransactionCardProps {
  transaction: any;
};

export default function TransactionCard({ transaction }: TransactionCardProps) {
  const isIncome = transaction.type === "INCOME";
  
  const handleEdit = () => {
    window.open(
      `/transacoes/show/${transaction.id}`,
      "_blank",
      "noopener,noreferrer"
    );
  };

  return (
    <div 
      className={`relative p-3 sm:p-4 rounded-xl sm:rounded-2xl backdrop-blur-xl border transition-all active:bg-white/5 cursor-pointer hover:scale-[1.01] ${isIncome ? 'bg-gradient-to-r from-green-500/5 to-emerald-500/5 border-green-500/20' : 'bg-gradient-to-r from-red-500/5 to-rose-500/5 border-red-500/20' }`}
      onClick={handleEdit}
      title="visualizar dados"
    >
      <div className="relative">
        <div className="flex items-start justify-between gap-2 sm:gap-4">
          <div className="flex items-start gap-2 sm:gap-3 min-w-0 flex-1">
            <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0 ${isIncome ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
              {isIncome ? <FaArrowUp size={12} /> : <FaArrowDown size={12} />}
            </div>

            <div className="min-w-0 flex-1">
              <h3 className="font-medium sm:font-semibold text-white text-sm sm:text-base truncate pr-2">
                {transaction.description}
              </h3>
              
              <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                {transaction.category && (
                  <span className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full bg-slate-800 text-slate-300 flex items-center gap-1 border border-slate-700">
                    <FaTag size={6} className="sm:hidden" />
                    <FaTag size={8} className="hidden sm:block" />
                    <span className="truncate max-w-[80px] sm:max-w-none">
                      {transaction.category.name}
                    </span>
                  </span>
                )}
                
                {transaction.account && (
                  <span className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full bg-slate-800 text-slate-300 flex items-center gap-1 border border-slate-700">
                    <FaWallet size={6} className="sm:hidden" />
                    <FaWallet size={8} className="hidden sm:block" />
                    <span className="truncate max-w-[80px] sm:max-w-none">
                      {transaction.account.name}
                    </span>
                  </span>
                )}

                {transaction.status && transaction.status !== 'COMPLETED' && (
                  <span className={`
                    text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full
                    ${transaction.status === 'PENDING' ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/30' : ''}
                    ${transaction.status === 'CANCELLED' ? 'bg-red-500/10 text-red-400 border border-red-500/30' : ''}
                  `}>
                    {transaction.status === 'PENDING' && 'Pendente'}
                    {transaction.status === 'CANCELLED' && 'Cancelado'}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-2">
            <span
              className={`text-sm sm:text-lg font-bold whitespace-nowrap ${isIncome ? 'text-green-400' : 'text-red-400'}`}>
              {isIncome ? '+' : '-'}
              {formatCurrency(transaction.amount)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
