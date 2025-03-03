"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { formatCurrency } from "@/app/utils/format";
import { fetchTransacoes } from "@/app/services/transacoesService";
import { processarTransacoes } from "@/app/utils/processarTransacoes";
import { HiOutlineArrowUp, HiOutlineArrowDown } from "react-icons/hi";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";

type MesResumo = {
  mes: number;
  saldo: number;
  renda: number;
  despesas: number;
  investimentos: number;
  name: string;
};

export default function Home() {
  const [saldoTotal, setSaldoTotal] = useState(0);
  const [investimentoTotal, setInvestimentoTotal] = useState(0);
  // const [saldoInvestimentoTotal, setSaldoInvestimentoTotal] = useState(0);
  const [meses, setMeses] = useState<MesResumo[]>([]);
  const [loading, setLoading] = useState(true);
  const anoAtual = new Date().getFullYear();
  const [anoSelecionado, setAnoSelecionado] = useState<number>(anoAtual);
  const mesAtual = new Date().getMonth() + 1;
  const [openMeses, setOpenMeses] = useState<{ [key: number]: boolean }>({
    [mesAtual]: Number(anoAtual) === Number(anoSelecionado), // Garante que o mês atual começa aberto
  });

  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user === null) {
      router.push("/login");
    }
  }, [user, router]);

  const toggleOpen = (mes: number) => {
    if (mes === mesAtual && Number(anoAtual) === Number(anoSelecionado)) return;

    setOpenMeses((prev) => ({
      ...prev,
      [mes]: !prev[mes], 
    }));
  };

  useEffect(() => {
    setOpenMeses({
      [mesAtual]: anoAtual === anoSelecionado,
    });
  }, [anoSelecionado, anoAtual, mesAtual]);

  useEffect(() => {
    async function fetchDados() {
      setLoading(true);

      try {
        const transacoes = await fetchTransacoes();
        const { mesesData, saldoAnual, investimentoAnual } = processarTransacoes(transacoes, Number(anoSelecionado));

        // let saldoInvestimentos = 0;

        // transacoes.forEach(({ valor, tipo }) => {
        //   if (tipo === "investimentos") {
        //     saldoInvestimentos += Number(valor);
        //   }
        // });

        setMeses(mesesData);
        setSaldoTotal(saldoAnual);
        setInvestimentoTotal(investimentoAnual);
        // setSaldoInvestimentoTotal(saldoInvestimentos);
      } catch (error) {
        console.error("Erro ao carregar os dados:", error);
        alert("Houve um erro ao carregar os dados. Tente novamente mais tarde.");
      } finally {
        setLoading(false);
      }
    }

    fetchDados();
  }, [anoSelecionado]);

  const handleAno = useCallback((value: number) => {
    setAnoSelecionado(value);
  }, []);

  const classSaldo = (saldo: number) => {
    if (saldo === 0) return "text-gray-500";
    return saldo < 0 ? "text-red-500" : "text-green-500";
  };

  return (
    <div className="max-w-4xl mx-auto p-4">
      <nav className="mb-5 text-sm border border-gray-300 bg-gray-100 shadow-lg rounded-xl p-4">
        <span className="text-gray-500 me-4" title="Início">Início</span>
        <Link href="/investimentos" className="text-blue-500 hover:underline" title="Ir para Investimentos">
          Investimentos
        </Link>
      </nav>

      <div className="flex items-center justify-between mb-5">
        <label htmlFor="ano" className="block font-semibold" title="Selecione um Ano para filtrar">Selecione o Ano:</label>
        <select
          id="ano"
          value={anoSelecionado}
          onChange={(e) => handleAno(Number(e.target.value))}
          className="p-2 border rounded-lg shadow-md"
          title="Ano Selecionado"
        >
          {Array.from({ length: 3 }).map((_, index) => {
            const ano = new Date().getFullYear() - index;
            return <option key={ano} value={ano}>{ano}</option>;
          })}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center items-center space-x-2">
          <div className="loader me-3"></div>
          <div className="text-lg font-semibold">Carregando dados...</div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {meses.map(({ mes, saldo, renda, despesas, investimentos, name }) => (
              <div key={`${anoSelecionado}-${mes}`} title={name}>
                <div 
                  className={`
                    bg-gray-100 border shadow-lg p-4 rounded-lg transition
                    ${openMeses[mes] ? "border-gray-800" : "border-gray-200"}
                  `}>
                  <div className="flex items-center justify-between cursor-pointer" onClick={() => toggleOpen(mes)} >
                    <h1 className="font-semibold text-gray-500">{name}</h1>
                    <small className={`font-bold ${classSaldo(saldo)}`}>
                      {saldo < 0 ? <HiOutlineArrowDown className="inline-block mr-1 text-red-500" /> : <HiOutlineArrowUp className="inline-block mr-1 text-green-500" />}
                      {formatCurrency(saldo)}
                    </small>
                  </div>

                  {openMeses[mes] && (
                    <>
                      <div className="border mb-4 border-gray-300"></div>
                      <div className="flex-row justify-between items-center">
                        <div className="flex justify-between items-center">
                          <small className="text-gray-500 font-semibold">Renda</small>
                          <small className="text-green-600 font-bold">{formatCurrency(renda)}</small>
                        </div>

                        <div className="flex justify-between items-center">
                          <small className="text-gray-500 font-semibold">Despesas</small>
                          <small className="text-red-600 font-bold">{formatCurrency(despesas)}</small>
                        </div>

                        <div className="flex justify-between items-center">
                          <small className="text-gray-500 font-semibold">Investimentos</small>
                          <small className="text-gray-600 font-bold">{formatCurrency(investimentos)}</small>
                        </div>

                        <Link href={`/${anoSelecionado}/${mes}`} className="text-gray-500 flex justify-center items-center border rounded-lg mt-2 p-2 hover:border-gray-400 hover:bg-gray-400 hover:text-white">
                          <small className="font-semibold">Acessar</small>
                        </Link>
                      </div>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center mt-5 border border-gray-300 bg-gray-100 shadow-lg rounded-xl p-4">
            <div className="flex items-center">
              <h5 className={` font-semibold ${classSaldo(saldoTotal)}`} title="Saldo total do ano">
                Saldo Total ({anoSelecionado}): {formatCurrency(saldoTotal)}
              </h5>
            </div>

            <div className="flex items-center">
              <h5 className=" font-semibold text-gray-500" title="total de investimentos">
                Investimentos: {formatCurrency(investimentoTotal)}
              </h5>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
