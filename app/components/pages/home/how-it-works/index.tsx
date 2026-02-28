"use client";

import { motion } from "framer-motion";
import { ANIMATION_CONFIG } from "@/app/utils/home/animation";

const steps = [
  {
    number: "1",
    title: "Cadastre",
    description: "Crie sua conta gratuitamente em poucos segundos.",
    icon: "📝",
    color: "from-purple-500/20 to-purple-600/20"
  },
  {
    number: "2",
    title: "Registre",
    description: "Adicione receitas e despesas com facilidade.",
    icon: "💰",
    color: "from-indigo-500/20 to-indigo-600/20"
  },
  {
    number: "3",
    title: "Controle",
    description: "Tenha visão completa do seu dinheiro.",
    icon: "📊",
    color: "from-blue-500/20 to-blue-600/20"
  }
];

export default function HowItWorks() {
  const { DURATION_FAST } = ANIMATION_CONFIG;

  return (
    <section 
      className="py-24 border-t border-slate-200 dark:border-slate-800 px-4 sm:px-6 text-center"
      aria-label="Como funciona"
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: DURATION_FAST }}
      >
        <h2 className="text-3xl sm:text-4xl font-semibold">
          Como funciona
        </h2>
        <p className="mt-4 text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
          Comece a controlar suas finanças em três passos simples
        </p>
      </motion.div>

      <div className="mt-16 max-w-5xl mx-auto grid md:grid-cols-3 gap-8 lg:gap-12 text-left">
        {steps.map((step, index) => (
          <motion.div
            key={step.number}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: DURATION_FAST, delay: index * 0.2 }}
            className="relative p-6 rounded-2xl bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 hover:shadow-lg transition-shadow"
            role="article"
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${step.color} rounded-2xl opacity-0 hover:opacity-100 transition-opacity`} />
            
            <div className="relative">
              <span className="text-4xl mb-4 block" aria-hidden="true">
                {step.icon}
              </span>
              
              <div className="flex items-center gap-2 mb-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-300 text-sm font-semibold">
                  {step.number}
                </span>
                <h3 className="font-semibold text-lg">{step.title}</h3>
              </div>
              
              <p className="text-slate-500 dark:text-slate-400">
                {step.description}
              </p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Call to action adicional */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: DURATION_FAST, delay: 0.4 }}
        className="mt-16"
      >
        <a
          href="/signup"
          className="inline-flex items-center gap-2 text-purple-600 hover:text-purple-700 font-medium transition-colors"
          aria-label="Começar agora"
        >
          <span>Começar agora</span>
          <svg 
            className="w-4 h-4" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </a>
      </motion.div>
    </section>
  );
}