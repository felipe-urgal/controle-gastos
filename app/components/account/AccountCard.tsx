"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/app/context";
import { AccountModel } from "@/app/types/account";
import { motion } from "framer-motion";
import { IconRenderer } from "@/app/components";
import { 
  FaRegCreditCard, 
  FaChartLine, 
  FaInfoCircle 
} from "react-icons/fa";
import { useState } from "react";

interface Props {
  account: AccountModel;
  viewMode: "grid" | "list";
  searchTerm?: string;
}

// Mapeamento de tipos para ícones e labels
const typeConfig = {
  CREDIT_DEBIT: {
    label: "Conta Corrente",
    icon: <FaRegCreditCard className="text-lg" />,
    bgColor: "from-blue-500/20 to-purple-500/20",
    borderColor: "border-blue-500/30",
  },
  INVESTMENT: {
    label: "Investimento",
    icon: <FaChartLine className="text-lg" />,
    bgColor: "from-green-500/20 to-emerald-500/20",
    borderColor: "border-green-500/30",
  },
};

export default function AccountCard({
  account,
  viewMode,
  searchTerm = "",
}: Props) {
  const router = useRouter();
  const { user } = useAuth();
  const [showTooltip, setShowTooltip] = useState(false);

  const balanceFormatted = user?.showValues
    ? new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: account.currency,
      }).format(account.balance / 100)
    : "••••••";

  const handleClick = () => {
    router.push(`/contas/show/${account.id}`);
  };

  const highlightText = (text: string) => {
    if (!searchTerm || !text) return text;
    
    const parts = text.split(new RegExp(`(${searchTerm})`, 'gi'));
    return parts.map((part, i) => 
      part.toLowerCase() === searchTerm.toLowerCase() ? (
        <mark key={i} className="bg-purple-500/30 text-white rounded px-0.5">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  // Versão em Lista
  if (viewMode === "list") {
    return (
      <motion.div
        layout
        whileHover={{ x: 4 }}
        whileTap={{ scale: 0.99 }}
        onClick={handleClick}
        className={`
          cursor-pointer relative
          p-4 rounded-xl
          backdrop-blur-sm border
          transition-all
          ${account.isActive 
            ? 'bg-white/5 hover:bg-white/[0.07] border-white/10 hover:border-purple-500/40' 
            : 'bg-slate-900/30 border-slate-800/50 hover:border-slate-700'
          }
        `}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            {/* Ícone com cor personalizada */}
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center text-white shrink-0 relative"
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
                  {highlightText(account.name)}
                </p>
                
                {/* Badge de tipo */}
                <span className={`
                  text-xs px-2 py-0.5 rounded-full shrink-0
                  ${account.type === 'INVESTMENT' 
                    ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                    : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                  }
                `}>
                  {account.type === 'INVESTMENT' ? '📈 Invest' : '💳 Conta'}
                </span>

                {/* Indicador de inativa */}
                {!account.isActive && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-slate-700 text-slate-400 shrink-0">
                    Inativa
                  </span>
                )}
              </div>
              
              {/* Descrição curta se existir */}
              {account.description && (
                <p className="text-xs text-slate-500 truncate max-w-[200px]">
                  {account.description}
                </p>
              )}
            </div>

            <div className="text-right">
              <p className={`font-semibold ${!account.isActive && 'text-slate-500'}`}>
                {balanceFormatted}
              </p>
              <p className="text-xs text-slate-500">
                {account.currency}
              </p>
              <p className="text-xs text-slate-600 mt-4">
                Criada em {new Date(account.createdAt).toLocaleDateString('pt-BR')}
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  // Versão em Grid
  return (
    <motion.div
      layout
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.98 }}
      onClick={handleClick}
      className={`
        cursor-pointer group relative
        rounded-2xl overflow-hidden
        transition-all duration-300
        ${account.isActive 
          ? 'hover:shadow-2xl hover:shadow-purple-500/10' 
          : 'opacity-75 hover:opacity-100'
        }
      `}
    >
      {/* Card com gradiente baseado no tipo */}
      <div className={`
        relative p-5
        backdrop-blur-xl border
        ${account.isActive 
          ? `bg-gradient-to-br ${typeConfig[account.type].bgColor} border-white/10` 
          : 'bg-slate-900/50 border-slate-800'
        }
      `}>
        {/* Overlay de hover com cor da conta */}
        {account.isActive && account.color && (
          <div 
            className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
            style={{
              background: `linear-gradient(45deg, ${account.color}15, transparent)`
            }}
          />
        )}

        {/* Header */}
        <div className="relative flex items-start justify-between">
          <div className="flex items-center gap-3">
            {/* Ícone com cor personalizada e glow */}
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-lg relative"
              style={{ 
                backgroundColor: account.color || '#6B7280',
                opacity: account.isActive ? 1 : 0.5,
                boxShadow: account.isActive ? `0 8px 16px ${account.color}30` : 'none'
              }}
            >
              <IconRenderer iconName={account.icon || "wallet"} size={20} />
              
              {/* Indicador de tipo no ícone */}
              <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-slate-900 border-2 border-slate-800 flex items-center justify-center">
                {account.type === 'INVESTMENT' ? (
                  <FaChartLine className="text-[8px] text-green-400" />
                ) : (
                  <FaRegCreditCard className="text-[8px] text-blue-400" />
                )}
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-white flex items-center gap-2">
                {highlightText(account.name)}
                
                {/* Tooltip de descrição se existir */}
                {account.description && (
                  <div 
                    className="relative"
                    onMouseEnter={() => setShowTooltip(true)}
                    onMouseLeave={() => setShowTooltip(false)}
                  >
                    <FaInfoCircle className="text-slate-500 text-sm cursor-help" />
                    
                    {/* Tooltip */}
                    {showTooltip && (
                      <div className="absolute bottom-full left-0 mb-2 w-48 p-2 rounded-lg bg-slate-800 border border-slate-700 text-xs text-slate-300 z-10">
                        {account.description}
                      </div>
                    )}
                  </div>
                )}
              </h3>
              
              <p className="text-xs text-slate-400">
                {typeConfig[account.type].label}
              </p>
            </div>
          </div>

          {/* Badge de status */}
          {!account.isActive ? (
            <span className="text-xs px-2 py-1 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
              Inativa
            </span>
          ) : (
            <span className={`
              text-xs px-2 py-1 rounded-full border
              ${account.type === 'INVESTMENT' 
                ? 'bg-green-500/10 text-green-400 border-green-500/30' 
                : 'bg-blue-500/10 text-blue-400 border-blue-500/30'
              }
            `}>
              {account.type === 'INVESTMENT' ? '📈' : '💳'} Ativa
            </span>
          )}
        </div>

        {/* Balance Section */}
        <div className="relative mt-6">
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
              {balanceFormatted}
            </h2>
            
            {/* Ícone representativo do tipo */}
            <div className="text-2xl text-slate-700">
              {account.type === 'INVESTMENT' ? <FaChartLine /> : <FaRegCreditCard />}
            </div>
          </div>

          {/* Data de criação */}
          <p className="text-xs text-slate-600 mt-4">
            Criada em {new Date(account.createdAt).toLocaleDateString('pt-BR')}
          </p>
        </div>
      </div>
    </motion.div>
  );
}
