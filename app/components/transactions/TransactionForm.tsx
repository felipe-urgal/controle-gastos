"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";
import { toast } from 'react-toastify';
import { FormContainer } from '../ui/FormContainer';
import { Select } from "../ui/Select";
import { Input } from "../ui/Input";
import { transactionService } from "@/app/services/transactionService";
import { useTransactionFormData } from "@/app/hook/useTransactionFormData";
import 'react-toastify/dist/ReactToastify.css';
import { TransactionPayload } from "@/app/types/transaction";

// Icons
import {
  FaExchangeAlt,
  FaCalendarAlt,
  FaFileAlt,
  FaCreditCard,
  FaTag,
  FaDollarSign,
  FaHashtag,
  FaCalculator,
  FaMoneyBillWave
} from 'react-icons/fa';

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
    investmentType?: string;
  };
  isEdit?: boolean;
}

const TransactionForm = ({ transaction, isEdit = false }: TransactionFormProps) => {
  const { user } = useAuth();
  const router = useRouter();
  const { categories, accounts, isLoading } = useTransactionFormData(user?.id);

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errors, setErrors] = useState({
    amount: "",
    unitPrice: "",
    type: "",
    description: "",
    transactionDate: "",
    quantity: "",
    categoryId: "",
    accountId: "",
    investmentType: "",
  });

  const [form, setForm] = useState({
    amount: "",
    unitPrice: "",
    description: "",
    quantity: "1",
    categoryId: "",
    accountId: "",
    transactionDate: "",
    type: "",
    investmentType: "",
  });

  // Preenche o formulário se for edição
  useEffect(() => {
    if (isEdit && transaction && !isLoading) {
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
        type: transaction.type,
        investmentType: transaction.investmentType || "",
      });
    }
  }, [isEdit, transaction, isLoading]);

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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const validateForm = () => {
    let valid = true;
    const newErrors = {
      amount: "",
      unitPrice: "",
      type: "",
      description: "",
      transactionDate: "",
      quantity: "",
      categoryId: "",
      accountId: "",
      investmentType: "",
    };

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

    if (!form.transactionDate) {
      newErrors.transactionDate = 'Data é obrigatório';
      valid = false;
    }

    if (!form.type) {
      newErrors.type = 'Tipo da transação é obrigatório';
      valid = false;
    }

    if (!form.categoryId) {
      newErrors.categoryId = 'Categoria é obrigatório';
      valid = false;
    }

    if (!form.accountId) {
      newErrors.accountId = 'Conta é obrigatório';
      valid = false;
    }

    const newAmount = parseCurrency(form.amount);
    if (newAmount === 0) {
      newErrors.amount = 'Valor é obrigatório';
      valid = false;
    } else if (isNaN(newAmount)) {
      newErrors.amount = 'Valor inválido';
      valid = false;
    }

    if (form.type && form.type === "INVESTMENT") {
      const newUnitPrice = parseCurrency(form.unitPrice);
      if (newUnitPrice === 0) {
        newErrors.unitPrice = 'Valor Unitário é obrigatório';
        valid = false;
      } else if (isNaN(newUnitPrice)) {
        newErrors.unitPrice = 'Valor Unitário inválido';
        valid = false;
      }

      if (!form.quantity.trim()) {
        newErrors.quantity = 'Quantidade é obrigatória';
        valid = false;
      }
      if (form.quantity.trim() && (0 >= Number(form.quantity))) {
        newErrors.quantity = 'Quantidade deve ser maior que 0';
        valid = false;
      }
      if (!form.investmentType) {
        newErrors.investmentType = 'Tipo de operação é obrigatório';
        valid = false;
      }
    }

    setErrors(newErrors);
    return valid;
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

    const payload: TransactionPayload = {
      id: isEdit ? transaction?.id : undefined,
      amount: finalValue,
      type: isEdit && transaction ? transaction.type : form.type,
      description: form.description,
      transactionDate: new Date(
        parseInt(parts[0]),
        parseInt(parts[1]) - 1,
        parseInt(parts[2])
      ),
      userId: user.id,
      categoryId: form.categoryId || null,
      accountId: isEdit && transaction ? transaction.accountId : form.accountId || null,
    };

    if (form.type === "INVESTMENT") {
      payload.unitPrice = numericUnitValue;
      payload.quantity = Number(form.quantity);
      payload.investmentType = form.investmentType;
    }

    setIsSubmitting(true);

    try {
      if (isEdit) {
        if (!transaction) {
          throw new Error("Initial transaction data is missing");
        }
        
        await transactionService.updateTransaction(payload);
        toast.success("Transação atualizada com sucesso!");
      } else {
        await transactionService.createTransaction(payload);
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
      const amount = (numericalQuantity * numericUnitValue).toFixed(2);
      form.amount = amount
      return formatCurrency(amount);
    }
    return form.amount;
  };

  const handleCancel = () => {
    router.push('/transacoes');
  };

  const types = [
    { id: "EXPENSE", name: 'Despesa' },
    { id: "INCOME", name: 'Renda' },
    { id: "INVESTMENT", name: 'Investimento' },
  ];

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto p-4 flex justify-center items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    )
  }

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
              disabled={isLoading || isEdit || isSubmitting}
              loading={isLoading || isSubmitting}
              name="type"
              error={errors.type}
              icon={<FaExchangeAlt />}
              required
            />
          </div>

          {form.type && (
            <>
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
                  icon={<FaCalendarAlt />}
                />
              </div>

              <div className="xs:col-span-1">
                <Input
                  type="text"
                  label="Descrição"
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  placeholder="Ex: Salário, Aluguel, etc"
                  loading={isLoading || isSubmitting}
                  error={errors.description}
                  required
                  icon={<FaFileAlt />}
                />
              </div>

              <div className="xs:col-span-1">
                <Select
                  value={form.accountId}
                  onChange={handleChange}
                  placeholder="Selecione uma conta"
                  label="Conta"
                  options={accounts}
                  disabled={isLoading || isEdit}
                  loading={isLoading || isSubmitting}
                  name="accountId"
                  error={errors.accountId}
                  icon={<FaCreditCard />}
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
                  disabled={isLoading}
                  loading={isLoading || isSubmitting}
                  name="categoryId"
                  error={errors.categoryId}
                  icon={<FaTag />}
                  required
                />
              </div>

              {form.type === "INVESTMENT" && (
                <>
                  <div className="xs:col-span-1">
                    <Select
                      label="Tipo de Operação"
                      name="investmentType"
                      value={form.investmentType}
                      onChange={handleChange}
                      options={[
                        { id: "BUY", name: "Compra" },
                        { id: "SELL", name: "Venda" }
                      ]}
                      placeholder="Selecione o tipo"
                      required
                      error={errors.investmentType}
                      disabled={isLoading}
                      loading={isLoading || isSubmitting}
                      icon={<FaExchangeAlt />}
                    />
                  </div>

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
                      icon={<FaDollarSign />}
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
                      icon={<FaHashtag />}
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
                      icon={<FaCalculator />}
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
                    icon={<FaMoneyBillWave />}
                    required
                  />
                </div>
              )}
            </>
          )}
        </FormContainer>
      )}
    </div>
  );
};

export default TransactionForm;