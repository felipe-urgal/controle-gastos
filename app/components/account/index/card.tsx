"use client";

// importing hooks
import { useRouter } from "next/navigation";

// importing types
import { AccountModel } from "@/app/types/account";

// importing components
import { motion } from "framer-motion";
import { IconRenderer } from "@/app/components";

// importing icons
import { FaRegCreditCard, FaChartLine } from "react-icons/fa";

interface Props {
  account: AccountModel;
  viewMode: "grid" | "list";
  searchTerm?: string;
  index: number;
}

const typeConfig = {
  CREDIT_DEBIT: {
    label: "Conta Corrente",
    icon: <FaRegCreditCard className="text-sm" />,
    bgColor: "from-blue-500/20 to-purple-500/20",
    borderColor: "border-blue-500/30",
  },
  INVESTMENT: {
    label: "Investimento",
    icon: <FaChartLine className="text-sm" />,
    bgColor: "from-green-500/20 to-emerald-500/20",
    borderColor: "border-green-500/30",
  },
};

export default function AccountCard({
  account,
  viewMode,
  searchTerm = "",
  index,
}: Props) {
  const router = useRouter();

  const balanceFormatted = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: account.currency,
  }).format(account.balance / 100)

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

  return (
    <motion.div
      key={account.id}
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{
        duration: 0.2,
        delay: index * 0.03,
      }}
    > 
      {viewMode === "list" ? (
        <motion.div
          layout
          whileHover={{ x: 4 }}
          whileTap={{ scale: 0.99 }}
          onClick={handleClick}
          className={`
            cursor-pointer relative
            p-3 rounded-xl
            backdrop-blur-sm border
            transition-all
            ${account.isActive 
              ? 'bg-white/5 hover:bg-white/[0.07] border-white/5 hover:border-purple-500/40' 
              : 'bg-slate-900/30 border-slate-800/50 hover:border-slate-700'
            }
          `}
        >
          <div className="flex items-center justify-between">
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
                    {highlightText(account.name)}
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
                  {balanceFormatted}
                </p>
                <p className="text-xs text-slate-500">
                  {account.currency}
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      ) : (
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
          <div className={`
            relative p-4
            backdrop-blur-xl border
            ${account.isActive 
              ? `bg-gradient-to-br ${typeConfig[account.type].bgColor} border-white/5` 
              : 'bg-slate-900/50 border-slate-800'
            }
          `}>
            {account.isActive && account.color && (
              <div 
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={{
                  background: `linear-gradient(45deg, ${account.color}15, transparent)`
                }}
              />
            )}

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
                    {highlightText(account.name)}
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
                <span className={`
                  text-xs px-2 py-1 rounded-full border
                  ${account.type === 'INVESTMENT' 
                    ? 'bg-green-500/10 text-green-400 border-green-500/30' 
                    : 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                  }
                `}>
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
                  {balanceFormatted}
                </h2>
                
                <div className="text-2xl text-slate-700">
                  {account.type === 'INVESTMENT' ? <FaChartLine /> : <FaRegCreditCard />}
                </div>
              </div>

              <p className="text-xs text-slate-600 mt-2">
                Criada em {new Date(account.createdAt).toLocaleDateString('pt-BR')}
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};
