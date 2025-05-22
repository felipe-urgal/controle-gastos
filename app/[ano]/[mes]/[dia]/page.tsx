"use client";

import Link from "next/link";
import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { formatCurrency, formatarData, MESES_NOME } from "@/app/utils/format";
import { PencilIcon, TrashIcon } from "@heroicons/react/24/solid";
import { fetchTransacao, deleteTransacao, Transacao } from "@/app/services/transacoesService";
import { HiOutlineArrowUp, HiOutlineArrowDown } from "react-icons/hi";
import Modal from "@/app/components/Modal";
import { useAuth } from "@/app/context/AuthContext";
import { toast } from 'react-toastify';

interface TransacoesListProps {
  titulo: string;
  transacoes: Transacao[];
  cor: "green" | "red" | "gray";
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
  ),0)
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
      if (!user) return; // Garante que o usuário esteja autenticado

      setLoading(true);
      try {
        const data = await fetchTransacao(user.id, mesSelecionado, anoSelecionado);

        const transacoesFiltradas = data.filter((t) => {
          const transacaoDate = new Date(t.data);
          transacaoDate.setDate(transacaoDate.getDate() + 1); // Soma 1 dia
          
          const targetDate = new Date(anoSelecionado, mesSelecionado-1, diaSelecionado);

          return transacaoDate.toDateString() === targetDate.toDateString();
        });



        setTransacoes(transacoesFiltradas);
      } catch (error) {
        console.error("Erro ao carregar os dados:", error);
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
    router.push(`/${anoSelecionado}/${mesSelecionado}/${diaSelecionado}/${id}`);
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
  }, [transacoes])

  const classSaldo = (saldo: number) => {
    if (saldo === 0) return "text-gray-500";
    return saldo < 0 ? "text-red-500" : "text-green-500";
  };

  const TransacoesList = ({ titulo, transacoes, cor, onEditar, onRemover }: TransacoesListProps) => {
    return (
      <div>
        <h3
          className={`text-${cor}-600 font-bold mb-2 text-center select-none border p-3 rounded-md`}
          title={`Exbir lista de ${titulo}`}
        > 
          <div className="flex justify-between">
            {titulo === "Despesa" ? (
              <HiOutlineArrowDown className="inline-block mr-1 text-red-500" />
            ) : (
              <HiOutlineArrowUp className="inline-block mr-1 text-green-500" />
            )}
            {titulo}

            <Link
              href={`/${anoSelecionado}/${mesSelecionado}/${diaSelecionado}/nova?tipo=${titulo.toLowerCase()}`}
              className="cursor-pointer text-blue-500 hover:underline rounded-lg transition"
              title="Fazer uma nova transação"
            >
              + Add
            </Link>
          </div>
        </h3>

        {transacoes.length > 0 ? (
          transacoes.map(({ id, valor, descricao, data, valorUnitario, quantidade }) => (
            <div
              title={descricao}
              key={id}
              className={`mb-2 shadow-lg rounded-xl p-4 flex-col justify-between items-center border ${
                cor === "green"
                  ? "border-green-300 bg-green-100"
                  : cor === "red"
                  ? "border-red-300 bg-red-100"
                  : "border-gray-300 bg-gray-100"
              }`}
            >
              <div className="flex justify-between items-center pb-1">
                <p className="font-medium text-gray-500">
                  {descricao}
                </p>
                <small className="text-gray-500">{formatarData(data)}</small>
              </div>

              <div className="flex justify-between items-end border-t-1 border-gray-500 pt-1">
                <div className="flex items-end">
                  {titulo === "Investimentos" && (
                    <small className="text-gray-500 me-1">{quantidade} x {formatCurrency(valorUnitario)} = </small>
                  )}

                  <small
                    className={`${
                      cor === "green"
                        ? "text-green-600"
                        : cor === "red"
                        ? "text-red-600"
                        : "text-gray-600"
                    } font-semibold`}
                  >
                    {formatCurrency(valor)}
                  </small>
                </div>

                <div className="flex cursor-pointer">
                  <button
                    onClick={() => onEditar(id)}
                    aria-label="Editar Transação"
                    className="rounded cursor-pointer transition"
                  >
                    <PencilIcon className="h-4 w-4 text-blue-500 hover:text-blue-800" />
                  </button>
                  <button
                    onClick={() => onRemover(id)}
                    aria-label="Remover Transação"
                    className="rounded cursor-pointer transition ms-2"
                  >
                    <TrashIcon className="h-4 w-4 text-red-500 hover:text-red-800" />
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <p className="text-gray-500 text-center">
            Nenhuma {titulo.toLowerCase()} cadastrada.
          </p>
        )}
      </div>
    );
  };
  
  return (
    <div className="max-w-4xl mx-auto p-4">
      <nav className="mb-5 text-sm border border-gray-300 bg-gray-100 shadow-lg rounded-xl p-4 flex flex-wrap justify-between items-center">
        <div className="flex items-center">
          <Link href="/" className="text-blue-500 hover:underline" title="Voltar para o Início">
            Início
          </Link>
          <span className="mx-2 text-gray-400">/</span>
          <Link href={`/${anoSelecionado}/${mesSelecionado}`} className="text-blue-500 hover:underline" title="Mês/Ano selecionado">
            {MESES_NOME[mesSelecionado - 1]} ({anoSelecionado})
          </Link>
          <span className="mx-2 text-gray-400">/</span>
          <span className="text-gray-500">{diaSelecionado}</span>
        </div>
      </nav>


      {loading ? (
        <div className="flex justify-center items-center space-x-2">
          <div className="loader me-3"></div>
          <div className="text-lg font-semibold">Carregando dados...</div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <TransacoesList
              titulo="Renda"
              transacoes={rendas}
              cor="green"
              onEditar={handleEditar}
              onRemover={handleRemover}
            />
            <TransacoesList
              titulo="Despesa"
              transacoes={despesas}
              cor="red"
              onEditar={handleEditar}
              onRemover={handleRemover}
            />
            <TransacoesList
              titulo="Investimentos"
              transacoes={investimentos}
              cor="gray"
              onEditar={handleEditar}
              onRemover={handleRemover}
            />
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center mt-4 border border-gray-300 bg-gray-100 shadow-lg rounded-xl p-4">
            <div className="flex items-center">
              <h5 className={`font-semibold ${classSaldo(saldo)}`} title="Saldo Total do Mês">
                Saldo Total: {formatCurrency(saldo)}
              </h5>
            </div>

            <div className="flex items-center">
              <h5 className="font-semibold text-gray-500" title="Total Investido no Mês">
                Investimentos: {formatCurrency(saldoInvestimentos)}
              </h5>
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
  );
}
