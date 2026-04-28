"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import FinancialMock from "../financial-mock";
import { ROUTES, ANIMATION_CONFIG } from "@/app/utils/home/animation";

interface HeroSectionProps {
  formattedSaldo: string;
}

export default function HeroSection({ formattedSaldo }: HeroSectionProps) {
  const { DURATION_FAST } = ANIMATION_CONFIG;

  return (
    <section className="pt-15 pb-15 px-4 mb-4" aria-label="Seção principal">
      <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-4 items-center">
        
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: DURATION_FAST }}
          role="region"
          aria-label="Conteúdo principal"
        >
          <span 
            className="inline-block mb-4 px-4 py-1 text-xs rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-300"
            aria-label="Novo recurso"
          >
            Novo • Controle financeiro simplificado
          </span>

          <h1 className="text-4xl font-bold leading-tight tracking-tight">
            Organize suas finanças
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-indigo-500">
              com clareza real
            </span>
          </h1>

          <p className="mt-4 text-base sm:text-lg text-slate-600 dark:text-slate-400 max-w-lg">
            Visualize gastos, acompanhe metas e tenha visão total
            da sua vida financeira em um só lugar.
          </p>

          <div className="mt-4 flex flex-col sm:flex-row gap-4">
            <Link
              href={ROUTES.REGISTER}
              aria-label="Criar conta gratuita"
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-semibold transition-all duration-300 shadow-lg hover:shadow-purple-500/30 hover:scale-[1.03] focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 text-center"
            >
              Criar conta gratuita
            </Link>
            
            <Link
              href={ROUTES.LOGIN}
              aria-label="Fazer login"
              className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-xl font-semibold transition-all duration-300 hover:scale-[1.03] text-center"
            >
              Fazer login
            </Link>
          </div>
        </motion.div>

        <FinancialMock formattedSaldo={formattedSaldo} />
      </div>
    </section>
  );
}