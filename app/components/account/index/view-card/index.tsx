"use client";

// importing components
import { IconRenderer } from "@/app/components/ui";

// importing icons
import { FaRegCreditCard, FaChartLine } from "react-icons/fa";

// importing libs
import { formatCurrency } from "@/app/lib/currency/formatCurrency";
import { highlightText } from "@/app/lib/string/highlightText";

// importing constants
import { typeConfig } from "@/app/lib/constants/account.constants";

// importing interface
import { ViewProps } from "@/app/lib/interface/accounts.interface";

export default function ViewCard({ account, searchTerm = "" }: ViewProps) {
  return (
    <>
      <div className="relative flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center text-white shadow-lg relative"
            style={{ 
              backgroundColor: account.color || '#6B7280',
              opacity: account.isActive ? 1 : 0.5,
              boxShadow: account.isActive ? `0 8px 16px ${account.color}30` : 'none'
            }}
          >
            <IconRenderer iconName={account.icon || "wallet"} size={16} />
          </div>

          <div>
            <h3 className="font-semibold text-white flex items-center">
              {highlightText(account.name, searchTerm)}
            </h3>
            
            <p className="text-xs text-slate-400">
              {typeConfig[account.type].label}
            </p>
          </div>
        </div>

        {!account.isActive ? (
          <span className="text-xs px-2 py-1 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
            Inativa
          </span>
        ) : (
          <span className='text-xs px-2 py-1 rounded-full border bg-blue-500/10 text-blue-400 border-blue-500/30'>
            Ativa
          </span>
        )}
      </div>

      <div className="relative mt-4">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
          <span>Saldo Disponível</span>
          <span className="font-mono">{account.currency}</span>
        </div>
        
        <div className="flex items-baseline justify-between">
          <h2 
            className="text-2xl font-bold transition-colors"
            style={{
              color: account.isActive && account.color ? account.color : '#6B7280'
            }}
          >
            {formatCurrency(account.balance, account.currency)}
          </h2>
          
          <div className="text-2xl text-slate-700">
            {account.type === 'INVESTMENT' ? <FaChartLine /> : <FaRegCreditCard />}
          </div>
        </div>

        <p className="text-xs text-slate-500 mt-2 text-end">
          Criada em {new Date(account.createdAt).toLocaleDateString('pt-BR')}
        </p>
      </div>
    </>
  );
};
