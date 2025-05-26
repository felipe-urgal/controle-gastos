"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { toast } from 'react-toastify';
import { useAuth } from "@/app/context/AuthContext";
import Breadcrumb from "@/app/components/Breadcrumb";
import ProtectedRoute from "@/app/components/ProtectedRoute";

interface Categoria {
  id: string;
  nome: string;
}

interface Transacao {
  id: string;
  valor: number;
  valorUnitario: number | null;
  descricao: string;
  quantidade: number | null;
  categoriaId: string | null;
  data: string;
  tipo: string;
  mes: number;
  ano: number;
  userId: string;
}

const EditarTransacao = () => {
  const { user } = useAuth();
  const params = useParams();
  const router = useRouter();

  const mesSelecionado = Number(params.mes);
  const anoSelecionado = Number(params.ano);
  const transacaoId = params.id as string;

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [isLoadingCategorias, setIsLoadingCategorias] = useState<boolean>(true);

  const [form, setForm] = useState({
    valor: "",
    valorUnitario: "",
    descricao: "",
    quantidade: "1",
    categoriaId: "",
    data: new Date(anoSelecionado, mesSelecionado - 1, 1).toLocaleDateString('en-CA'),
    tipo: "despesa"
  });

  // Carrega a transação e as categorias
  useEffect(() => {
    if (user?.id) {
      const carregarDados = async () => {
        try {
          setIsLoading(true);
          
          // Carrega categorias
          const categoriasResponse = await fetch(`/api/categorias/todas?userId=${user.id}`);
          if (!categoriasResponse.ok) throw new Error('Erro ao carregar categorias');
          const categoriasData = await categoriasResponse.json();
          setCategorias(categoriasData.categorias || []);
          
          // Carrega transação
          const transacaoResponse = await fetch(`/api/transacoes/${transacaoId}`);
          if (!transacaoResponse.ok) throw new Error('Transação não encontrada');
          const transacao: Transacao = await transacaoResponse.json();
          
          // Formata os valores para o formulário
          const formatCurrencyValue = (value: number) => {
            return new Intl.NumberFormat("pt-BR", {
              style: "currency",
              currency: "BRL",
            }).format(value);
          };

          setForm({
            valor: transacao.tipo === "investimentos" ? "" : formatCurrencyValue(transacao.valor),
            valorUnitario: transacao.tipo === "investimentos" && transacao.valorUnitario 
              ? formatCurrencyValue(transacao.valorUnitario) 
              : "",
            descricao: transacao.descricao,
            quantidade: transacao.tipo === "investimentos" && transacao.quantidade 
              ? transacao.quantidade.toString() 
              : "1",
            categoriaId: transacao.categoriaId || "",
            data: new Date(transacao.data).toLocaleDateString('en-CA'),
            tipo: transacao.tipo
          });
          
        } catch (error) {
          toast.error((error as Error).message);
          router.push(`/dashboard/${anoSelecionado}/${mesSelecionado}`);
        } finally {
          setIsLoading(false);
          setIsLoadingCategorias(false);
        }
      };
      
      carregarDados();
    }
  }, [user, transacaoId, router, anoSelecionado, mesSelecionado]);

  // Função para formatar valores monetários (igual ao seu componente)
  const formatCurrency = (value: string) => {
    const numericValue = value.replace(/\D/g, "");
    const floatValue = (parseInt(numericValue || "0") / 100).toFixed(2);
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(parseFloat(floatValue));
  };

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

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;

    if (name === 'data') {
      setForm(prev => ({ ...prev, [name]: value }));
      return;
    }

    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error("Usuário não autenticado.");
      return;
    }

    // Converte os valores monetários para número (igual ao seu componente)
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
      id: transacaoId,
      valor: valorFinal,
      valorUnitario: form.tipo === "investimentos" ? valorUnitarioNumerico : undefined,
      tipo: form.tipo,
      descricao: form.descricao,
      data: new Date(`${mesSelecionado}/${form.data.split('-')[2]}/${anoSelecionado}`),
      userId: user.id,
      quantidade: form.tipo === "investimentos" ? Number(form.quantidade) : undefined,
      categoriaId: form.categoriaId || null
    };

    console.log("payload: ", payload)

    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/transacoes`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        toast.success("Transação atualizada com sucesso!");
        router.push(`/dashboard/${anoSelecionado}/${mesSelecionado}`);
      } else {
        throw new Error(await res.text());
      }
    } catch (error) {
      toast.error("Erro ao atualizar transação.");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const calcularValorFinal = () => {
    if (form.tipo === "investimentos") {
      const quantidadeNumerica = Number(form.quantidade) || 1;
      const valorUnitarioNumerico = parseFloat(
        form.valorUnitario.replace("R$", "").replace(/\./g, "").replace(",", ".") || "0"
      );
      return (quantidadeNumerica * valorUnitarioNumerico).toFixed(2);
    }
    return form.valor.replace("R$", "").replace(/\./g, "").replace(",", ".") || "0";
  };

  if (isLoading) {
    return (
      <ProtectedRoute>
        <div className="max-w-6xl mx-auto p-4">
          <Breadcrumb 
            anoSelecionado={anoSelecionado}
            mesSelecionado={mesSelecionado}
            showMonthLink={true}
            showMonthLink2={true}
            newLink={true}
          />
          <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200 text-center">
            <p>Carregando transação...</p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="max-w-6xl mx-auto p-4">
        <Breadcrumb 
          anoSelecionado={anoSelecionado}
          mesSelecionado={mesSelecionado}
          showMonthLink={true}
          showMonthLink2={true}
          newLink={true}
        />

        <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-lg shadow-md border border-gray-200">
          {/* Campo Tipo */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Tipo *</label>
            <select
              name="tipo"
              value={form.tipo}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            >
              <option value="despesa">Despesa</option>
              <option value="renda">Renda</option>
              <option value="investimentos">Investimento</option>
            </select>
          </div>

          {/* Campo Data */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Data *</label>
            <input
              type="date"
              name="data"
              value={form.data}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
              min={new Date(anoSelecionado, mesSelecionado - 1, 1).toLocaleDateString('en-CA')}
              max={new Date(anoSelecionado, mesSelecionado, 0).toLocaleDateString('en-CA')}
            />
          </div>

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
              value={form.categoriaId}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={isLoadingCategorias}
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
                  {formatCurrency(calcularValorFinal())}
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
              onClick={() => router.push(`/dashboard/${anoSelecionado}/${mesSelecionado}`)}
              disabled={isSubmitting}
              className="w-30 p-2 rounded-md border border-gray-300 bg-white text-gray-700 font-small hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
            >
              Cancelar
            </button>

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
                'Atualizar Transação'
              )}
            </button>
          </div>
        </form>
      </div>
    </ProtectedRoute>
  );
};

export default EditarTransacao;