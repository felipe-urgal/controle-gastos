'use client';

// importing icons
import { FaEye, FaCalendarAlt, FaArrowUp, FaArrowDown, FaTag } from "react-icons/fa";

// importing libs
import { format } from "date-fns";
import { formatCurrency } from "@/app/lib/currency/format-currency";

// importing components
import { IconRenderer } from "@/app/components/ui";
import Link from "next/link";

// importing interface
import { AccountInfoProps } from "@/app/lib/interface/accounts.interface";

export default function AccountInfo({ account, isDeleting, typeLabels }: AccountInfoProps) {
  return (
    <div 
      className={`transition-opacity duration-300 
        ${isDeleting ? 'opacity-50 pointer-events-none' : ''}
      `}
    >
      <div className="relative rounded-xl overflow-hidden mb-4">
        <div
          className="absolute inset-0 opacity-30"
          style={{
            background: `linear-gradient(135deg, ${account.color}40, transparent 70%)`
          }}
        />
        
        <div className="relative backdrop-blur-xl bg-white/5 border border-white/5 p-4">

          <div className="flex items-center gap-2 mb-4">
            <div
              className="w-16 h-16 rounded-xl flex items-center justify-center text-white shadow-xl"
              style={{ 
                backgroundColor: account.color || undefined,
                boxShadow: `0 10px 20px ${account.color}40`
              }}
            >
              <IconRenderer iconName={account.icon || "wallet"} size={30} />
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
                  color: account.isActive ? account.color || undefined : "#6B7280",
                }}
              >
                {formatCurrency(account.balance, account.currency)}
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
      </div>
    </div>
  );
};
