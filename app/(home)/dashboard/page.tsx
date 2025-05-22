"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { formatCurrency } from "@/app/utils/format";
import { fetchTransacoes, Transacao} from "@/app/services/transacoesService";
import { processarTransacoes } from "@/app/utils/processarTransacoes";
import { HiOutlineLogout, HiOutlineHome, HiOutlineExclamationCircle } from "react-icons/hi";
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
  const TODOS_OPTION = -1;
  const [newTransacoes, setNewTransacoes] = useState<Transacao[]>([]);

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
        processarTransacoes(transacoes, anoSelecionado === TODOS_OPTION ? null : anoSelecionado);
      
      setNewTransacoes(transacoes)
      setMeses(mesesData);
      setSaldoTotal(saldoAnual);
      setInvestimentoTotal(investimentoAnual);
    } catch (err) {
      console.error("Erro ao carregar dados:", err);
      setError("Falha ao carregar dados financeiros. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }, [user, anoSelecionado, TODOS_OPTION]);

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
                <Link href="/dashboard" className="flex items-center gap-2 text-gray-500 transition cursor-default">
                  <HiOutlineHome size={18} />
                  Início
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
                <option value={TODOS_OPTION}>Todos os anos</option>
                {Array.from({ length: ((anoSelecionado === -1 ? anoAtual : anoSelecionado) + 5) - anoAtual }, (_, i) => 2024 + i)
                .reverse()
                .map((ano) => (
                  <option key={ano} value={ano}>
                    {ano}
                  </option>
                ))}
              </select>
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
                {anoSelecionado === TODOS_OPTION ? (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="col-span-full"
                  >
                    <div className="bg-white rounded-lg shadow p-4 sm:p-6">
                      <h3 className="text-lg font-semibold mb-4">Visão Geral por Ano</h3>
                      <div className="space-y-4">
                        {/* Cabeçalhos das colunas - escondido em mobile */}
                        <div className="hidden sm:grid grid-cols-4 gap-4 font-medium border-b pb-2">
                          <div>Ano</div>
                          <div className="text-green-600">Renda</div>
                          <div className="text-red-600">Despesas</div>
                          <div className="text-blue-600">Investimentos</div>
                        </div>

                        {/* Dados por ano */}
                        {Array.from(new Set(newTransacoes.map(t => new Date(t.data).getFullYear())))
                          .sort((a, b) => b - a)
                          .map(ano => {
                            const transacoesAno = newTransacoes.filter(
                              t => new Date(t.data).getFullYear() === ano
                            );
                            const resumoAno = processarTransacoes(transacoesAno, ano);
                            const totalRenda = resumoAno.mesesData.reduce((a, b) => a + b.renda, 0);
                            const totalDespesas = resumoAno.mesesData.reduce((a, b) => a + b.despesas, 0);

                            return (
                              <div key={ano} className="flex flex-col sm:grid sm:grid-cols-4 gap-2 sm:gap-4 items-start sm:items-center border-b pb-3 last:border-b-0">
                                <div className="font-medium w-full sm:w-auto bg-gray-50 sm:bg-transparent p-2 sm:p-0 rounded sm:rounded-none">{ano}</div>
                                
                                <div className="flex justify-between w-full sm:block sm:w-auto">
                                  <span className="sm:hidden text-sm text-gray-500">Renda:</span>
                                  <span className="text-green-600">+{formatCurrency(totalRenda)}</span>
                                </div>
                                
                                <div className="flex justify-between w-full sm:block sm:w-auto">
                                  <span className="sm:hidden text-sm text-gray-500">Despesas:</span>
                                  <span className="text-red-600">-{formatCurrency(totalDespesas)}</span>
                                </div>
                                
                                <div className="flex justify-between w-full sm:block sm:w-auto">
                                  <span className="sm:hidden text-sm text-gray-500">Investimentos:</span>
                                  <span className="text-blue-600">{formatCurrency(resumoAno.investimentoAnual)}</span>
                                </div>
                              </div>
                            );
                          })}

                        {/* Totais */}
                        {newTransacoes.length > 0 && (
                          <div className="flex flex-col sm:grid sm:grid-cols-4 gap-2 sm:gap-4 font-medium pt-3">
                            <div className="font-semibold bg-gray-50 sm:bg-transparent p-2 sm:p-0 rounded sm:rounded-none">Total</div>
                            
                            <div className="flex justify-between w-full sm:block sm:w-auto">
                              <span className="sm:hidden text-sm text-gray-500">Renda:</span>
                              <span className="text-green-600 font-semibold">
                                +{formatCurrency(
                                  Array.from(new Set(newTransacoes.map(t => new Date(t.data).getFullYear())))
                                    .map(ano => {
                                      const transacoesAno = newTransacoes.filter(t => new Date(t.data).getFullYear() === ano);
                                      return processarTransacoes(transacoesAno, ano).mesesData.reduce((a, b) => a + b.renda, 0);
                                    })
                                    .reduce((a, b) => a + b, 0)
                                )}
                              </span>
                            </div>
                            
                            <div className="flex justify-between w-full sm:block sm:w-auto">
                              <span className="sm:hidden text-sm text-gray-500">Despesas:</span>
                              <span className="text-red-600 font-semibold">
                                -{formatCurrency(
                                  Array.from(new Set(newTransacoes.map(t => new Date(t.data).getFullYear())))
                                    .map(ano => {
                                      const transacoesAno = newTransacoes.filter(t => new Date(t.data).getFullYear() === ano);
                                      return processarTransacoes(transacoesAno, ano).mesesData.reduce((a, b) => a + b.despesas, 0);
                                    })
                                    .reduce((a, b) => a + b, 0)
                                )}
                              </span>
                            </div>
                            
                            <div className="flex justify-between w-full sm:block sm:w-auto">
                              <span className="sm:hidden text-sm text-gray-500">Investimentos:</span>
                              <span className="text-blue-600 font-semibold">
                                {formatCurrency(
                                  Array.from(new Set(newTransacoes.map(t => new Date(t.data).getFullYear())))
                                    .map(ano => {
                                      const transacoesAno = newTransacoes.filter(t => new Date(t.data).getFullYear() === ano);
                                      return processarTransacoes(transacoesAno, ano).investimentoAnual;
                                    })
                                    .reduce((a, b) => a + b, 0)
                                )}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  meses.map(({ mes, saldo, renda, despesas, investimentos, name }) => (
                    <motion.div
                      key={`${anoSelecionado}-${mes}`}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <div className="bg-white rounded-lg shadow overflow-hidden border border-gray-200 hover:shadow-md hover:border-blue-500 transition-all duration-300">
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
                  ))
                )}
              </AnimatePresence>
            </div>


            {/* Resumo Anual */}
            {anoSelecionado !== TODOS_OPTION && (
              <div className="mt-8 bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-800 mb-4">Resumo Anual ${anoSelecionado}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Saldo Total - Alinhado à esquerda */}
                  <div className="border-l-4 border-green-500 pl-4 md:justify-self-start">
                    <p className="text-sm text-gray-500">Saldo Total</p>
                    <p className={`text-2xl font-bold ${classSaldo(saldoTotal)}`}>
                      {formatCurrency(saldoTotal)}
                    </p>
                  </div>

                  {/* Espaço vazio no centro (apenas desktop) */}
                  <div className="hidden lg:block"></div>

                  {/* Total Investido - Alinhado à direita */}
                  <div className="border-l-4 border-blue-500 pl-4 md:justify-self-end lg:col-start-3">
                    <p className="text-sm text-gray-500">Total Investido</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {formatCurrency(investimentoTotal)}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </ProtectedRoute>
  );
}