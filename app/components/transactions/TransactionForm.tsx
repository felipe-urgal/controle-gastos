"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from 'react-toastify';
import { useAuth } from "@/app/context/AuthContext";
import { FormContainer } from '../ui/FormContainer';
import { Select } from "../ui/Select";
import { Input } from "../ui/Input";

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

  const [errors, setErrors] = useState({
    amount: '',
    unitPrice: '',
    type: '',
    description: '',
    transactionDate: '',
    quantity: '',
    categoryId: '',
    accountId: '',
  });

  const [form, setForm] = useState({
    amount: "",
    unitPrice: "",
    description: "",
    quantity: "1",
    categoryId: "",
    accountId: "",
    transactionDate: "",
    type: ""
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

  // Validação dos campos
  const validateForm = () => {
    let valid = true;
    const newErrors = {
      amount: '',
      unitPrice: '',
      type: '',
      description: '',
      transactionDate: '',
      quantity: '',
      categoryId: '',
      accountId: '',
    };

    // Validação do nome
    if (!form.description.trim()) {
      newErrors.description = 'Descrição é obrigatório';
      valid = false;
    } else if (form.description.trim().length < 3) {
      newErrors.description = 'Descrição deve ter pelo menos 3 caracteres';
      valid = false;
    } else if (form.description.trim().length > 50) {
      newErrors.description = 'Descrição não pode exceder 50 caracteres';
      valid = false;
    }

    // // Validação do tipo
    if (!form.transactionDate) {
      newErrors.transactionDate = 'Data é obrigatório';
      valid = false;
    }

    // // Validação do tipo
    if (!form.type) {
      newErrors.type = 'Tipo da transação é obrigatório';
      valid = false;
    }

    // // Validação do tipo
    if (!form.categoryId) {
      newErrors.categoryId = 'Categoria é obrigatório';
      valid = false;
    }

    // // Validação do tipo
    if (!form.categoryId) {
      newErrors.accountId = 'Conta é obrigatório';
      valid = false;
    }

    // // Validação do saldo
    const newAmount = parseCurrency(form.amount);
    if (newAmount === 0) {
      newErrors.amount = 'Valor é obrigatório';
      valid = false;
    } else if (isNaN(newAmount)) {
      newErrors.amount = 'Valor inválido';
      valid = false;
    }

    // // Validação da moeda
    if (form.type && form.type === "INVESTMENT") {

      const newUnitPrice = parseCurrency(form.unitPrice);
      if (newUnitPrice === 0) {
        newErrors.unitPrice = 'Valor Unitário é obrigatório';
        valid = false;
      } else if (isNaN(newUnitPrice)) {
        newErrors.unitPrice = 'Valor Unitário inválido';
        valid = false;
      }
      // Validação melhorada para quantidade
      if (!form.quantity.trim()) {
        newErrors.quantity = 'Quantidade é obrigatória';
        valid = false;
      }
      if (form.quantity.trim() && (0 >= Number(form.quantity))) {
        newErrors.quantity = 'Quantidade deve ser maior que 0';
        valid = false;
      }
    }

    setErrors(newErrors);
    return valid;
  };

  // Função para formatar valores monetários
  const formatCurrency = (value: string) => {
    const numericValue = value.replace(/\D/g, "");
    const floatValue = (parseInt(numericValue || "0") / 100).toFixed(2);
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(parseFloat(floatValue));
  };

  const parseCurrency = (value: string) => {
    return parseFloat(value.replace("R$", "").replace(/\./g, "").replace(",", ".")) || 0;
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    const formattedValue = formatCurrency(rawValue);
    setForm(prev => ({ ...prev, amount: formattedValue }));
    setErrors(prev => ({ ...prev, amount: '' }));
  };

  const handleUnitPriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    const formattedValue = formatCurrency(rawValue);
    setForm(prev => ({ ...prev, unitPrice: formattedValue }));
    setErrors(prev => ({ ...prev, unitPrice: '' }));
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    if (!user) {
      toast.error("Usuário não autenticado.");
      return;
    }

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
      const numericUnitValue = parseCurrency(form.unitPrice);
      form.amount = (numericalQuantity * numericUnitValue).toFixed(2);
      return form.amount
    }
    return parseCurrency(form.amount);
  };

  const handleCancel = () => {
    router.push('/transacoes');
  };

  const types = [
    { id: "EXPENSE", name: 'Despesa' },
    { id: "INCOME", name: 'Renda' },
    { id: "INVESTMENT", name: 'Investimento' },
  ];
  
  return (
    <div className="bg-gray-800 p-6 border-b border-gray-700 mb-6">
      {isLoading ? (
        <div className="max-w-5xl mx-auto p-4 flex justify-center items-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <FormContainer
          isSubmitting={isSubmitting}
          isEdit={isEdit}
          handleSubmit={handleSubmit}
          onCancel={handleCancel}
        >
          <div className="xs:col-span-1">
            <Select
              value={form.type}
              onChange={handleChange}
              placeholder="Selecione o tipo da transação"
              label="Tipo da Transação"
              options={types}
              disabled={isLoading || isSubmitting}
              loading={isLoading || isSubmitting}
              name="type"
              error={errors.type}
              required
            />
          </div>

          <div className="xs:col-span-1">
            <Input
              type="date"
              label="Data da Transação"
              name="transactionDate"
              value={form.transactionDate}
              onChange={handleChange}
              placeholder="Informe uma data"
              loading={isLoading || isSubmitting}
              error={errors.transactionDate}
              required
            />
          </div>

          <div className="xs:col-span-1">
            <Input
              type="text"
              label="Descrição"
              name="description"
              value={form.description}
              onChange={handleChange}
              placeholder="Ex: Salário, Aluguel, Ações PETR4"
              loading={isLoading || isSubmitting}
              error={errors.description}
              required
            />
          </div>

          <div className="xs:col-span-1">
            <Select
              value={form.accountId}
              onChange={handleChange}
              placeholder="Selecione uma conta"
              label="Conta"
              options={accounts}
              disabled={isLoading || isSubmitting}
              loading={isLoading || isSubmitting}
              name="accountId"
              error={errors.accountId}
              required
            />
          </div>

          <div className="xs:col-span-1">
            <Select
              value={form.categoryId}
              onChange={handleChange}
              placeholder="Selecione uma categoria"
              label="Categoria"
              options={categories}
              disabled={isLoading || isSubmitting}
              loading={isLoading || isSubmitting}
              name="categoryId"
              error={errors.categoryId}
              required
            />
          </div>

          {form.type === "INVESTMENT" && (
            <>
              <div className="xs:col-span-1">
                <Input
                  label="Valor Unitário"
                  type="text"
                  name="unitPrice"
                  value={form.unitPrice}
                  onChange={handleUnitPriceChange}
                  placeholder="R$ 0,00"
                  loading={isLoading || isSubmitting}
                  error={errors.unitPrice}
                  required
                />
              </div>

              <div className="xs:col-span-1">
                <Input
                  label="Quantidade"
                  type="number"
                  name="quantity"
                  value={form.quantity}
                  onChange={handleChange}
                  placeholder="1"
                  loading={isLoading || isSubmitting}
                  error={errors.quantity}
                  required
                />
              </div>

              <div className="xs:col-span-1">
                <Input
                  label="Valor Total"
                  type="text"
                  value={calculatePrice()}
                  placeholder="1"
                  disabled={true}
                  loading={isLoading || isSubmitting}
                />
              </div>
            </>
          )}

          {form.type !== "INVESTMENT" && (
            <div className="xs:col-span-1">
              <Input
                label="Valor"
                type="text"
                name="amount"
                value={form.amount}
                onChange={handleAmountChange}
                placeholder="R$ 0,00"
                loading={isLoading || isSubmitting}
                error={errors.amount}
                required
              />
            </div>
          )}
        </FormContainer>
      )}
    </div>
  );
};

export default TransactionForm;