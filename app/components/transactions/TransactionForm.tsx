"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from 'react-toastify';
import { useAuth } from "@/app/context/AuthContext";
import TransactionTypeField from "./TransactionFields/TransactionTypeField";
import TransactionDateField from "./TransactionFields/TransactionDateField";
import TransactionDescriptionField from "./TransactionFields/TransactionDescriptionField";
import TransactionCategoryField from "./TransactionFields/TransactionCategoryField";
import TransactionAccountField from "./TransactionFields/TransactionAccountField";
import TransactionInvestmentFields from "./TransactionFields/TransactionInvestmentFields";
import TransactionValueField from "./TransactionFields/TransactionValueField";
import TransactionFormButtons from "./TransactionFields/TransactionFormButtons";

interface TransactionFormProps {
  initialData?: {
    id?: string;
    amount: number;
    unitPrice: number | null;
    description: string;
    quantity: number | null;
    categoryId: string | null;
    accountId: string | null;
    transactionDate: string;
    type: string;
  };
  isEdit?: boolean;
}

const TransactionForm = ({ initialData, isEdit = false }: TransactionFormProps) => {
  const { user } = useAuth();
  const router = useRouter();

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [categories, setCategories] = useState<{id: string; name: string}[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [accounts, setAccounts] = useState<{id: string; name: string}[]>([]);

  const [form, setForm] = useState({
    amount: "",
    unitPrice: "",
    description: "",
    quantity: "1",
    categoryId: "",
    accountId: "",
    transactionDate: new Date().toLocaleDateString('en-CA'),
    type: "EXPENSE"
  });

  // Carrega as categorias e dados iniciais (se for edição)
  useEffect(() => {
    if (user?.id) {
      const carregarDados = async () => {
        try {
          setIsLoading(true);
          
          // Carrega categorias
          const categoriasResponse = await fetch(`/api/category/all?userId=${user.id}`);
          const accountsResponse = await fetch(`/api/account/all?userId=${user.id}`);

          if (!categoriasResponse.ok) throw new Error('Erro ao carregar categorias');
          if (!accountsResponse.ok) throw new Error('Erro ao carregar contas');

          const categoriasData = await categoriasResponse.json();
          const accountsData = await accountsResponse.json();

          setCategories(categoriasData.categorias || []);
          setAccounts(accountsData.accounts || []);
          
          // Se for edição e houver dados iniciais, preenche o formulário
          if (isEdit && initialData) {
            const formatCurrencyValue = (value: number) => {
              return new Intl.NumberFormat("pt-BR", {
                style: "currency",
                currency: "BRL",
              }).format(value);
            };

            setForm({
              amount: initialData.type === "INVESTMENT" ? "" : formatCurrencyValue(initialData.amount),
              unitPrice: initialData.type === "INVESTMENT" && initialData.unitPrice 
                ? formatCurrencyValue(initialData.unitPrice) 
                : "",
              description: initialData.description,
              quantity: initialData.type === "INVESTMENT" && initialData.quantity 
                ? initialData.quantity.toString() 
                : "1",
              categoryId: initialData.categoryId || "",
              accountId: initialData.accountId || "",
              transactionDate: new Date(initialData.transactionDate).toLocaleDateString('en-CA'),
              type: initialData.type
            });
          }
          
        } catch (error) {
          toast.error((error as Error).message);
          if (isEdit) {
            router.push(`/transacoes`);
          }
        } finally {
          setIsLoading(false);
        }
      };
      
      carregarDados();
    }
  }, [user, isEdit, initialData, router]);

  // Função para formatar valores monetários
  const formatCurrency = (value: string) => {
    const numericValue = value.replace(/\D/g, "");
    const floatValue = (parseInt(numericValue || "0") / 100).toFixed(2);
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(parseFloat(floatValue));
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    const formattedValue = formatCurrency(rawValue);
    setForm(prev => ({ ...prev, amount: formattedValue }));
  };

  const handleUnitPriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    const formattedValue = formatCurrency(rawValue);
    setForm(prev => ({ ...prev, unitPrice: formattedValue }));
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

    let finalValue = 0;
    let numericUnitValue = 0;

    if (form.type === "INVESTMENT") {
      numericUnitValue = parseCurrency(form.unitPrice);
      const numericalQuantity = Number(form.quantity) || 1;
      finalValue = numericUnitValue * numericalQuantity;
    } else {
      finalValue = parseCurrency(form.amount);
    }

    const payload = {
      ...(isEdit && initialData?.id && { id: initialData.id }),
      amount: finalValue,
      unitPrice: form.type === "INVESTMENT" ? numericUnitValue : undefined,
      type: form.type,
      description: form.description,
      transactionDate: new Date(`${form.transactionDate.split('-')[1]}/${form.transactionDate.split('-')[2]}/${form.transactionDate.split('-')[0]}`),
      userId: user.id,
      quantity: form.type === "INVESTMENT" ? Number(form.quantity) : undefined,
      categoryId: form.categoryId || null,
      accountId: form.accountId || null,
      month: form.transactionDate.split('-')[2],
      year: form.transactionDate.split('-')[0],
      day: form.transactionDate.split('-')[1],
    };

    setIsSubmitting(true);

    try {
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch("/api/transactions", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        toast.success(`Transação ${isEdit ? 'atualizada' : 'criada'} com sucesso!`);
        router.push(`/transacoes`);
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

  const calculatePrice = () => {
    if (form.type === "INVESTMENT") {
      const numericalQuantity = Number(form.quantity) || 1;
      const numericUnitValue = parseFloat(
        form.unitPrice.replace("R$", "").replace(/\./g, "").replace(",", ".") || "0"
      );
      return (numericalQuantity * numericUnitValue).toFixed(2);
    }
    return form.amount.replace("R$", "").replace(/\./g, "").replace(",", ".") || "0";
  };
  
  return (
    <div className="bg-gray-800 p-6 border-b border-gray-700 mb-6">
      {isLoading ? (
        <div className="max-w-5xl mx-auto p-4 flex justify-center items-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <TransactionTypeField 
            value={form.type}
            onChange={handleChange}
          />
          
          <TransactionDateField
            value={form.transactionDate}
            onChange={handleChange}
          />
          
          <TransactionDescriptionField 
            value={form.description}
            onChange={handleChange}
          />

          <TransactionAccountField
            value={form.accountId}
            onChange={handleChange}
            accounts={accounts}
            isLoading={isLoading}
          />
          
          <TransactionCategoryField
            value={form.categoryId}
            onChange={handleChange}
            categories={categories}
            isLoading={isLoading}
          />

          {form.type === "INVESTMENT" && (
            <TransactionInvestmentFields
              unitPrice={form.unitPrice}
              onUnitPriceChange={handleUnitPriceChange}
              quantity={form.quantity}
              onQuantityChange={handleChange}
              price={calculatePrice()}
              formatCurrency={formatCurrency}
            />
          )}

          {form.type !== "INVESTMENT" && (
            <TransactionValueField
              value={form.amount}
              onChange={handleAmountChange}
            />
          )}

          <TransactionFormButtons
            isSubmitting={isSubmitting}
            onCancel={() => router.push(`/transacoes`)}
            isEdit={isEdit}
          />
        </form>
      )}
    </div>
  );
};

export default TransactionForm;