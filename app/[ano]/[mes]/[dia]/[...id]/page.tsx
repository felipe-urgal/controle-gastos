"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { formatCurrency, MESES_NOME } from "@/app/utils/format";
import { toast } from 'react-toastify';

type Transacao = {
  id: number;
  valor: string; // Alterado de string para number
  valorUnitario: string; // Alterado de string para number
  quantidade: number; // Alterado de string para number
  tipo: "renda" | "despesa" | "investimentos";
  descricao: string;
  dia: string;
  data: string;
};

export default function EditarTransacao() {
  const { id, dia, mes, ano } = useParams();
  const router = useRouter();

  const [form, setForm] = useState<Transacao | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    async function fetchTransacao() {
      if (!id) return;

      setLoading(true);
      try {
        const res = await fetch(`/api/transacoes/${id}`);
        if (!res.ok) throw new Error("Erro ao buscar transação");

        const data = await res.json();
        const valorUnitario = data.valorUnitario ? formatCurrency(data.valorUnitario.toString()) : null

        setForm({
          ...data,
          valor: formatCurrency(data.valor.toString()),
          valorUnitario: valorUnitario,
          quantidade: Number(data.quantidade),
        });
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }

    fetchTransacao();
  }, [id]);

  const formatNumber = (value: string) => {
    const numericValue = value.replace(/\D/g, "");
    const number = parseFloat(numericValue) / 100;

    return isNaN(number)
      ? "R$ 0,00"
      : number.toLocaleString("pt-BR", {
          style: "currency",
          currency: "BRL",
        });
  };

  const handleValorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (form) {
      const rawValue = e.target.value;
      const formattedValue = formatNumber(rawValue);
      setForm({ ...form, valor: formattedValue });
    }
  };

  const handleValorUnitarioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (form) {
      const rawValue = e.target.value;
      const formattedValue = formatNumber(rawValue);
      setForm({ ...form, valorUnitario: formattedValue });
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    if (form) {
      setForm({ ...form, [e.target.name]: e.target.value });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;

    const valorUnitarioNumerico = form.valorUnitario ? parseFloat(
      form.valorUnitario.replace("R$", "").replace(/\./g, "").replace(",", ".")
    ) : 0

    let valorFinal = 0;
    if (form.tipo === "investimentos") {
      const quantidadeNumberico = Number(form.quantidade);
      valorFinal = valorUnitarioNumerico * quantidadeNumberico; // Calcular o valor total
    } else {
      valorFinal = parseFloat(
        form.valor.replace("R$", "").replace(/\./g, "").replace(",", ".")
      );
    }

    const quantidadeNumberico = Number(form.quantidade)

    const payload = {
      valor: valorFinal,
      valorUnitario: valorUnitarioNumerico,
      descricao: form.descricao,
      quantidade: quantidadeNumberico
    };

    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/transacoes/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Erro ao atualizar transação");

      toast.success("Transação atualizada com sucesso!");
      router.push(`/${ano}/${mes}/${dia}`);
    } catch {
      toast.error("Erro ao atualizar transação!");
    } finally {
      setIsSubmitting(false);
    }
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
          onClick={() => router.push(`/${ano}/${mes}`)} 
          className="text-blue-500 hover:underline cursor-pointer"
          title="Mês/Ano selecionado"
        >
          {MESES_NOME[Number(mes) - 1]} ({ano})
        </button>
        <span className="mx-2 text-gray-400">/</span>
        <button
          onClick={() => router.push(`/${ano}/${mes}/${dia}`)} 
          className="text-blue-500 hover:underline cursor-pointer"
          title="Mês/Ano selecionado"
        >
          {dia}
        </button>
        <span className="mx-2 text-gray-400">/</span>
        <span className="text-gray-500" title="Editar Transação">Editar Transação</span>
      </nav>

      {loading ? (
        <div className="flex justify-center items-center space-x-2">
          <div className="loader me-3"></div>
          <div className="text-lg font-semibold">Carregando dados...</div>
        </div>
      ) : form ? (
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
                title="Descrição da Transação"
                required
              />
            </div>
          </div>

          {form && form.tipo === "investimentos" &&
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
                  value={form.quantidade}
                  onChange={handleChange}
                  className="w-full p-3 border border-gray-300 rounded-md text-gray-700"
                  placeholder="Ex: 15"
                  title="Quantidade da Transação"
                  required
                />
              </div>
            </div>
          }

          {form.tipo !== "investimentos" &&
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
            title="Alterar Transação"
          >
            {isSubmitting ? 'Atualizando...' : 'Atualizar'}
          </button>
        </form>
      ) : (
        <p className="text-center text-red-500 font-semibold">⚠️ Transação não encontrada.</p>
      )}
    </div>
  );
}
