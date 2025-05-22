"use client";

import Link from "next/link";
import { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import { formatCurrency, MESES_NOME } from "@/app/utils/format";
import { fetchTransacao, Transacao } from "@/app/services/transacoesService";
import { HiOutlineArrowUp, HiOutlineArrowDown } from "react-icons/hi";
import { useAuth } from "@/app/context/AuthContext";

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
  const [openDia, setOpenDia] = useState<{ [key: number]: boolean }>({
    [diaAtual]: mesAtual === mesSelecionado, // O dia atual começa aberto
  });

  const { user } = useAuth();

  const toggleOpen = (dia: number) => {
    setOpenDia((prev) => ({
      ...prev,
      [dia]: !prev[dia], // Alterna apenas os outros dias
    }));
  };

  useEffect(() => {
    async function fetchDados() {
      if (!user) return; // Garante que o usuário esteja autenticado
      
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

  const classSaldo = (saldo: number) => saldo === 0 ? "text-gray-500" : saldo < 0 ? "text-red-500" : "text-green-500";
  
  return (
    <div className="max-w-4xl mx-auto p-4">
      <nav className="mb-5 text-sm border border-gray-300 bg-gray-100 shadow-lg rounded-xl p-4 flex flex-wrap justify-between items-center">
        <div className="flex items-center">
          <Link href="/" className="text-blue-500 hover:underline" title="Voltar para o Início">
            Início
          </Link>
          <span className="mx-2 text-gray-400">/</span>
          <span className="text-gray-500" title="Mês/Ano selecionado">
            {MESES_NOME[mesSelecionado - 1]} ({anoSelecionado})
          </span>
        </div>
      </nav>

      {loading ? (
        <div className="flex justify-center items-center space-x-2">
          <div className="loader me-3"></div>
          <div className="text-lg font-semibold">Carregando dados...</div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-4 gap-2 mb-5">
            {Array.from({ length: totalDiasDoMes }, (_, index) => {
              const dia = index + 1;
              const transacoesDia = transacoesPorDia[dia] || [];

              const saldoDiaInvestimentos = transacoesDia.reduce((total, { valor, tipo }) =>
                total + (tipo === "investimentos" ? Number(valor) : 0), 0);
              const saldoDiaRenda = transacoesDia.reduce((total, { valor, tipo }) =>
                total + (tipo === "renda" ? Number(valor) : 0), 0);
              const saldoDiaDespesa = transacoesDia.reduce((total, { valor, tipo }) =>
                total + (tipo === "despesa" ? Number(valor) : 0), 0);

              const saldoDia = saldoDiaRenda - saldoDiaDespesa;

              return (
                <div key={`${anoSelecionado}-${mes}-${dia}`} title={`${dia}-${mes}-${anoSelecionado}`}>
                  <div 
                    key={dia} 
                    className={`
                      flex flex-col border p-3 rounded-lg shadow-lg bg-white cursor-pointer
                      ${openDia[dia] ? "border-gray-800" : "border-gray-200"}
                    `}
                  >
                    <div className="flex items-center justify-between cursor-pointer" onClick={() => toggleOpen(dia)} >
                      <h1 className="font-semibold text-center text-gray-500">
                        {dia}
                      </h1>
                      <small className={`font-bold ${classSaldo(saldoDia)}`}>
                        {saldoDia < 0 ? <HiOutlineArrowDown className="inline-block mr-1 text-red-500" /> : <HiOutlineArrowUp className="inline-block mr-1 text-green-500" />}
                        {formatCurrency(saldoDia)}
                      </small>
                    </div>
                      
                    {openDia[dia] && (
                      <>
                        <hr className="my-2"/>
                        <div className="flex flex-col">
                          <div className="flex flex-row justify-between items-center">
                            <small className="text-gray-500">Total</small>
                            <small className="font-semibold text-gray-800">{formatCurrency(saldoDia)}</small>
                          </div>
                          <div className="flex flex-row justify-between items-center">
                            <small className="text-gray-500">Renda</small>
                            <small className="font-semibold text-green-500">{formatCurrency(saldoDiaRenda)}</small>
                          </div>
                          <div className="flex flex-row justify-between items-center">
                            <small className="text-gray-500">Despesas</small>
                            <small className="font-semibold text-red-500">{formatCurrency(saldoDiaDespesa)}</small>
                          </div>
                          <div className="flex flex-row justify-between items-center">
                            <small className="text-gray-500">Investimentos</small>
                            <small className="font-semibold text-gray-600">{formatCurrency(saldoDiaInvestimentos)}</small>
                          </div>

                          <Link href={`/${anoSelecionado}/${mes}/${dia}`} className="text-gray-500 flex justify-center items-center border rounded-lg mt-2 p-2 hover:border-gray-400 hover:bg-gray-400 hover:text-white">
                            <small className="font-semibold">Acessar</small>
                          </Link>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
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
    </div>
  );
}
