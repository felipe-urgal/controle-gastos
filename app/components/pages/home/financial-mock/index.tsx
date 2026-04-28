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
      <div className="relative rounded-lg bg-white/5 border border-white/10 p-4">
        
        <div className="flex justify-between items-center mb-4">
          <span className="font-semibold capitalize">{currentDate}</span>
          <span className="text-sm text-slate-400">Resumo</span>
        </div>

        <div className="flex items-end gap-2 h-20 mb-4" aria-hidden="true">
          <div className="w-1/3 bg-purple-200 dark:bg-purple-900/30 rounded-t-lg h-16" />
          <div className="w-1/3 bg-purple-300 dark:bg-purple-800/40 rounded-t-lg h-24" />
          <div className="w-1/3 bg-purple-400 dark:bg-purple-700/50 rounded-t-lg h-20" />
        </div>

        <div className="mt-4 pt-4 border-t border-white/10 text-sm">
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
          
          <div className="flex justify-between items-center font-semibold pt-2 border-t border-white/10">
            <span>Saldo</span>
            <span className="text-purple-600 text-lg">
              R$ {formattedSaldo}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
