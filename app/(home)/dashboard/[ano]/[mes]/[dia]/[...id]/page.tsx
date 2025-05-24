"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { formatCurrency } from "@/app/utils/format";
import { toast } from 'react-toastify';
import Breadcrumb from "@/app/components/Breadcrumb";
import ProtectedRoute from "@/app/components/ProtectedRoute";
import { useAuth } from "@/app/context/AuthContext";

type Transacao = {
  id: number;
  valor: string;
  valorUnitario: string;
  quantidade: number;
  tipo: "renda" | "despesa" | "investimentos";
  descricao: string;
  dia: string;
  data: string;
  categoriaId?: string;
  categoriaNome?: string;
};

interface Categoria {
  id: string;
  nome: string;
}

export default function EditarTransacao() {
  const { id, dia, mes, ano } = useParams();
  const router = useRouter();
  const { user } = useAuth();

  const [form, setForm] = useState<Transacao | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [categorias, setCategorias] = useState<Categoria[]>([]);

  useEffect(() => {
    async function fetchTransacao() {
      if (!id || !user?.id) return;

      setLoading(true);
      try {
        // Busca a transação
        const res = await fetch(`/api/transacoes/${id}`);
        if (!res.ok) throw new Error("Erro ao buscar transação");

        const data = await res.json();
        const valorUnitario = data.valorUnitario ? formatCurrency(data.valorUnitario.toString()) : "R$ 0,00";

        // Busca as categorias disponíveis
        const categoriasRes = await fetch(`/api/categorias/todas?userId=${user.id}`);
        const categoriasData = await categoriasRes.json();

        setForm({
          ...data,
          valor: formatCurrency(data.valor.toString()),
          valorUnitario: valorUnitario,
          quantidade: Number(data.quantidade) || 1,
          categoriaNome: categoriasData.categorias?.find((cat: Categoria) => cat.id === data.categoriaId)?.nome || 'Sem categoria'
        });
      } catch (error) {
        console.error(error);
        toast.error("Erro ao carregar transação");
      } finally {
        setLoading(false);
      }
    }

    fetchTransacao();
  }, [id, user?.id]);

  useEffect(() => {
    async function fetchCategorias() {
      if (!user?.id) return;
      
      try {
        const response = await fetch(`/api/categorias/todas?userId=${user.id}`);
        const data = await response.json();
        setCategorias(Array.isArray(data.categorias) ? data.categorias : []);
      } catch (error) {
        console.error("Erro ao carregar categorias:", error);
      }
    }
    
    fetchCategorias();
  }, [user?.id]);

  const handleCategoriaChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (form) {
      setForm({ 
        ...form, 
        categoriaId: e.target.value,
        categoriaNome: categorias.find(cat => cat.id === e.target.value)?.nome || 'Sem categoria'
      });
    }
  };

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

    const parseCurrency = (value: string) => 
      parseFloat(value.replace("R$", "").replace(/\./g, "").replace(",", ".")) || 0;

    let valorFinal = 0;
    let valorUnitarioNumerico = 0;

    if (form.tipo === "investimentos") {
      valorUnitarioNumerico = parseCurrency(form.valorUnitario);
      const quantidadeNumerica = Number(form.quantidade) || 1;
      valorFinal = valorUnitarioNumerico * quantidadeNumerica;
    } else {
      valorFinal = parseCurrency(form.valor);
    }

    const payload = {
      valor: valorFinal,
      valorUnitario: form.tipo === "investimentos" ? valorUnitarioNumerico : undefined,
      descricao: form.descricao,
      quantidade: form.tipo === "investimentos" ? Number(form.quantidade) : undefined,
      categoriaId: form.categoriaId || null // Adicione esta linha
    };

    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/transacoes/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error(await res.text());

      toast.success("Transação atualizada com sucesso!");
      router.push(`/dashboard/${ano}/${mes}/${dia}`);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao atualizar transação!");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ProtectedRoute>
      <div className="max-w-6xl mx-auto p-4">
        {/* Breadcrumb padronizado */}
        <Breadcrumb 
          anoSelecionado={Number(ano)}
          mesSelecionado={Number(mes)}
          diaSelecionado={Number(dia)}
          showMonthLink={true}
          showMonthLink2={true}
          editLink={true}
        />

        {/* Cabeçalho */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            {form?.tipo === "renda" && "Editar Renda"}
            {form?.tipo === "despesa" && "Editar Despesa"}
            {form?.tipo === "investimentos" && "Editar Investimento"}
          </h1>
        </div>

        {loading ? (
          <div className="flex justify-center items-center space-x-2 py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <span className="text-lg font-medium text-gray-600">Carregando transação...</span>
          </div>
        ) : form ? (
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

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Categoria</label>
              <select
                name="categoriaId"
                value={form.categoriaId || ''}
                onChange={handleCategoriaChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
              >
                <option value="">Selecione uma categoria</option>
                {categorias.map((categoria) => (
                  <option key={categoria.id} value={categoria.id}>
                    {categoria.nome}
                  </option>
                ))}
              </select>
            </div>

            {/* Campos específicos para Investimentos */}
            {form.tipo === "investimentos" && (
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
                    {form.valor}
                  </div>
                </div>
              </div>
            )}

            {/* Campo Valor para Renda/Despesa */}
            {form.tipo !== "investimentos" && (
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
              <button
                type="button"
                onClick={() => router.push(`/dashboard/${ano}/${mes}/${dia}`)}
                disabled={isSubmitting}
                className="w-30 py-3 px-4 rounded-md border border-gray-300 bg-white text-gray-700 font-medium hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
              >
                Cancelar
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className={`w-45 py-3 px-4 rounded-md text-white font-medium transition-colors ${
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
                    Atualizando...
                  </span>
                ) : (
                  'Atualizar Transação'
                )}
              </button>
            </div>
          </form>
        ) : (
          <div className="text-center py-8 bg-white rounded-lg shadow-md border border-gray-200">
            <div className="text-red-500 font-semibold text-lg mb-2">⚠️ Transação não encontrada</div>
            <button
              onClick={() => router.push(`/dashboard/${ano}/${mes}/${dia}`)}
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              Voltar para a lista de transações
            </button>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}