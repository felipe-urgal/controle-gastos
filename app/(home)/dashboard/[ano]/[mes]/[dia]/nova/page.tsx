"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter, useParams } from "next/navigation";
import { toast } from 'react-toastify';
import { useAuth } from "@/app/context/AuthContext";
import Breadcrumb from "@/app/components/Breadcrumb"; // Ajuste o caminho conforme sua estrutura

const NovaTransacao = () => {
  const { user } = useAuth();
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const tipo = searchParams.get("tipo") as "renda" | "despesa" | "investimentos";
  const tiposTitulos = {
    renda: "Nova Renda",
    despesa: "Nova Despesa",
    investimentos: "Novo Investimento"
  };

  const mesSelecionado = Number(params.mes);
  const anoSelecionado = Number(params.ano);
  const diaSelecionado = Number(params.dia);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const [form, setForm] = useState({
    valor: "",
    valorUnitario: "",
    descricao: "",
    quantidade: "1", // Valor padrão 1 para investimentos
  });

  // Função para formatar valores monetários
  const formatCurrency = (value: string) => {
    const numericValue = value.replace(/\D/g, "");
    const floatValue = (parseInt(numericValue || "0") / 100).toFixed(2);
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(parseFloat(floatValue));
  };

  // Atualiza o valor no formato de moeda
  const handleValorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    const formattedValue = formatCurrency(rawValue);
    setForm(prev => ({ ...prev, valor: formattedValue }));
  };

  const handleValorUnitarioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    const formattedValue = formatCurrency(rawValue);
    setForm(prev => ({ ...prev, valorUnitario: formattedValue }));
  };

  // Atualiza o estado do formulário
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  // Função para enviar os dados do formulário
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error("Usuário não autenticado.");
      return;
    }

    // Converte os valores monetários para número
    const parseCurrency = (value: string) => 
      parseFloat(value.replace("R$", "").replace(/\./g, "").replace(",", ".")) || 0;

    let valorFinal = 0;
    let valorUnitarioNumerico = 0;

    if (tipo === "investimentos") {
      valorUnitarioNumerico = parseCurrency(form.valorUnitario);
      const quantidadeNumerica = Number(form.quantidade) || 1;
      valorFinal = valorUnitarioNumerico * quantidadeNumerica;
    } else {
      valorFinal = parseCurrency(form.valor);
    }

    // Criando a data no formato YYYY-MM-DD
    const dataCompleta = `${anoSelecionado}-${String(mesSelecionado).padStart(2, "0")}-${String(diaSelecionado).padStart(2, "0")}`;

    const payload = {
      valor: valorFinal,
      valorUnitario: tipo === "investimentos" ? valorUnitarioNumerico : undefined,
      mes: mesSelecionado,
      ano: anoSelecionado,
      tipo: tipo,
      descricao: form.descricao,
      data: dataCompleta,
      userId: user.id,
      quantidade: tipo === "investimentos" ? Number(form.quantidade) : undefined,
    };

    setIsSubmitting(true);

    try {
      const res = await fetch("/api/transacoes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        toast.success("Transação criada com sucesso!");
        router.push(`/dashboard/${anoSelecionado}/${mesSelecionado}/${diaSelecionado}`);
      } else {
        throw new Error(await res.text());
      }
    } catch (error) {
      toast.error("Erro ao criar transação.");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calcular o valor final automaticamente para investimentos
  const calcularValorFinal = () => {
    if (tipo === "investimentos") {
      const quantidadeNumerica = Number(form.quantidade) || 1;
      const valorUnitarioNumerico = parseFloat(
        form.valorUnitario.replace("R$", "").replace(/\./g, "").replace(",", ".") || "0"
      );
      return (quantidadeNumerica * valorUnitarioNumerico).toFixed(2);
    }
    return form.valor.replace("R$", "").replace(/\./g, "").replace(",", ".") || "0";
  };

  return (
    <div className="max-w-6xl mx-auto p-4">
      {/* Breadcrumb padronizado */}
      <Breadcrumb 
        anoSelecionado={anoSelecionado}
        mesSelecionado={mesSelecionado}
        diaSelecionado={diaSelecionado}
        showMonthLink={true}
        showMonthLink2={true}
        newLink={true}
      />

      <h1 className="text-2xl font-bold text-gray-800 mb-6">
        {tiposTitulos[tipo] || "Nova Transação"}
      </h1>

      <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-lg shadow-md border border-gray-200">
        {/* Campo Descrição */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Descrição *</label>
          <input
            type="text"
            name="descricao"
            value={form.descricao}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Ex: Salário, Aluguel, Ações PETR4"
            required
            autoFocus
          />
        </div>

        {/* Campos específicos para Investimentos */}
        {tipo === "investimentos" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Valor Unitário *</label>
              <input
                type="text"
                value={form.valorUnitario}
                onChange={handleValorUnitarioChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="R$ 0,00"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Quantidade *</label>
              <input
                type="number"
                name="quantidade"
                min="1"
                step="1"
                value={form.quantidade}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Valor Total</label>
              <div className="w-full px-4 py-2 border border-gray-300 rounded-md bg-gray-50">
                {formatCurrency(calcularValorFinal())}
              </div>
            </div>
          </div>
        )}

        {/* Campo Valor para Renda/Despesa */}
        {tipo !== "investimentos" && (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Valor *</label>
            <input
              type="text"
              value={form.valor}
              onChange={handleValorChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="R$ 0,00"
              required
            />
          </div>
        )}

        {/* Botões de Ação */}
        <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-between">
          {/* Botão Cancelar */}
          <button
            type="button"
            onClick={() => router.push(`/dashboard/${anoSelecionado}/${mesSelecionado}/${diaSelecionado}`)}
            disabled={isSubmitting}
            className="w-30 p-2 rounded-md border border-gray-300 bg-white text-gray-700 font-small hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
          >
            Cancelar
          </button>

          {/* Botão Salvar */}
          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-40 py-3 px-4 rounded-md text-white font-medium transition-colors ${
              isSubmitting 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-blue-600 hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
            }`}
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Salvando...
              </span>
            ) : (
              'Salvar Transação'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default NovaTransacao;