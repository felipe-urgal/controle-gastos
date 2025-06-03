"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from 'react-toastify';
import { useAuth } from "@/app/context/AuthContext";
import { FormContainer } from '../ui/FormContainer';
import { Select } from "../ui/Select";
import { Input } from "../ui/Input";
import { transactionService } from "@/app/services/transactionService";
import { TransactionFormData } from '@/app/types/transaction'
import { AccountModel } from '@/app/types/account'
import { accountService } from "@/app/services/accountService";

interface TransactionFormProps {
  transaction?: {
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

const TransactionForm = ({ transaction, isEdit = false }: TransactionFormProps) => {
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
          if (isEdit && transaction) {
            const formatCurrencyValue = (value: number) => {
              return new Intl.NumberFormat("pt-BR", {
                style: "currency",
                currency: "BRL",
              }).format(value);
            };

            setForm({
              amount: transaction.type === "INVESTMENT" ? "" : formatCurrencyValue(transaction.amount),
              unitPrice: transaction.type === "INVESTMENT" && transaction.unitPrice 
                ? formatCurrencyValue(transaction.unitPrice) 
                : "",
              description: transaction.description,
              quantity: transaction.type === "INVESTMENT" && transaction.quantity 
                ? transaction.quantity.toString() 
                : "1",
              categoryId: transaction.categoryId || "",
              accountId: transaction.accountId || "",
              transactionDate: new Date(transaction.transactionDate).toLocaleDateString('en-CA'),
              type: transaction.type
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
  }, [user, isEdit, transaction, router]);

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

    const parts = form.transactionDate.split('-');

    const payload: TransactionFormData = {
      id: isEdit ? transaction?.id : undefined,
      amount: finalValue,
      unitPrice: form.type === "INVESTMENT" ? numericUnitValue : undefined,
      type: isEdit && transaction ? transaction.type : form.type,
      description: form.description,
      transactionDate: new Date(
        parseInt(parts[0]),  // year as number
        parseInt(parts[1]) - 1,  // month (0-11) as number
        parseInt(parts[2])  // day as number
      ),
      userId: user.id,
      quantity: form.type === "INVESTMENT" ? Number(form.quantity) : undefined,
      categoryId: form.categoryId || null,
      accountId: isEdit && transaction ? transaction.accountId : form.accountId || null,
    };

    setIsSubmitting(true);

    try {
      if (isEdit) {
        if (!transaction) {
          throw new Error("Initial transaction data is missing");
        }
        
        // Atualiza a transação
        await transactionService.updateTransaction(payload);

        // Busca a conta associada
        const account = await accountService.getAccountById(form.accountId as AccountModel);

        // Obtém o valor antigo da transação (transaction.amount)
        const pastAmount = transaction.amount;

        // Calcula a diferença entre o novo valor e o valor antigo
        const amountDifference = finalValue - pastAmount;

        // Atualiza o saldo da conta corretamente com base no tipo
        let newBalance;
        if (form.type === 'INCOME' || form.type === 'INVESTMENT') {
          // Se for receita: adiciona a diferença (positiva ou negativa)
          newBalance = Number(account.balance) + amountDifference;
        } else {
          // Se for despesa/investimento: subtrai a diferença
          newBalance = Number(account.balance) - amountDifference;
        }

        // Se o tipo da transação foi alterado (ex: de INCOME para EXPENSE),
        // precisamos reverter o valor antigo e aplicar o novo.
        if (transaction.type !== form.type) {
          if (transaction.type === 'INCOME') {
            // Se antes era receita e agora é despesa: remove o valor antigo e subtrai o novo
            newBalance = Number(account.balance) - pastAmount - finalValue;
          } else {
            // Se antes era despesa e agora é receita: adiciona o valor antigo e soma o novo
            newBalance = Number(account.balance) + pastAmount + finalValue;
          }
        }

        // Atualiza o saldo da conta
        const payloadEdit = {
          id: account.id,
          balance: newBalance,
        };

        await accountService.updateAccount(payloadEdit);
        toast.success("Transação atualizada com sucesso!");
      } else {
        // Lógica para criação de transação (CREATE)
        await transactionService.createTransaction(payload);

        // Busca a conta para pegar o saldo ATUALIZADO (se necessário)
        const account = await accountService.getAccountById(form.accountId);

        let newBalance;
        if (form.type === 'INCOME' || form.type === 'INVESTMENT') {
          newBalance = Number(account.balance) + finalValue; // Receita: AUMENTA o saldo
        } else {
          newBalance = Number(account.balance) - finalValue; // Despesa/Investimento: DIMINUI o saldo
        }

        // Atualiza o saldo da conta
        const payloadEdit = {
          id: account.id,
          balance: newBalance,
        };

        await accountService.updateAccount(payloadEdit as AccountModel);
        toast.success("Transação criada com sucesso!");
      }

      router.push(`/transacoes`);
    } catch (error) {
      toast.error((error as Error).message);
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  }

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
    <div className="bg-gray-800 p-3 border-b border-gray-700">
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
              disabled={isLoading || isSubmitting || isEdit}
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
              disabled={isLoading || isSubmitting || isEdit}
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