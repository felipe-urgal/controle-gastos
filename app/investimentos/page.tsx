"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import Link from "next/link";
import { formatCurrency } from "@/app/utils/format";
import { fetchTransacoes, Transacao } from "@/app/services/transacoesService";
import { HiOutlineHashtag, HiOutlineCash, HiOutlineCurrencyDollar } from "react-icons/hi";
import { useAuth } from "@/app/context/AuthContext";

type CotacoesType = {
  [key: string]: number; // Exemplo: { 'KNRI11': 123.45 }
};

export default function Investimentos() {
  const [saldoInvestimentoTotal, setSaldoInvestimentoTotal] = useState(0);
  const [investimentos, setInvestimentos] = useState<Transacao[]>([]);
  const [names, setNames] = useState<string[]>([]);
  const [cotacoes, setCotacoes] = useState<CotacoesType>({});
  const [loading, setLoading] = useState(true);

  const { user } = useAuth();
  
  useEffect(() => {
    async function fetchDados() {
      if (!user) return; // Garante que o usuário esteja autenticado

      setLoading(true);

      try {
        const transacoes = await fetchTransacoes(user.id);

        const investimentosFilter = transacoes.filter(
          ({ tipo }) => tipo === "investimentos"
        );

        const uniqueNames = [...new Set(investimentosFilter.map(({ descricao }) => descricao))];

        const saldoInvestimentos = investimentosFilter.reduce(
          (total, { valor }) => total + Number(valor),
          0
        );

        setSaldoInvestimentoTotal(saldoInvestimentos);
        setNames(uniqueNames);
        setInvestimentos(investimentosFilter);

        // Buscar cotações após pegar os nomes
        await fetchCotacoes(uniqueNames);

      } catch (error) {
        console.error("Erro ao carregar os dados:", error);
        alert("Houve um erro ao carregar os dados. Tente novamente mais tarde.");
      } finally {
        setLoading(false);
      }
    }

    async function fetchCotacoes(names: string[]) {
      try {
        // Passando os tickers como parâmetros de consulta
        const response = await axios.get("/api/cotacoes", {
          params: { tickers: names.join(",") } // Passando os tickers no formato 'MXRF11,KNRI11'
        });

        const data = response.data.cotacoes;

        if (!data) {
          throw new Error("Erro ao obter cotações.");
        }

        const cotacoesAtualizadas: CotacoesType = {};

        Object.entries(data).forEach(([ticker, preco]) => {
          if (typeof preco === 'string') {
            cotacoesAtualizadas[ticker] = parseFloat(preco); // Convertendo para número
          } else {
            // Tratar o caso quando preco não for uma string, se necessário
            console.error(`O valor para ${ticker} não é uma string:`, preco);
          }
        });

        // Atualizando o estado com as cotações
        setCotacoes(cotacoesAtualizadas);

      } catch (error) {
        console.error("Erro ao buscar cotações:", error);
      }
    }

    fetchDados();
  }, [user]);

  return (
    <div className="max-w-4xl mx-auto p-4">
      <nav className="mb-5 text-sm border border-gray-300 bg-gray-100 shadow-lg rounded-xl p-4">
        <Link href="/" className="text-blue-500 hover:underline me-4" title="Voltar para o Início">
          Início
        </Link>
        <span className="text-gray-500" title="Investimentos">Investimentos</span>
      </nav>

      {loading ? (
        <div className="flex justify-center items-center space-x-2">
          <div className="loader me-3"></div>
          <div className="text-lg font-semibold">Carregando dados...</div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {names.map((name, index) => {
              const investimentosFiltrados = investimentos.filter(
                ({ descricao }) => descricao === name
              );

              const totalPorInvestimento = investimentosFiltrados.reduce(
                (total, { valor }) => total + Number(valor),
                0
              );

              const quantidadePorInvestimento = investimentosFiltrados.reduce(
                (total, { quantidade }) => total + Number(quantidade),
                0
              );

              const precoMedioPorInvestimento =
                quantidadePorInvestimento > 0
                  ? totalPorInvestimento / quantidadePorInvestimento
                  : 0;

              const cotacaoAtual = cotacoes[name] || 0;

              return (
                <div
                  title={name}
                  key={index}
                  className="border border-gray-300 bg-white shadow-md rounded-xl p-4 flex flex-col items-center text-center space-y-4"
                >
                  <small className="text-gray-800 font-semibold mb-2">{name}</small>

                  <div className="border-b border-gray-300 w-full mb-4"></div>

                  <div className="grid grid-row-1 sm:grid-row-4 gap-3 w-full text-start">

                    <div className="flex flex-row items-center p-2 rounded-xl border border-gray-300">
                      <div className="flex items-center justify-center">
                        <HiOutlineHashtag className="text-gray-600 me-2" />
                        <small className="text-gray-700 font-bold">{quantidadePorInvestimento}</small>
                      </div>
                    </div>

                    <div className="flex flex-row items-center p-2 rounded-xl border border-gray-300">
                      <div className="flex items-center justify-center">
                        <HiOutlineCash className="text-gray-600 me-2" />
                        <small className="text-gray-700 font-bold">
                          {formatCurrency(precoMedioPorInvestimento)}
                        </small>
                      </div>
                    </div>

                    <div className="flex flex-row items-center p-2 rounded-xl border border-gray-300">
                      <div className="flex items-center justify-center">
                        <HiOutlineCurrencyDollar className="text-gray-600 me-2" />
                        <small className="text-gray-700 font-bold">
                          {formatCurrency(totalPorInvestimento)}
                        </small>
                      </div>
                    </div>

                    <div className="border-b border-gray-300 w-full"></div>

                    <div className="flex flex-row items-center p-2 rounded-xl border border-gray-300 bg-yellow-50">
                      <div className="flex items-center justify-center">
                        <HiOutlineCurrencyDollar className="text-yellow-600 me-2" />
                        <small className="text-yellow-700 font-bold">
                          {formatCurrency(cotacaoAtual)}
                        </small>
                      </div>
                    </div>

                    {/* Novo item de Lucro/Prejuízo */}
                    <div
                      className={`flex flex-row items-center p-2 rounded-xl border ${
                        (cotacaoAtual - precoMedioPorInvestimento) * quantidadePorInvestimento >= 0
                          ? "border-green-300 bg-green-50"
                          : "border-red-300 bg-red-50"
                      }`}
                    >
                      <div className="flex items-center justify-center">
                        <HiOutlineCurrencyDollar
                          className={`me-2 ${
                            (cotacaoAtual - precoMedioPorInvestimento) * quantidadePorInvestimento >= 0
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        />
                        <small
                          className={`font-bold ${
                            (cotacaoAtual - precoMedioPorInvestimento) * quantidadePorInvestimento >= 0
                              ? "text-green-700"
                              : "text-red-700"
                          }`}
                        >
                          {formatCurrency(
                            (cotacaoAtual - precoMedioPorInvestimento) * quantidadePorInvestimento
                          )}
                        </small>
                      </div>
                    </div>

                    <div className="border-b border-gray-300 w-full"></div>

                    <div className="flex items-center justify-center text-gray-500">
                      <HiOutlineCurrencyDollar className="me-2"/>
                      <small className="font-bold">
                        {formatCurrency(quantidadePorInvestimento * cotacaoAtual)}
                      </small>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center mt-5 border border-gray-300 bg-gray-100 shadow-lg rounded-xl p-4">
            <div className="flex items-center">
              <h5 className="font-semibold text-gray-500" title="Total investido">
                Investimentos: {formatCurrency(saldoInvestimentoTotal)}
              </h5>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
