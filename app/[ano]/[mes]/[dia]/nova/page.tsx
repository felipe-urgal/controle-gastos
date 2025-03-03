"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation"; // Importando o hook correto
import { useRouter, useParams } from "next/navigation";
import { MESES_NOME } from "@/app/utils/format";
import { toast } from 'react-toastify';
import { useAuth } from "@/app/context/AuthContext";

const NovaTransacao = () => {
  const { user } = useAuth();
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const tipo = searchParams.get("tipo");

  const mesSelecionado = Number(params.mes);
  const anoSelecionado = Number(params.ano);
  const diaSelecionado = Number(params.dia);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const [form, setForm] = useState({
    valor: "",
    valorUnitario: "",
    descricao: "",
    quantidade: "",
  });

  // Função para formatar valores monetários
  const formatCurrency = (value: string) => {
    const numericValue = value.replace(/\D/g, "");
    const floatValue = (parseInt(numericValue) / 100).toFixed(2);
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

  // Atualiza o estado do formulário de acordo com o campo alterado
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  // Função para enviar os dados do formulário
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Converte os valores monetários para número
    const valorUnitarioNumerico = parseFloat(
      form.valorUnitario.replace("R$", "").replace(/\./g, "").replace(",", ".")
    );

    // Calcular valor automaticamente para "investimentos"
    let valorFinal = 0;
    if (tipo === "investimentos") {
      const quantidadeNumberico = Number(form.quantidade);
      valorFinal = valorUnitarioNumerico * quantidadeNumberico; // Calcular o valor total
    } else {
      valorFinal = parseFloat(
        form.valor.replace("R$", "").replace(/\./g, "").replace(",", ".")
      );
    }

    // Criando a data no formato YYYY-MM-DD
    const dataCompleta = `${anoSelecionado}-${String(mesSelecionado).padStart(2, "0")}-${String(diaSelecionado).padStart(2, "0")}`;

    if (!user) {
      toast.error("Usuário não autenticado.");
      return;
    }

    const payload = {
      valor: valorFinal, // Usar o valor calculado
      valorUnitario: valorUnitarioNumerico,
      mes: mesSelecionado,
      ano: anoSelecionado,
      tipo: tipo,
      descricao: form.descricao,
      data: dataCompleta,
      userId: user.id,
      quantidade: tipo === "investimentos" ? Number(form.quantidade) : undefined, // Incluir quantidade apenas para "investimentos"
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
        router.push(`/${anoSelecionado}/${mesSelecionado}/${diaSelecionado}`);
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

  // Calcular o valor final automaticamente quando for do tipo "investimentos"
  const calcularValorFinal = () => {
    if (tipo === "investimentos") {
      const quantidadeNumberico = Number(form.quantidade);
      const valorUnitarioNumerico = parseFloat(
        form.valorUnitario.replace("R$", "").replace(/\./g, "").replace(",", ".")
      );
      return (quantidadeNumberico * valorUnitarioNumerico).toFixed(2);
    }
    return form.valor.replace("R$", "").replace(/\./g, "").replace(",", ".");
  };

  return (
    <div className="max-w-4xl mx-auto p-4">
      <nav className="mb-5 text-sm border border-gray-300 bg-gray-100 shadow-lg rounded-xl p-4">
        <button
          onClick={() => router.push("/")}
          className="text-blue-500 hover:underline cursor-pointer"
          title="Voltar para o Início"
        >
          Início
        </button>
        <span className="mx-2 text-gray-400">/</span>
        <button
          onClick={() => router.push(`/${anoSelecionado}/${mesSelecionado}`)} 
          className="text-blue-500 hover:underline cursor-pointer"
          title="Mês/Ano selecionado"
        >
          {MESES_NOME[Number(mesSelecionado) - 1]} ({anoSelecionado})
        </button>
        <span className="mx-2 text-gray-400">/</span>
        <button
          onClick={() => router.push(`/${anoSelecionado}/${mesSelecionado}/${diaSelecionado}`)} 
          className="text-blue-500 hover:underline cursor-pointer"
          title="Mês/Ano selecionado"
        >
          {diaSelecionado}
        </button>
        <span className="mx-2 text-gray-400">/</span>
        <span className="text-gray-500" title="Nova Transação">Nova Transação</span>
      </nav>

      <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-lg shadow-lg border">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="w-full">
            <label className="text-gray-700 block font-semibold">Descrição</label>
            <input
              type="text"
              name="descricao"
              value={form.descricao}
              onChange={handleChange}
              className="w-full p-3 border border-gray-300 rounded-md text-gray-700"
              placeholder="Ex: salário"
              required
              title="Descrição da Transação"
            />
          </div>
        </div>

        {tipo === "investimentos" &&
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="w-full">
              <label className="text-gray-700 block font-semibold">Valor Unitario</label>
              <input
                type="text"
                value={form.valorUnitario}
                onChange={handleValorUnitarioChange}
                className="w-full p-3 border border-gray-300 rounded-md text-gray-700"
                placeholder="R$ 0,00"
                title="Valor Unitario da Transação"
                required
              />
            </div>

            <div className="w-full">
              <label className="text-gray-700 block font-semibold">Quantidade</label>
              <input
                type="number"
                name="quantidade"
                min="1"
                value={form.quantidade}
                onChange={handleChange}
                className="w-full p-3 border border-gray-300 rounded-md text-gray-700"
                placeholder="Ex: 15"
                title="Quantidade da Transação"
                required
              />
            </div>

            {form.valorUnitario && form.quantidade &&
              <div className="w-full">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="w-full">
                    <label className="text-gray-700 block font-semibold mb-3">Valor</label>
                    <label
                      className="w-full p-3 border border-gray-300 rounded-md text-gray-700"
                    >
                      {formatCurrency(calcularValorFinal())}
                    </label>
                  </div>
                </div>
              </div>
            }
          </div>
        }

        {tipo !== "investimentos" &&
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="w-full">
              <label className="text-gray-700 block font-semibold">Valor</label>
              <input
                type="text"
                value={form.valor}
                onChange={handleValorChange}
                className="w-full p-3 border border-gray-300 rounded-md text-gray-700"
                placeholder="R$ 0,00"
                title="Valor da Transação"
                required
              />
            </div>
          </div>
        }

        <button
            type="submit"
            className={`cursor-pointer w-full p-3 rounded-md text-white ${isSubmitting ? 'bg-gray-500' : 'bg-blue-600 hover:bg-blue-700'} focus:outline-none`}
            disabled={isSubmitting}
            title="Salvar Transação"
          >
            {isSubmitting ? 'Salvando...' : 'Salvar'}
          </button>
      </form>
    </div>
  );
};

export default NovaTransacao;
