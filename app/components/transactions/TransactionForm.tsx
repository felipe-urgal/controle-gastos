"use client";

// Hooks
import { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import { useTransactionFormData } from "@/app/hook/useTransactionFormData";

// Components
import { Select, Input, Loading } from '@/app/components';

// Icons
import {
  FaExchangeAlt,
  FaCalendarAlt,
  FaFileAlt,
  FaCreditCard,
  FaTag,
  FaMoneyBillWave,
  FaSync, 
  FaTimes,
  FaExclamationTriangle
} from 'react-icons/fa';

interface TransactionFormProps {
  transaction?: any;
  isEdit?: boolean;
  onSubmit: (data: any) => Promise<void>;
  isSubmitting?: boolean;
}

export interface TransactionFormRef {
  validateForm: () => boolean;
  getFormData: () => any;
  submitForm: () => Promise<void>;
}

const TransactionForm = forwardRef<TransactionFormRef, TransactionFormProps>(({ 
  transaction, 
  isEdit = false, 
  onSubmit,
  isSubmitting = false,
}, ref) => {
  const { categories, accounts, isLoading } = useTransactionFormData({ accountType: "CHECKING" });

  const [errors, setErrors] = useState({
    amount: "",
    type: "",
    description: "",
    transactionDate: "",
    categoryId: "",
    accountId: "",
  });

  const [form, setForm] = useState({
    amount: "",
    description: "",
    categoryId: "",
    accountId: "",
    transactionDate: "",
    type: "",
  });

  const [showRecurrence, setShowRecurrence] = useState(false);
  const [repeatMonths, setRepeatMonths] = useState(1);

  // Preenche o formulário se for edição
  useEffect(() => {
    if (isEdit && transaction) {
      const formatCurrencyValue = (value: number) => {
        return new Intl.NumberFormat("pt-BR", {
          style: "currency",
          currency: "BRL",
        }).format(value);
      };

      setForm({
        amount: formatCurrencyValue(transaction.amount),
        description: transaction.description,
        categoryId: transaction.categoryId || "",
        accountId: transaction.accountId || "",
        transactionDate: new Date(transaction.transactionDate ?? new Date()).toLocaleDateString('en-CA'),
        type: transaction.type,
      });
    }
  }, [isEdit, transaction]);

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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const validateForm = () => {
    let valid = true;
    const newErrors = {
      amount: "",
      type: "",
      description: "",
      transactionDate: "",
      categoryId: "",
      accountId: "",
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

    if (!form.transactionDate) {
      newErrors.transactionDate = 'Data é obrigatória';
      valid = false;
    }

    if (!form.type) {
      newErrors.type = 'Tipo da transação é obrigatório';
      valid = false;
    }

    if (!form.categoryId) {
      newErrors.categoryId = 'Categoria é obrigatória';
      valid = false;
    }

    if (!form.accountId) {
      newErrors.accountId = 'Conta é obrigatória';
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

    setErrors(newErrors);
    return valid;
  };

  const getFormData = () => {
    const parts = form.transactionDate.split('-');
    return {
      ...form, 
      amount: parseCurrency(form.amount),
      transactionDate: new Date(
        parseInt(parts[0]),
        parseInt(parts[1]) - 1,
        parseInt(parts[2])
      ),
    };
  };

  useImperativeHandle(ref, () => ({
    validateForm,
    getFormData,
    submitForm: async () => {
      if (!validateForm()) return;
      const formData = getFormData();
      await onSubmit(formData);
    }
  }));

  const types = [
    { id: "EXPENSE", name: 'Despesa' },
    { id: "INCOME", name: 'Renda' },
  ];

  if (isLoading) {
    return <Loading />
  }

  return (
    <div className="space-y-4">
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
        icon={<FaExchangeAlt className="text-gray-500" />}
        required
      />

      {form.type && (
        <>
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
            icon={<FaCalendarAlt className="text-gray-500" />}
          />

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
            icon={<FaFileAlt className="text-gray-500" />}
          />

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
            icon={<FaCreditCard className="text-gray-500" />}
            required
          />

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
            icon={<FaTag className="text-gray-500" />}
            required
          />

          <Input
            label="Valor"
            type="text"
            name="amount"
            value={form.amount}
            onChange={handleAmountChange}
            placeholder="R$ 0,00"
            loading={isLoading || isSubmitting}
            error={errors.amount}
            icon={<FaMoneyBillWave className="text-gray-500" />}
            required
          />
        </>
      )}

      {form.type && !isEdit && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 md:p-6 rounded-xl border border-blue-200/60 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <div className="flex items-center">
              <div className="bg-blue-100 p-2 rounded-lg mr-3 flex-shrink-0">
                <FaSync className="text-blue-600 text-lg" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-800">Repetir transação</h3>
                <p className="text-sm text-gray-500">Configure transações recorrentes</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowRecurrence(!showRecurrence)}
              className={`flex items-center justify-center text-sm font-medium px-4 py-2 rounded-lg transition-all duration-200 whitespace-nowrap ${
                showRecurrence
                  ? 'bg-red-100 text-red-700 hover:bg-red-200'
                  : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
              }`}
            >
              {showRecurrence ? (
                <>
                  <FaTimes className="mr-1.5" /> Cancelar
                </>
              ) : (
                <>
                  <FaSync className="mr-1.5" /> Configurar repetição
                </>
              )}
            </button>
          </div>

          {showRecurrence && (
            <div className="mt-4 p-4 md:p-5 bg-white rounded-xl border border-gray-200 shadow-sm">
              <div className="mb-5">
                <label className="block text-sm font-medium text-gray-800 mb-3">
                  Repetir por quantos meses?
                </label>
                
                {/* Range Input Customizado */}
                <div className="mb-4">
                  <input
                    type="range"
                    min="1"
                    max="24"
                    value={repeatMonths}
                    onChange={(e) => setRepeatMonths(parseInt(e.target.value))}
                    className="w-full h-2 bg-blue-100 rounded-full appearance-none cursor-pointer 
                      [&::-webkit-slider-thumb]:appearance-none 
                      [&::-webkit-slider-thumb]:h-5 
                      [&::-webkit-slider-thumb]:w-5 
                      [&::-webkit-slider-thumb]:rounded-full 
                      [&::-webkit-slider-thumb]:bg-blue-600 
                      [&::-webkit-slider-thumb]:border-0 
                      [&::-webkit-slider-thumb]:transition-all 
                      [&::-webkit-slider-thumb]:duration-200 
                      [&::-webkit-slider-thumb]:hover:scale-125
                      [&::-moz-range-thumb]:h-5
                      [&::-moz-range-thumb]:w-5
                      [&::-moz-range-thumb]:rounded-full
                      [&::-moz-range-thumb]:bg-blue-600
                      [&::-moz-range-thumb]:border-0
                      [&::-moz-range-thumb]:cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-2 px-1">
                    <span>1 mês</span>
                    <span>12 meses</span>
                    <span>24 meses</span>
                  </div>
                </div>
                
                {/* Display do valor selecionado */}
                <div className="flex items-center justify-center mb-4">
                  <div className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white px-6 py-3 rounded-xl shadow-md min-w-[120px] text-center">
                    <span className="text-2xl font-bold block">{repeatMonths}</span>
                    <span className="text-sm font-medium">
                      {repeatMonths === 1 ? 'mês' : 'meses'}
                    </span>
                  </div>
                </div>
                
                {/* Informações adicionais */}
                <div className="text-center">
                  <div className="text-sm text-gray-600 mb-2 px-2">
                    {repeatMonths === 1 ? (
                      "Apenas esta transação será criada"
                    ) : (
                      <>
                        Serão criadas <span className="font-semibold text-blue-700">{repeatMonths} transações</span>
                        <br />
                        <span className="text-xs text-gray-500">(uma por mês)</span>
                      </>
                    )}
                  </div>
                  {form.transactionDate && (
                    <div className="text-xs text-gray-400 bg-gray-50 p-2 rounded-lg inline-block mt-1">
                      Primeira transação: {new Date(form.transactionDate).toLocaleDateString('pt-BR')}
                    </div>
                  )}
                </div>
              </div>
              
              {/* Preview das datas - apenas se houver mais de 1 mês */}
              {repeatMonths > 1 && (
                <div className="border-t border-gray-100 pt-4 mt-4">
                  <p className="text-xs font-medium text-gray-700 mb-3 text-center">Próximas datas:</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-[120px] overflow-y-auto p-1">
                    {Array.from({ length: Math.min(repeatMonths, 8) }, (_, i) => {
                      const date = new Date(form.transactionDate || new Date());
                      date.setMonth(date.getMonth() + i);
                      return (
                        <div 
                          key={i}
                          className="text-xs bg-blue-50 text-blue-700 px-2 py-1.5 rounded-md text-center border border-blue-100"
                        >
                          {date.toLocaleDateString('pt-BR', { 
                            month: 'short', 
                            year: '2-digit' 
                          }).replace('.', '')}
                        </div>
                      );
                    })}
                    {repeatMonths > 8 && (
                      <div className="text-xs bg-gray-100 text-gray-600 px-2 py-1.5 rounded-md text-center border border-gray-200">
                        +{repeatMonths - 8} mais
                      </div>
                    )}
                  </div>
                  
                  {repeatMonths > 12 && (
                    <div className="mt-3 text-center">
                      <div className="text-xs text-gray-500 bg-orange-50 text-orange-700 px-3 py-1.5 rounded-lg inline-flex items-center">
                        <FaExclamationTriangle className="mr-1.5" size={10} />
                        {repeatMonths} meses = {Math.floor(repeatMonths / 12)} ano(s) e {repeatMonths % 12} mes(es)
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
});

TransactionForm.displayName = 'TransactionForm';

export default TransactionForm;
