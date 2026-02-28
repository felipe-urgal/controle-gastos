"use client";

import { motion } from "framer-motion";
import { ANIMATION_CONFIG, MOCK_DATA } from "@/app/utils/home/animation";

interface FinancialMockProps {
  formattedSaldo: string;
}

export default function FinancialMock({ formattedSaldo }: FinancialMockProps) {
  const { DURATION_SLOW } = ANIMATION_CONFIG;
  const currentDate = new Date().toLocaleDateString("pt-BR", { 
    month: "long", 
    year: "numeric" 
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 60 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: DURATION_SLOW }}
      className="relative"
      role="complementary"
      aria-label="Demonstração do dashboard"
    >
      <div className="relative rounded-3xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8">
        
        {/* Cabeçalho do card */}
        <div className="flex justify-between items-center mb-6">
          <span className="font-semibold capitalize">{currentDate}</span>
          <span className="text-sm text-slate-400">Resumo</span>
        </div>

        {/* Gráfico simples de barras */}
        <div className="flex items-end gap-2 h-20 mb-6" aria-hidden="true">
          <div className="w-1/3 bg-purple-200 dark:bg-purple-900/30 rounded-t-lg h-16" />
          <div className="w-1/3 bg-purple-300 dark:bg-purple-800/40 rounded-t-lg h-24" />
          <div className="w-1/3 bg-purple-400 dark:bg-purple-700/50 rounded-t-lg h-20" />
        </div>

        {/* Resumo financeiro */}
        <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-800 text-sm space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-slate-500">Receitas</span>
            <span className="text-green-600 font-medium">
              + R$ {MOCK_DATA.RECEITAS.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-slate-500">Despesas</span>
            <span className="text-red-500 font-medium">
              - R$ {MOCK_DATA.DESPESAS.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </span>
          </div>
          
          <div className="flex justify-between items-center font-semibold pt-2 border-t border-slate-200 dark:border-slate-800">
            <span>Saldo</span>
            <span className="text-purple-600 text-lg">
              R$ {formattedSaldo}
            </span>
          </div>
        </div>

        {/* Ícone de cartão decorativo */}
        <div className="absolute -bottom-2 -right-2 w-24 h-24 bg-gradient-to-br from-purple-500/10 to-indigo-500/10 rounded-full blur-xl" />
      </div>
    </motion.div>
  );
}
