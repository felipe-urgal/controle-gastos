"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from 'react-toastify';
import { useAuth } from "@/app/context/AuthContext";
import TransactionTypeField from "./TransactionFields/TransactionTypeField";
import TransactionDateField from "./TransactionFields/TransactionDateField";
import TransactionDescriptionField from "./TransactionFields/TransactionDescriptionField";
import TransactionCategoryField from "./TransactionFields/TransactionCategoryField";
import TransactionInvestmentFields from "./TransactionFields/TransactionInvestmentFields";
import TransactionValueField from "./TransactionFields/TransactionValueField";
import TransactionFormButtons from "./TransactionFields/TransactionFormButtons";

interface TransactionFormProps {
  initialData?: {
    id?: string;
    valor: number;
    valorUnitario: number | null;
    descricao: string;
    quantidade: number | null;
    categoriaId: string | null;
    data: string;
    tipo: string;
  };
  mesSelecionado: number;
  anoSelecionado: number;
  isEdit?: boolean;
}

const TransactionForm = ({ initialData, mesSelecionado, anoSelecionado, isEdit = false }: TransactionFormProps) => {
  const { user } = useAuth();
  const router = useRouter();

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [categorias, setCategorias] = useState<{id: string; nome: string}[]>([]);
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

  // Carrega as categorias e dados iniciais (se for edição)
  useEffect(() => {
    if (user?.id) {
      const carregarDados = async () => {
        try {
          setIsLoadingCategorias(true);
          
          // Carrega categorias
          const categoriasResponse = await fetch(`/api/categorias/todas?userId=${user.id}`);
          if (!categoriasResponse.ok) throw new Error('Erro ao carregar categorias');
          const categoriasData = await categoriasResponse.json();
          setCategorias(categoriasData.categorias || []);
          
          // Se for edição e houver dados iniciais, preenche o formulário
          if (isEdit && initialData) {
            const formatCurrencyValue = (value: number) => {
              return new Intl.NumberFormat("pt-BR", {
                style: "currency",
                currency: "BRL",
              }).format(value);
            };

            setForm({
              valor: initialData.tipo === "investimentos" ? "" : formatCurrencyValue(initialData.valor),
              valorUnitario: initialData.tipo === "investimentos" && initialData.valorUnitario 
                ? formatCurrencyValue(initialData.valorUnitario) 
                : "",
              descricao: initialData.descricao,
              quantidade: initialData.tipo === "investimentos" && initialData.quantidade 
                ? initialData.quantidade.toString() 
                : "1",
              categoriaId: initialData.categoriaId || "",
              data: new Date(initialData.data).toLocaleDateString('en-CA'),
              tipo: initialData.tipo
            });
          }
          
        } catch (error) {
          toast.error((error as Error).message);
          if (isEdit) {
            router.push(`/dashboard/${anoSelecionado}/${mesSelecionado}`);
          }
        } finally {
          setIsLoadingCategorias(false);
        }
      };
      
      carregarDados();
    }
  }, [user, isEdit, initialData, router, anoSelecionado, mesSelecionado]);

  // Função para formatar valores monetários
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
    setForm(prev => ({ ...prev, [name]: value }));
  };

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

    if (form.tipo === "investimentos") {
      valorUnitarioNumerico = parseCurrency(form.valorUnitario);
      const quantidadeNumerica = Number(form.quantidade) || 1;
      valorFinal = valorUnitarioNumerico * quantidadeNumerica;
    } else {
      valorFinal = parseCurrency(form.valor);
    }

    const payload = {
      ...(isEdit && initialData?.id && { id: initialData.id }),
      valor: valorFinal,
      valorUnitario: form.tipo === "investimentos" ? valorUnitarioNumerico : undefined,
      tipo: form.tipo,
      descricao: form.descricao,
      data: new Date(`${mesSelecionado}/${form.data.split('-')[2]}/${anoSelecionado}`),
      userId: user.id,
      quantidade: form.tipo === "investimentos" ? Number(form.quantidade) : undefined,
      categoriaId: form.categoriaId || null,
      mes: mesSelecionado,
      ano: anoSelecionado
    };

    setIsSubmitting(true);

    try {
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch("/api/transacoes", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        toast.success(`Transação ${isEdit ? 'atualizada' : 'criada'} com sucesso!`);
        router.push(`/dashboard/${anoSelecionado}/${mesSelecionado}`);
      } else {
        throw new Error(await res.text());
      }
    } catch (error) {
      toast.error(`Erro ao ${isEdit ? 'atualizar' : 'criar'} transação.`);
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

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-lg shadow-md border border-gray-200">
      <TransactionTypeField 
        value={form.tipo}
        onChange={handleChange}
      />
      
      <TransactionDateField
        value={form.data}
        onChange={handleChange}
        anoSelecionado={anoSelecionado}
        mesSelecionado={mesSelecionado}
      />
      
      <TransactionDescriptionField 
        value={form.descricao}
        onChange={handleChange}
      />
      
      <TransactionCategoryField
        value={form.categoriaId}
        onChange={handleChange}
        categorias={categorias}
        isLoading={isLoadingCategorias}
      />

      {form.tipo === "investimentos" && (
        <TransactionInvestmentFields
          valorUnitario={form.valorUnitario}
          onValorUnitarioChange={handleValorUnitarioChange}
          quantidade={form.quantidade}
          onQuantidadeChange={handleChange}
          valorFinal={calcularValorFinal()}
          formatCurrency={formatCurrency}
        />
      )}

      {form.tipo !== "investimentos" && (
        <TransactionValueField
          value={form.valor}
          onChange={handleValorChange}
        />
      )}

      <TransactionFormButtons
        isSubmitting={isSubmitting}
        onCancel={() => router.push(`/dashboard/${anoSelecionado}/${mesSelecionado}`)}
        isEdit={isEdit}
      />
    </form>
  );
};

export default TransactionForm;