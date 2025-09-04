"use client";

// Hooks
import { useState, useEffect } from "react";
import { useTransactionFormData } from "@/app/hook/useTransactionFormData";

import { FormContainer, Select, Input, Loading } from '@/app/components';
import 'react-toastify/dist/ReactToastify.css';

// Icons
import {
  FaExchangeAlt,
  FaCalendarAlt,
  FaFileAlt,
  FaCreditCard,
  FaDollarSign,
  FaHashtag,
  FaCalculator,
} from 'react-icons/fa';

// Utils
import { InvestmentType } from "@/app/utils/format";

interface InvestmentFormProps {
  investment?: any;
  isEdit?: boolean;
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
}

const InvestmentForm = ({ 
  investment, 
  isEdit = false, 
  onSubmit,
  onCancel,
  isSubmitting = false
}: InvestmentFormProps) => {
  const { accounts, isLoading } = useTransactionFormData({ accountType: "INVESTMENT" });
  const [errors, setErrors] = useState({
    amount: "",
    unitPrice: "",
    type: "",
    description: "",
    investmentDate: "",
    quantity: "",
    accountId: "",
    ticker: "",
  });

  const [form, setForm] = useState({
    amount: "",
    unitPrice: "",
    description: "",
    quantity: "1",
    accountId: "",
    investmentDate: "",
    type: "",
    ticker: "",
  });

  // Preenche o formulário se for edição
  useEffect(() => {
    if (isEdit && investment) {
      const formatCurrencyValue = (value: number) => {
        return new Intl.NumberFormat("pt-BR", {
          style: "currency",
          currency: "BRL",
        }).format(value);
      };

      setForm({
        amount: formatCurrencyValue(investment.amount),
        unitPrice: formatCurrencyValue(investment.unitPrice),
        description: investment.description,
        quantity: investment.quantity.toString(),
        accountId: investment.accountId || "",
        investmentDate: new Date(investment.investmentDate).toLocaleDateString('en-CA'),
        type: investment.type,
        ticker: investment.ticker,
      });
    }
  }, [isEdit, investment]);

  const formatCurrency = (value: string) => {
    // Remove tudo exceto números e vírgula
    let numericValue = value.replace(/[^\d,]/g, '');
    
    // Garante que há apenas uma vírgula
    const commaCount = numericValue.split(',').length - 1;
    if (commaCount > 1) {
      numericValue = numericValue.replace(/,+$/, '');
    }
    
    // Se não houver vírgula, formata como número inteiro
    if (!numericValue.includes(',')) {
      if (numericValue === '') return '';
      const number = parseInt(numericValue || "0");
      return new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
      }).format(number);
    }
    
    // Se houver vírgula, formata como decimal
    const parts = numericValue.split(',');
    const integerPart = parts[0].replace(/\D/g, '');
    const decimalPart = parts[1] ? parts[1].replace(/\D/g, '').substring(0, 2) : '';
    
    const number = parseFloat(`${integerPart}.${decimalPart}`);
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(number);
  };

  const parseCurrency = (value: string) => {
    return parseFloat(value.replace("R$", "").replace(/\./g, "").replace(",", ".")) || 0;
  };

  const handleUnitPriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    const formattedValue = formatCurrency(rawValue);
    setForm(prev => ({ ...prev, unitPrice: formattedValue }));
    setErrors(prev => ({ ...prev, unitPrice: '' }));
    
    // Calcular valor total automaticamente
    if (form.quantity) {
      const numericUnitValue = parseCurrency(formattedValue);
      const numericalQuantity = Number(form.quantity) || 1;
      const totalValue = numericUnitValue * numericalQuantity;
      setForm(prev => ({ 
        ...prev, 
        amount: new Intl.NumberFormat("pt-BR", {
          style: "currency",
          currency: "BRL",
        }).format(totalValue)
      }));
    }
  };

  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Permite apenas números e ponto decimal
    const numericValue = value.replace(/[^\d.]/g, '');
    
    // Garante que há apenas um ponto decimal
    const dotCount = numericValue.split('.').length - 1;
    const finalValue = dotCount > 1 ? numericValue.replace(/\.+$/, '') : numericValue;
    
    setForm(prev => ({ ...prev, quantity: finalValue }));
    setErrors(prev => ({ ...prev, quantity: '' }));
    
    // Calcular valor total automaticamente
    if (form.unitPrice) {
      const numericUnitValue = parseCurrency(form.unitPrice);
      const numericalQuantity = Number(finalValue) || 0;
      const totalValue = numericUnitValue * numericalQuantity;
      setForm(prev => ({ 
        ...prev, 
        amount: new Intl.NumberFormat("pt-BR", {
          style: "currency",
          currency: "BRL",
        }).format(totalValue)
      }));
    }
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
      investmentDate: "",
      quantity: "",
      accountId: "",
      ticker: "",
    };

    if (!form.description.trim()) {
      newErrors.description = 'Descrição é obrigatória';
      valid = false;
    } else if (form.description.trim().length < 3) {
      newErrors.description = 'Descrição deve ter pelo menos 3 caracteres';
      valid = false;
    } else if (form.description.trim().length > 50) {
      newErrors.description = 'Descrição não pode exceder 50 caracteres';
      valid = false;
    }

    if (!form.investmentDate) {
      newErrors.investmentDate = 'Data é obrigatória';
      valid = false;
    }

    if (!form.type) {
      newErrors.type = 'Tipo do investimento é obrigatório';
      valid = false;
    }

    if (!form.ticker) {
      newErrors.ticker = 'Código do ativo é obrigatório';
      valid = false;
    }

    if (!form.accountId) {
      newErrors.accountId = 'Conta é obrigatória';
      valid = false;
    }

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

    setErrors(newErrors);
    return valid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    const parts = form.investmentDate.split('-');

    await onSubmit({
      ...form, 
      unitPrice: parseCurrency(form.unitPrice), 
      quantity: Number(form.quantity),
      amount: parseCurrency(form.amount),
      investmentDate: new Date(
        parseInt(parts[0]),
        parseInt(parts[1]) - 1,
        parseInt(parts[2])
      ),
    });
  };

  const calculatePrice = () => {
    const numericalQuantity = Number(form.quantity) || 1;
    const numericUnitValue = parseCurrency(form.unitPrice);
    const amount = (numericalQuantity * numericUnitValue).toFixed(2);
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(parseFloat(amount));
  };

  if (isLoading) {
    return <Loading />
  }

  return (
    <FormContainer
      isSubmitting={isSubmitting}
      isEdit={isEdit}
      handleSubmit={handleSubmit}
      onCancel={onCancel}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="md:col-span-2">
          <Select
            value={form.type}
            onChange={handleChange}
            placeholder="Selecione o tipo"
            label="Tipo de Investimento"
            options={InvestmentType}
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
            <div className="md:col-span-2">
              <Input
                type="date"
                label="Data do Investimento"
                name="investmentDate"
                value={form.investmentDate}
                onChange={handleChange}
                loading={isLoading || isSubmitting}
                error={errors.investmentDate}
                required
                icon={<FaCalendarAlt />}
              />
            </div>

            <div className="md:col-span-2">
              <Input
                type="text"
                label="Descrição"
                name="description"
                value={form.description}
                onChange={handleChange}
                placeholder="Ex: Compra de ações PETR4"
                loading={isLoading || isSubmitting}
                error={errors.description}
                required
                icon={<FaFileAlt />}
              />
            </div>

            <div className="md:col-span-2">
              <Input
                type="text"
                label="Código do Ativo (Ticker)"
                name="ticker"
                value={form.ticker}
                onChange={handleChange}
                placeholder="Ex: PETR4, IVVB11, BTC"
                loading={isLoading || isSubmitting}
                error={errors.ticker}
                required
                icon={<FaFileAlt />}
              />
            </div>

            <div className="md:col-span-2">
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

            <div>
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

            <div>
              <Input
                label="Quantidade"
                type="text"
                name="quantity"
                value={form.quantity}
                onChange={handleQuantityChange}
                placeholder="1.0"
                loading={isLoading || isSubmitting}
                error={errors.quantity}
                icon={<FaHashtag />}
                required
              />
            </div>

            <div className="md:col-span-2">
              <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100">
                <label className="block text-sm font-medium text-indigo-800 mb-1 flex items-center">
                  <FaCalculator className="mr-2" />
                  Valor Total do Investimento
                </label>
                <div className="text-xl font-semibold text-indigo-900 py-2">
                  {calculatePrice()}
                </div>
                <p className="text-xs text-indigo-600 mt-1">
                  Valor unitário × quantidade
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    </FormContainer>
  );
};

export default InvestmentForm;
