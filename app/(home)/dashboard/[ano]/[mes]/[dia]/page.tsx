"use client";

import Link from "next/link";
import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { formatCurrency, formatarData } from "@/app/utils/format";
import { PencilIcon, TrashIcon } from "@heroicons/react/24/solid";
import { fetchTransacao, deleteTransacao, Transacao } from "@/app/services/transacoesService";
import { HiOutlineArrowUp, HiOutlineArrowDown, HiOutlineCurrencyDollar, HiOutlineChevronUp, HiOutlineChevronDown } from "react-icons/hi";
import Modal from "@/app/components/Modal";
import { useAuth } from "@/app/context/AuthContext";
import { toast } from 'react-toastify';
import Skeleton from "react-loading-skeleton";
import 'react-loading-skeleton/dist/skeleton.css';
import Breadcrumb from "@/app/components/Breadcrumb"; // Ajuste o caminho conforme sua estrutura
import ProtectedRoute from "@/app/components/ProtectedRoute";

interface TransacoesListProps {
  titulo: string;
  transacoes: Transacao[];
  tipo: "renda" | "despesa" | "investimentos";
  onEditar: (id: number) => void;
  onRemover: (id: number) => void;
}

const calcularSaldo = (transacoes: Transacao[]) => {
  return transacoes.reduce((total, { valor, tipo }) => total + (
    tipo === "renda" 
      ? Number(valor) 
      : tipo === "despesa" 
        ? -Number(valor)
        : 0
  ), 0);
};

export default function Info() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();

  const mesSelecionado = Number(params.mes);
  const anoSelecionado = Number(params.ano);
  const diaSelecionado = Number(params.dia);

  const [transacoes, setTransacoes] = useState<Transacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [transacaoIdParaRemover, setTransacaoIdParaRemover] = useState<number | null>(null);

  useEffect(() => {
    async function fetchDados() {
      if (!user) return;

      setLoading(true);
      try {
        const data = await fetchTransacao(user.id, mesSelecionado, anoSelecionado);

        const transacoesFiltradas = data.filter((t) => {
          const transacaoDate = new Date(t.data);
          transacaoDate.setDate(transacaoDate.getDate());
          const targetDate = new Date(anoSelecionado, mesSelecionado-1, diaSelecionado);
          return transacaoDate.toDateString() === targetDate.toDateString();
        });

        setTransacoes(transacoesFiltradas);
      } catch (error) {
        console.error("Erro ao carregar os dados:", error);
        toast.error("Erro ao carregar transações");
      } finally {
        setLoading(false);
      }
    }

    fetchDados();
  }, [mesSelecionado, anoSelecionado, diaSelecionado, user]);

  const rendas = transacoes.filter((t) => t.tipo === "renda");
  const despesas = transacoes.filter((t) => t.tipo === "despesa");
  const investimentos = transacoes.filter((t) => t.tipo === "investimentos");

  const handleEditar = (id: number) => {
    router.push(`/dashboard/${anoSelecionado}/${mesSelecionado}/${diaSelecionado}/${id}`);
  };

  const handleRemover = (id: number) => {
    setTransacaoIdParaRemover(id);
    setIsModalOpen(true);
  };

  const confirmarRemocao = async () => {
    if (transacaoIdParaRemover === null) return;

    try {
      await deleteTransacao(transacaoIdParaRemover);
      toast.success("Transação removida com sucesso!");
      setTransacoes(prevTransacoes => prevTransacoes.filter(t => t.id !== transacaoIdParaRemover));
    } catch (error) {
      console.error("Erro ao remover transação:", error);
      toast.error("Erro ao remover transação");
    } finally {
      setIsModalOpen(false);
      setTransacaoIdParaRemover(null);
    }
  };

  const cancelarRemocao = () => {
    setIsModalOpen(false);
    setTransacaoIdParaRemover(null);
  };

  const saldo = useMemo(() => calcularSaldo(transacoes), [transacoes]);
  
  const saldoInvestimentos = useMemo(() => {
    return transacoes.reduce((total, { valor, tipo }) => 
      total + (tipo === "investimentos" ? Number(valor) : 0)
    , 0)
  }, [transacoes]);

  const classSaldo = (valor: number) => {
    if (valor === 0) return "text-gray-600";
    return valor < 0 ? "text-red-600" : "text-green-600";
  };

  const getCorTipo = (tipo: string) => {
    switch(tipo) {
      case "renda": return "green";
      case "despesa": return "red";
      case "investimentos": return "gray";
      default: return "gray";
    }
  };

  const TransacoesList = ({ titulo, transacoes, tipo, onEditar, onRemover }: TransacoesListProps) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const cor = getCorTipo(tipo);
    const total = transacoes.reduce((sum, t) => sum + Number(t.valor), 0);

    const className = tipo === "renda"
      ? "bg-green-500 hover:bg-green-600 text-white"
      : tipo === "despesa"
        ? "bg-red-500 hover:bg-red-600 text-white"
        : "bg-gray-500 hover:bg-gray-600 text-white"
    
    return (
      <div className="bg-white rounded-lg shadow-md p-4 h-full flex flex-col">
        <div 
          className={`border-b-2 border-${cor}-500 pb-2 mb-4 cursor-pointer`}
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              {tipo === "despesa" ? (
                <HiOutlineArrowDown className={`text-${cor}-500 mr-2`} size={20} />
              ) : tipo === "renda" ? (
                <HiOutlineArrowUp className={`text-${cor}-500 mr-2`} size={20} />
              ) : (
                <HiOutlineCurrencyDollar className={`text-${cor}-500 mr-2`} size={20} />
              )}
              <h3 className={`text-lg font-bold text-${cor}-700`}>
                {titulo}
              </h3>
            </div>
            
            <div className="flex items-center space-x-2">
              <Link
                href={`/dashboard/${anoSelecionado}/${mesSelecionado}/${diaSelecionado}/nova?tipo=${tipo}`}
                className={`${className} text-white px-3 py-1 rounded-md text-sm font-medium transition-colors`}
                title={`Adicionar nova ${titulo.toLowerCase()}`}
                onClick={(e) => e.stopPropagation()}
              >
                + Add
              </Link>
              <button 
                className="text-gray-500 hover:text-gray-700 p-1"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsExpanded(!isExpanded);
                }}
                aria-label={isExpanded ? "Recolher lista" : "Expandir lista"}
              >
                {isExpanded ? (
                  <HiOutlineChevronUp size={18} />
                ) : (
                  <HiOutlineChevronDown size={18} />
                )}
              </button>
            </div>
          </div>
          <div className="mt-2 flex justify-between items-center">
            <span className="text-sm text-gray-500">Total:</span>
            <span className={`font-semibold ${classSaldo(tipo === "despesa" ? -total : total)}`}>
              {formatCurrency(tipo === "despesa" ? -total : total)}
            </span>
          </div>
        </div>

        {isExpanded && (
          <div className="flex-grow overflow-y-auto max-h-96 pr-2">
            {loading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} height={80} className="rounded-lg" />
                ))}
              </div>
            ) : transacoes.length > 0 ? (
              transacoes.map(({ id, valor, descricao, data, valorUnitario, quantidade }) => (
                <div
                  key={id}
                  className={`mb-3 p-3 rounded-lg border-l-4 border-${cor}-500 bg-white shadow-sm hover:shadow-md transition-shadow`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-medium text-gray-800 line-clamp-1" title={descricao}>
                        {descricao}
                      </h4>
                      <p className="text-xs text-gray-500 mt-1">
                        {formatarData(data)}
                      </p>
                      {tipo === "investimentos" && (
                        <p className="text-xs text-gray-600 mt-1">
                          {quantidade} × {formatCurrency(valorUnitario)}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className={`font-semibold ${classSaldo(tipo === "despesa" ? -Number(valor) : Number(valor))}`}>
                        {formatCurrency(valor)}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex justify-end space-x-2 mt-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditar(id);
                      }}
                      className="text-blue-500 hover:text-blue-700 p-1 rounded-full hover:bg-blue-50 transition-colors"
                      aria-label={`Editar ${titulo.toLowerCase()}`}
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemover(id);
                      }}
                      className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-50 transition-colors"
                      aria-label={`Remover ${titulo.toLowerCase()}`}
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-6">
                <p className="text-gray-500">
                  Nenhuma {titulo.toLowerCase()} registrada
                </p>
                <Link
                  href={`/dashboard/${anoSelecionado}/${mesSelecionado}/${diaSelecionado}/nova?tipo=${tipo}`}
                  className={`inline-block mt-2 text-${cor}-600 hover:text-${cor}-800 text-sm font-medium`}
                >
                  Adicionar {titulo.toLowerCase()}
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };
  
  return (
    <ProtectedRoute>
      <div className="max-w-6xl mx-auto p-4">
        {/* Breadcrumb e cabeçalho */}
        <Breadcrumb 
          anoSelecionado={anoSelecionado}
          mesSelecionado={mesSelecionado}
          diaSelecionado={diaSelecionado}
          showMonthLink={true}
          showMonthLink2={true}
        />

        {/* Conteúdo principal */}
        {loading && transacoes.length === 0 ? (
          <div className="">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-30">
                  <Skeleton height={90} className="mb-3 rounded-lg" />
                </div>
              ))}
            </div>
            <div>
              <Skeleton height={50} />
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <TransacoesList
                titulo="Rendas"
                transacoes={rendas}
                tipo="renda"
                onEditar={handleEditar}
                onRemover={handleRemover}
              />
              <TransacoesList
                titulo="Despesas"
                transacoes={despesas}
                tipo="despesa"
                onEditar={handleEditar}
                onRemover={handleRemover}
              />
              <TransacoesList
                titulo="Investimentos"
                transacoes={investimentos}
                tipo="investimentos"
                onEditar={handleEditar}
                onRemover={handleRemover}
              />
            </div>

            {/* Resumo financeiro */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-sm font-medium text-gray-500">Saldo do Dia</h3>
                  <p className={`text-2xl font-bold mt-1 ${classSaldo(saldo)}`}>
                    {formatCurrency(saldo)}
                  </p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-sm font-medium text-gray-500">Total Investido</h3>
                  <p className="text-2xl font-bold text-gray-700 mt-1">
                    {formatCurrency(saldoInvestimentos)}
                  </p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-sm font-medium text-gray-500">Total de Transações</h3>
                  <p className="text-2xl font-bold text-gray-700 mt-1">
                    {transacoes.length}
                  </p>
                </div>
              </div>
            </div>
          </>
        )}

        <Modal
          isOpen={isModalOpen}
          onClose={cancelarRemocao}
          onConfirm={confirmarRemocao}
          mensagem="Tem certeza que deseja excluir esta transação?"
        />
      </div>
    </ProtectedRoute>
  );
}