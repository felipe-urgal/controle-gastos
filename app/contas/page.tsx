"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { formatCurrency } from "@/app/utils/format";
import { fetchTransacoes } from "@/app/services/transacoesService";
import { processarTransacoes } from "@/app/utils/processarTransacoes";
import { 
  HiOutlineLogout, 
  HiOutlineCash, 
  HiOutlineTrendingUp, 
  HiOutlineTrendingDown,
  HiOutlineHome,
  HiOutlineTag,
  HiOutlineExclamationCircle,
} from "react-icons/hi";
import { useAuth } from "@/app/context/AuthContext";
import { AnimatePresence, motion } from "framer-motion";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import ProtectedRoute from "@/app/components/ProtectedRoute";

type MesResumo = {
  mes: number;
  saldo: number;
  renda: number;
  despesas: number;
  investimentos: number;
  name: string;
};

export default function ContasPage() {
  const { user, logout } = useAuth();
  const [saldoTotal, setSaldoTotal] = useState(0);
  const [investimentoTotal, setInvestimentoTotal] = useState(0);
  const [meses, setMeses] = useState<MesResumo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const anoAtual = new Date().getFullYear();
  const [anoSelecionado, setAnoSelecionado] = useState<number>(anoAtual);
  const [openMeses, setOpenMeses] = useState<{ [key: number]: boolean }>({});
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
    } finally {
      setIsLoggingOut(false);
    }
  };

  const toggleOpen = (mes: number) => {
    setOpenMeses(prev => ({
      ...prev,
      [mes]: !prev[mes]
    }));
  };

  const carregarDados = useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const transacoes = await fetchTransacoes(user.id);
      const { mesesData, saldoAnual, investimentoAnual } = 
        processarTransacoes(transacoes, anoSelecionado);
      
      setMeses(mesesData);
      setSaldoTotal(saldoAnual);
      setInvestimentoTotal(investimentoAnual);
    } catch (err) {
      console.error("Erro ao carregar dados:", err);
      setError("Falha ao carregar dados financeiros. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }, [user, anoSelecionado]);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  const handleAnoChange = (value: number) => {
    setAnoSelecionado(value);
  };

  const classSaldo = (valor: number) => {
    if (valor === 0) return "text-gray-500";
    return valor < 0 ? "text-red-500" : "text-green-500";
  };

  if (!user) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="loader"></div>
      </div>
    );
  }

  return (
    <ProtectedRoute>
      <div className="max-w-6xl mx-auto p-4">
        {/* Cabeçalho */}
        <header className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <div className="flex items-center space-x-6 text-sm">
                <Link href="/contas" className="flex items-center gap-2 text-gray-500 transition cursor-default">
                  <HiOutlineHome size={18} />
                  Início
                </Link>
                <Link href="/categorias" className="flex items-center gap-2 text-blue-500 hover:underline transition">
                  <HiOutlineTag size={18} />
                  Categorias
                </Link>
              </div>
            </div>
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="cursor-pointer flex items-center gap-2 text-sm text-red-600 hover:text-red-800 transition-colors disabled:opacity-50"
            >
              {isLoggingOut ? (
                <span className="animate-spin">↻</span>
              ) : (
                <HiOutlineLogout size={18} />
              )}
              Sair
            </button>
          </div>
        </header>

        {/* Filtros */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <label htmlFor="ano" className="block text-sm font-medium text-gray-700 mb-1">
                Ano
              </label>
              <select
                id="ano"
                value={anoSelecionado}
                onChange={(e) => handleAnoChange(Number(e.target.value))}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 py-2 px-3 border"
                disabled={loading}
              >
                {Array.from({ length: 5 }, (_, i) => anoAtual - i).map((ano) => (
                  <option key={ano} value={ano}>
                    {ano}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="flex space-x-3">
              <div className="bg-green-50 p-3 rounded-lg flex items-center">
                <HiOutlineTrendingUp className="text-green-500 mr-2" size={20} />
                <span className="text-sm font-medium">Receitas</span>
              </div>
              <div className="bg-red-50 p-3 rounded-lg flex items-center">
                <HiOutlineTrendingDown className="text-red-500 mr-2" size={20} />
                <span className="text-sm font-medium">Despesas</span>
              </div>
              <div className="bg-blue-50 p-3 rounded-lg flex items-center">
                <HiOutlineCash className="text-blue-500 mr-2" size={20} />
                <span className="text-sm font-medium">Investimentos</span>
              </div>
            </div>
          </div>
        </div>

        {/* Conteúdo Principal */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <HiOutlineExclamationCircle className="h-5 w-5 text-red-500" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(12)].map((_, i) => (
              <Skeleton key={i} height={60} />
            ))}
          </div>
        ) : (
          <>
            {/* Cards dos Meses */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              <AnimatePresence>
                {meses.map(({ mes, saldo, renda, despesas, investimentos, name }) => (
                  <motion.div
                    key={`${anoSelecionado}-${mes}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="bg-white rounded-lg shadow overflow-hidden border border-gray-200 hover:shadow-md transition-shadow">
                      <div 
                        className="p-4 cursor-pointer flex justify-between items-center"
                        onClick={() => toggleOpen(mes)}
                      >
                        <h3 className="font-medium text-gray-800">{name}</h3>
                        <span className={`font-semibold ${classSaldo(saldo)}`}>
                          {formatCurrency(saldo)}
                        </span>
                      </div>

                      <AnimatePresence>
                        {openMeses[mes] && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="px-4 pb-4"
                          >
                            <div className="space-y-3">
                              <div className="flex justify-between">
                                <span className="text-sm text-gray-500">Receitas</span>
                                <span className="text-sm font-medium text-green-600">
                                  {formatCurrency(renda)}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-sm text-gray-500">Despesas</span>
                                <span className="text-sm font-medium text-red-600">
                                  {formatCurrency(despesas)}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-sm text-gray-500">Investimentos</span>
                                <span className="text-sm font-medium text-blue-600">
                                  {formatCurrency(investimentos)}
                                </span>
                              </div>
                              <Link
                                href={`/${anoSelecionado}/${mes}`}
                                className="block mt-3 text-center text-sm font-medium text-blue-600 hover:text-blue-800 transition"
                              >
                                Ver detalhes
                              </Link>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* Resumo Anual */}
            <div className="mt-8 bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Resumo Anual</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="border-l-4 border-green-500 pl-4">
                  <p className="text-sm text-gray-500">Saldo Total</p>
                  <p className={`text-2xl font-bold ${classSaldo(saldoTotal)}`}>
                    {formatCurrency(saldoTotal)}
                  </p>
                </div>
                <div className="border-l-4 border-blue-500 pl-4">
                  <p className="text-sm text-gray-500">Total Investido</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {formatCurrency(investimentoTotal)}
                  </p>
                </div>
                <div className="border-l-4 border-purple-500 pl-4">
                  <p className="text-sm text-gray-500">Balanço</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {formatCurrency(saldoTotal + investimentoTotal)}
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </ProtectedRoute>
  );
}