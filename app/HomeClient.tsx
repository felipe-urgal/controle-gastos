"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/context";
import { Loading } from "@/app/components";
import Link from "next/link";
import { motion } from "framer-motion";

export default function HomeClient() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [saldo, setSaldo] = useState(0);

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace("/contas");
    }
  }, [isAuthenticated, isLoading, router]);

  // animação fake de saldo subindo
  useEffect(() => {
    let value = 0;
    const target = 1450;
    const interval = setInterval(() => {
      value += 50;
      if (value >= target) {
        value = target;
        clearInterval(interval);
      }
      setSaldo(value);
    }, 25);
    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loading />
      </div>
    );
  }

  if (isAuthenticated) return null;

  return (
    <div className="relative min-h-screen overflow-hidden bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100">

      {/* Glow */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-[-300px] left-1/2 -translate-x-1/2 w-[900px] h-[900px] bg-purple-500/20 blur-[140px] rounded-full" />
      </div>

      {/* NAVBAR */}
      <header className="fixed top-0 w-full backdrop-blur-xl bg-white/70 dark:bg-slate-950/70 border-b border-slate-200 dark:border-slate-800 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <span className="font-semibold tracking-tight text-lg">
            Controle
          </span>
          <div className="flex items-center gap-6 text-sm">
            <Link href="/login" className="hover:opacity-70 transition">
              Login
            </Link>
            <Link
              href="/criar-conta"
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition shadow-md hover:shadow-purple-500/30"
            >
              Criar conta
            </Link>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="pt-36 pb-28 px-6">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-20 items-center">

          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <span className="inline-block mb-6 px-4 py-1 text-xs rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-300">
              Novo • Controle financeiro simplificado
            </span>

            <h1 className="text-4xl md:text-6xl font-bold leading-tight tracking-tight">
              Organize suas finanças
              <span className="block mt-3 text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-indigo-500">
                com clareza real
              </span>
            </h1>

            <p className="mt-8 text-lg text-slate-600 dark:text-slate-400 max-w-lg">
              Visualize gastos, acompanhe metas e tenha visão total
              da sua vida financeira.
            </p>

            <div className="mt-12 flex gap-4">
              <Link
                href="/criar-conta"
                aria-label="Criar conta gratuita"
                className="px-8 py-4 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-semibold transition-all duration-300 shadow-lg hover:shadow-purple-500/30 hover:scale-[1.03]"
              >
                Criar conta gratuita
              </Link>
            </div>
          </motion.div>

          {/* MOCK REALISTA */}
          <motion.div
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1 }}
            className="relative"
          >
            <div className="relative rounded-3xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 p-8">

              <div className="flex justify-between mb-6">
                <span className="font-semibold">{new Date().toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}</span>
                <span className="text-sm text-slate-400">Resumo</span>
              </div>

              <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-800 text-sm space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">Receitas</span>
                  <span className="text-green-600 font-medium">
                    + R$ 4.200,00
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Despesas</span>
                  <span className="text-red-500 font-medium">
                    - R$ 2.750,00
                  </span>
                </div>
                <div className="flex justify-between font-semibold pt-2">
                  <span>Saldo</span>
                  <span className="text-purple-600">
                    R$ {saldo.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

            </div>
          </motion.div>

        </div>
      </section>

      {/* COMO FUNCIONA */}
      <section className="py-24 border-t border-slate-200 dark:border-slate-800 px-6 text-center">
        <h2 className="text-3xl font-semibold">
          Como funciona
        </h2>

        <div className="mt-16 max-w-4xl mx-auto grid md:grid-cols-3 gap-12 text-left">
          <div>
            <h3 className="font-semibold mb-2">1. Cadastre</h3>
            <p className="text-slate-500 dark:text-slate-400">
              Crie sua conta gratuitamente em poucos segundos.
            </p>
          </div>
          <div>
            <h3 className="font-semibold mb-2">2. Registre</h3>
            <p className="text-slate-500 dark:text-slate-400">
              Adicione receitas e despesas com facilidade.
            </p>
          </div>
          <div>
            <h3 className="font-semibold mb-2">3. Controle</h3>
            <p className="text-slate-500 dark:text-slate-400">
              Tenha visão completa do seu dinheiro.
            </p>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-10 text-center text-sm text-slate-400">
        © {new Date().getFullYear()} Controle de Gastos
      </footer>

    </div>
  );
}
