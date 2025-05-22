"use client";

import Link from "next/link";
import { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import { formatCurrency } from "@/app/utils/format";
import { fetchTransacao, Transacao } from "@/app/services/transacoesService";
import { HiOutlineArrowUp, HiOutlineArrowDown } from "react-icons/hi";
import { useAuth } from "@/app/context/AuthContext";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import Breadcrumb from "@/app/components/Breadcrumb"; // Ajuste o caminho conforme sua estrutura

export default function Info() {
  const { mes, ano } = useParams();
  const mesSelecionado = Number(mes);
  const anoSelecionado = Number(ano);

  const ultimoDiaDoMes = new Date(anoSelecionado, mesSelecionado, 0);
  const totalDiasDoMes = ultimoDiaDoMes.getDate();

  const [transacoes, setTransacoes] = useState<Transacao[]>([]);
  const [transacoesPorDia, setTransacoesPorDia] = useState<Record<number, Transacao[]>>({});
  const [loading, setLoading] = useState(true);
  const diaAtual = new Date().getDate();
  const mesAtual = new Date().getMonth() + 1;
  const [openDia, setOpenDia] = useState<{ [key: number]: boolean }>({});

  const { user } = useAuth();

  const toggleOpen = (dia: number) => {
    setOpenDia((prev) => ({
      ...prev,
      [dia]: !prev[dia],
    }));
  };

  useEffect(() => {
    async function fetchDados() {
      if (!user) return;
      
      setLoading(true);
      try {
        const data = await fetchTransacao(user.id, mesSelecionado, anoSelecionado);
        const transacoesFiltradas = data.filter(
          (t) => t.mes === mesSelecionado && t.ano === anoSelecionado
        );

        const transacoesOrdenadas = transacoesFiltradas.sort(
          (a, b) => new Date(a.data).getTime() - new Date(b.data).getTime()
        );

        const transacoesPorDia: Record<number, Transacao[]> = transacoesOrdenadas.reduce(
          (acc, transacao) => {
            const dia = new Date(transacao.data).getDate() + 1;
            if (!acc[dia]) acc[dia] = [];
            acc[dia].push(transacao);
            return acc;
          },
          {} as Record<number, Transacao[]>
        );

        setTransacoes(transacoesOrdenadas);
        setTransacoesPorDia(transacoesPorDia);
      } catch (error) {
        console.error("Erro ao carregar os dados:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchDados();
  }, [mesSelecionado, anoSelecionado, user]);

  const calcularSaldo = useMemo(() => (tipo: "investimentos" | "renda" | "despesa") => {
    return transacoes.reduce((total, { valor, tipo: tipoTransacao }) => 
      total + (tipoTransacao === tipo ? Number(valor) : 0)
    , 0);
  }, [transacoes]);

  const saldoInvestimentos = calcularSaldo("investimentos");
  const saldoRenda = calcularSaldo("renda");
  const saldoDespesa = calcularSaldo("despesa");

  const saldo = saldoRenda - saldoDespesa;

  const classSaldo = (saldo: number) => 
    saldo === 0 ? "text-gray-500" : saldo < 0 ? "text-red-500" : "text-green-500";
  
  return (
    <div className="max-w-6xl mx-auto p-4">
      {/* Breadcrumb melhorado */}
      <Breadcrumb 
        anoSelecionado={anoSelecionado}
        mesSelecionado={mesSelecionado}
        showMonthLink={true}
      />

      {loading ? (
        <div>
          <Skeleton className="h-40 mb-6" />

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {Array.from({ length: totalDiasDoMes }).map((_, i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        </div>
      ) : (
        <>

          {/* Resumo do mês - Versão melhorada */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden mb-6">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="text-base font-semibold text-gray-800">Resumo financeiro</h3>
            </div>
            
            <div className="p-5">
              {/* Saldo principal */}
              <div className="flex flex-col items-center mb-6">
                <span className="text-sm font-medium text-gray-500 mb-1">Saldo do mês</span>
                <span className={`text-3xl font-bold ${classSaldo(saldo)}`}>
                  {formatCurrency(saldo)}
                </span>
              </div>

              {/* Grid de métricas */}
              <div className="grid grid-cols-3 divide-x divide-gray-100 text-center">
                <div className="px-3 py-2">
                  <p className="text-sm text-gray-500 mb-1">Renda</p>
                  <p className="text-lg font-semibold text-green-600">
                    {formatCurrency(saldoRenda)}
                  </p>
                </div>
                <div className="px-3 py-2">
                  <p className="text-sm text-gray-500 mb-1">Despesas</p>
                  <p className="text-lg font-semibold text-red-600">
                    {formatCurrency(saldoDespesa)}
                  </p>
                </div>
                <div className="px-3 py-2">
                  <p className="text-sm text-gray-500 mb-1">Investimentos</p>
                  <p className="text-lg font-semibold text-blue-600">
                    {formatCurrency(saldoInvestimentos)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Grid de dias com layout melhorado */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-6">
            {Array.from({ length: totalDiasDoMes }, (_, index) => {
              const dia = index + 1;
              const transacoesDia = transacoesPorDia[dia] || [];
              const temTransacoes = transacoesDia.length > 0;

              const saldoDiaInvestimentos = transacoesDia.reduce((total, { valor, tipo }) =>
                total + (tipo === "investimentos" ? Number(valor) : 0), 0);
              const saldoDiaRenda = transacoesDia.reduce((total, { valor, tipo }) =>
                total + (tipo === "renda" ? Number(valor) : 0), 0);
              const saldoDiaDespesa = transacoesDia.reduce((total, { valor, tipo }) =>
                total + (tipo === "despesa" ? Number(valor) : 0), 0);

              const saldoDia = saldoDiaRenda - saldoDiaDespesa;

              return (
                <div key={`${anoSelecionado}-${mes}-${dia}`}>
                  <div 
                    key={dia}
                    className={`
                      hover:border-gray-800
                      border rounded-lg transition-all duration-200 overflow-hidden
                      ${openDia[dia] ? "border-gray-300 shadow-md" : "border-gray-200"}
                      ${temTransacoes ? "bg-white" : "bg-gray-50"}
                    `}
                  >
                    <div 
                      className={`
                        p-3 cursor-pointer flex flex-col
                        ${openDia[dia] ? "border-b border-gray-200" : ""}
                      `}
                      onClick={() => toggleOpen(dia)}
                    >
                      <div className="flex justify-between items-center">
                        <span className={`
                          font-medium 
                          ${temTransacoes ? "text-gray-800" : "text-gray-400"}
                          ${dia === diaAtual && mesAtual === mesSelecionado ? "font-bold text-blue-600" : ""}
                        `}>
                          {dia}
                        </span>
                        <div className="flex items-center space-x-1">
                          <span className={`text-sm font-semibold ${classSaldo(saldoDia)}`}>
                            {formatCurrency(saldoDia)}
                          </span>
                          {saldoDia < 0 ? (
                            <HiOutlineArrowDown className="h-4 w-4 text-red-500" />
                          ) : (
                            <HiOutlineArrowUp className="h-4 w-4 text-green-500" />
                          )}
                        </div>
                      </div>

                      {openDia[dia] && (
                        <div className="border-t border-gray-200 py-2">
                          <div className="space-y-3 mb-3">
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-500">Renda</span>
                              <span className="text-sm text-green-600">{formatCurrency(saldoDiaRenda)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-500">Despesas</span>
                              <span className="text-sm text-red-600">{formatCurrency(saldoDiaDespesa)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-500">Investimentos</span>
                              <span className="text-sm text-gray-600">{formatCurrency(saldoDiaInvestimentos)}</span>
                            </div>
                          </div>

                          <Link 
                            href={`/dashboard/${anoSelecionado}/${mes}/${dia}`}
                            className="block mt-3 text-center text-sm font-medium text-blue-600 hover:text-blue-800 transition"

                          >
                            Ver detalhes
                          </Link>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}