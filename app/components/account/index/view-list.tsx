"use client";

// importing types
import { AccountModel } from "@/app/types/account";

// importing components
import IconRenderer from "@/app/components/ui/IconRenderer";

// importing libs
import { formatCurrency, highlightText } from "@/app/lib/format"

interface Props {
  account: AccountModel;
  searchTerm?: string;
}

export default function ViewList({
  account,
  searchTerm = "",
}: Props) {
  return (
    <div className="flex items-center gap-3 flex-1 min-w-0">
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center text-white shrink-0 relative"
        style={{ 
          backgroundColor: account.color || '#6B7280',
          opacity: account.isActive ? 1 : 0.5,
          boxShadow: account.isActive ? `0 4px 12px ${account.color}40` : 'none'
        }}
      >
        <IconRenderer iconName={account.icon || "wallet"} size={16} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium text-white truncate">
            {highlightText(account.name, searchTerm)}
          </p>
          
          <span className={`
            text-xs px-2 py-0.5 rounded-full shrink-0
            ${account.type === 'INVESTMENT' 
              ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
              : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
            }
          `}>
            {account.type === 'INVESTMENT' ? 'Invest' : 'Conta'}
          </span>

          {!account.isActive && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-700 text-slate-400 shrink-0">
              Inativa
            </span>
          )}
        </div>
        
        {account.createdAt && (
          <p className="text-xs text-slate-500 truncate max-w-[200px] mt-1">
            Criada em {new Date(account.createdAt).toLocaleDateString('pt-BR')}
          </p>
        )}
      </div>

      <div className="text-right">
        <p className={`font-semibold ${!account.isActive && 'text-slate-500'}`}>
          {formatCurrency(account.balance, account.currency)}
        </p>
        <p className="text-xs text-slate-500">
          {account.currency}
        </p>
      </div>
    </div>
  );
};
