"use client";

import { useState, useEffect, useCallback } from "react";
import { Input, Select, Button } from "@/app/components";
import { useThemeColors } from "@/app/hook/useThemeColors";

interface TransactionFormModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  formData?: any;
  setFormData?: (data: any) => void;
  editingTransaction?: any;
  isSubmitting?: boolean;
  categories?: any[];
  accounts?: any[];
  onSubmit?: (data: any) => void;
  selectedDate?: Date | null;
  className?: string;
}

export default function TransactionFormModal({
  isOpen = false,
  onClose,
  formData = {},
  setFormData,
  editingTransaction,
  isSubmitting = false,
  categories = [],
  accounts = [],
  onSubmit,
  selectedDate,
  className = ""
}: TransactionFormModalProps) {
  const theme = useThemeColors();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [repeatMonths, setRepeatMonths] = useState<number>(1);
  
  // Estado interno para o formulário
  const [localFormData, setLocalFormData] = useState({
    amount: 'R$ 0,00',
    description: '',
    categoryId: '',
    accountId: '',
    status: 'COMPLETED',
    type: 'EXPENSE',
  });

  // Handler para atualizar dados (local e externo se disponível) - usando useCallback
  const updateFormData = useCallback((updates: any) => {
    setLocalFormData(prev => {
      const newData = { ...prev, ...updates };
      setFormData?.(newData);
      return newData;
    });
  }, [setFormData]); // Removida dependência do localFormData

  // Atualizar dados locais quando formData externo mudar OU quando modal abrir
  useEffect(() => {
    if (isOpen) {
      if (formData && Object.keys(formData).length > 0) {
        setLocalFormData(prev => ({
          ...prev,
          ...formData
        }));
      }
    }
  }, [formData, isOpen]); // Adicionado isOpen como dependência

  // Converter valor para centavos
  const formatCurrencyToCents = (value: string): number => {
    if (!value || value === 'R$ 0,00') return 0;
    
    try {
      const cleaned = value
        .replace('R$', '')
        .replace(/\./g, '')
        .replace(',', '.')
        .trim();
      
      const parsed = parseFloat(cleaned);
      return isNaN(parsed) ? 0 : Math.round(parsed * 100);
    } catch {
      return 0;
    }
  };

  // Formatar valor para exibição
  const formatCentsToCurrency = (cents: number): string => {
    const amountInReais = cents / 100;
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(amountInReais);
  };

  // Handler para campo de valor monetário
  const handleAmountChange = (value: string) => {
    const numericValue = value.replace(/\D/g, "");
    
    if (!numericValue) {
      updateFormData({ amount: 'R$ 0,00' });
      return;
    }

    const cents = parseInt(numericValue);
    const amountInReais = cents / 100;
    
    const formattedValue = new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(amountInReais);

    updateFormData({ amount: formattedValue });
    
    // Limpar erro do campo
    if (errors.amount) {
      setErrors(prev => ({ ...prev, amount: '' }));
    }
  };

  // Validar formulário
  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    const amountInCents = formatCurrencyToCents(localFormData.amount);
    if (!localFormData.amount || localFormData.amount === 'R$ 0,00' || amountInCents === 0) {
      newErrors.amount = 'Valor é obrigatório';
    } else if (amountInCents <= 0) {
      newErrors.amount = 'Valor deve ser maior que zero';
    }

    if (!localFormData.description?.trim()) {
      newErrors.description = 'Descrição é obrigatória';
    } else if (localFormData.description.trim().length < 2) {
      newErrors.description = 'Descrição deve ter pelo menos 2 caracteres';
    }

    if (!localFormData.accountId) {
      newErrors.accountId = 'Conta é obrigatória';
    }

    if (!localFormData.categoryId) {
      newErrors.categoryId = 'Categoria é obrigatória';
    }

    if (repeatMonths < 1 || repeatMonths > 60) {
      newErrors.repeatMonths = 'Número de meses deve estar entre 1 e 60';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).filter(key => newErrors[key]).length === 0;
  };

  // Handlers para campos
  const handleDescriptionChange = (value: string) => {
    updateFormData({ description: value });
    if (errors.description) setErrors(prev => ({ ...prev, description: '' }));
  };

  const handleCategoryChange = (value: string | number) => {
    updateFormData({ categoryId: value.toString() });
    if (errors.categoryId) setErrors(prev => ({ ...prev, categoryId: '' }));
  };

  const handleAccountChange = (value: string | number) => {
    updateFormData({ accountId: value.toString() });
    if (errors.accountId) setErrors(prev => ({ ...prev, accountId: '' }));
  };

  const handleStatusChange = (status: string | number) => {
    updateFormData({ status: status.toString() });
  };

  // Obter tipo da transação baseado na categoria
  const getTransactionTypeFromCategory = (categoryId: string): string => {
    if (!categoryId) return 'EXPENSE';
    const category = categories.find(cat => cat.id === categoryId);
    return category?.type === 'INCOME' ? 'INCOME' : 'EXPENSE';
  };

  // Handler do submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      const firstErrorField = Object.keys(errors).find(key => errors[key]);
      if (firstErrorField) {
        const errorElement = document.querySelector(`[data-field="${firstErrorField}"]`);
        errorElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }
    
    const transactionType = getTransactionTypeFromCategory(localFormData.categoryId || '');
    const amountInCents = formatCurrencyToCents(localFormData.amount);
    
    const submitData = {
      ...localFormData,
      amount: amountInCents,
      description: localFormData.description?.trim() || '',
      type: transactionType,
      status: localFormData.status || 'COMPLETED',
      accountId: localFormData.accountId || '',
      categoryId: localFormData.categoryId || '',
      repeatMonths: editingTransaction ? 1 : repeatMonths,
      ...(selectedDate && { 
        day: selectedDate.getDate(),
        month: selectedDate.getMonth() + 1,
        year: selectedDate.getFullYear()
      })
    };
    
    onSubmit?.(submitData);
  };

  // Opções para os selects
  const categoryOptions = [
    { value: '', label: 'Selecione uma categoria' },
    ...categories.map(category => ({
      value: category.id,
      label: `${category.name} (${category.type === 'INCOME' ? 'Receita' : 'Despesa'})`,
      type: category.type
    }))
  ];

  const accountOptions = [
    { value: '', label: 'Selecione uma conta' },
    ...accounts.map(account => ({
      value: account.id,
      label: account.name
    }))
  ];

  const statusOptions = [
    { value: 'PENDING', label: 'Pendente' },
    { value: 'COMPLETED', label: 'Concluído' },
    { value: 'CANCELLED', label: 'Cancelado' }
  ];

  const handleClose = () => {
    onClose?.();
    setErrors({});
    setRepeatMonths(1);
  };

  // Reset do formulário quando editingTransaction mudar ou modal abrir
  useEffect(() => {
    if (isOpen) {
      if (editingTransaction) {
        const amountFormatted = formatCentsToCurrency(Number(editingTransaction.amount) || 0);
        const newFormData = {
          amount: amountFormatted,
          description: editingTransaction.description || '',
          categoryId: editingTransaction.categoryId || '',
          accountId: editingTransaction.accountId || '',
          status: editingTransaction.status || 'COMPLETED',
          type: editingTransaction.type || 'EXPENSE'
        };
        setLocalFormData(newFormData);
        setRepeatMonths(1);
      } else {
        const newFormData = {
          amount: 'R$ 0,00',
          description: '',
          categoryId: '',
          accountId: '',
          status: 'COMPLETED',
          type: 'EXPENSE'
        };
        setLocalFormData(newFormData);
        setRepeatMonths(1);
      }
    }
  }, [editingTransaction, isOpen]); // Removido updateFormData das dependências

  // Obter o tipo da transação baseado na categoria selecionada para exibição
  const currentTransactionType = localFormData.categoryId 
    ? getTransactionTypeFromCategory(localFormData.categoryId)
    : null;

  if (!isOpen) return null;
  
  return (
    <form onSubmit={handleSubmit} className={`flex-1 flex flex-col overflow-hidden ${className}`}>
      <div className="p-3 sm:p-4 lg:p-6 flex-1 overflow-y-auto">
        <div className="grid grid-cols-1 xl:grid-cols-1 gap-4 sm:gap-6">
          <div className="space-y-3 sm:space-y-4">
            {/* Indicador de Tipo */}
            {currentTransactionType && (
              <div className={`p-3 rounded-lg border ${
                currentTransactionType === 'INCOME' 
                  ? `${theme.colors.income.bg} ${theme.colors.income.border} ${theme.colors.income.text}`
                  : `${theme.colors.expense.bg} ${theme.colors.expense.border} ${theme.colors.expense.text}`
              }`}>
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${
                    currentTransactionType === 'INCOME' ? 'bg-green-500' : 'bg-red-500'
                  }`} />
                  <span className="text-sm font-medium">
                    {currentTransactionType === 'INCOME' ? 'Receita' : 'Despesa'}
                  </span>
                  <span className="text-xs opacity-75">
                    (definido pela categoria)
                  </span>
                </div>
              </div>
            )}

            {/* Valor */}
            <div data-field="amount">
              <Input
                type="text"
                label="Valor *"
                value={localFormData.amount}
                onChange={(e) => handleAmountChange(e.target.value)}
                placeholder="R$ 0,00"
                variant="outlined"
                size="sm"
                required
                disabled={isSubmitting}
                loading={isSubmitting}
                error={errors.amount}
              />
            </div>

            {/* Descrição */}
            <div data-field="description">
              <Input
                type="text"
                label="Descrição *"
                value={localFormData.description}
                onChange={(e) => handleDescriptionChange(e.target.value)}
                placeholder="Descrição da transação"
                variant="outlined"
                size="sm"
                required
                disabled={isSubmitting}
                loading={isSubmitting}
                error={errors.description}
              />
            </div>

            {/* Categoria */}
            <div data-field="categoryId">
              <Select
                value={localFormData.categoryId}
                onChange={handleCategoryChange}
                label="Categoria *"
                options={categoryOptions}
                placeholder="Selecione uma categoria"
                variant="outlined"
                size="sm"
                required
                disabled={isSubmitting}
                loading={isSubmitting}
                error={errors.categoryId}
                searchable={true}
              />
            </div>

            {/* Status e Conta */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div data-field="status">
                <Select
                  value={localFormData.status}
                  onChange={handleStatusChange}
                  label="Status"
                  options={statusOptions}
                  placeholder="Selecione o status"
                  variant="outlined"
                  size="sm"
                  disabled={isSubmitting}
                  loading={isSubmitting}
                />
              </div>

              <div data-field="accountId">
                <Select
                  value={localFormData.accountId}
                  onChange={handleAccountChange}
                  label="Conta *"
                  options={accountOptions}
                  placeholder="Selecione uma conta"
                  variant="outlined"
                  size="sm"
                  required
                  disabled={isSubmitting}
                  loading={isSubmitting}
                  error={errors.accountId}
                />
              </div>
            </div>

            {/* Repetir para outros meses (apenas para novas transações) */}
            {!editingTransaction && (
              <div data-field="repeatMonths">
                <label className={`block text-sm font-medium mb-1 ${theme.text.primary}`}>
                  Repetir transação
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setRepeatMonths(prev => Math.max(1, prev - 1))}
                    disabled={isSubmitting || repeatMonths <= 1}
                    className={`px-2 py-1 rounded ${theme.bg.tertiary} ${theme.state.hover} disabled:opacity-50`}
                  >
                    -
                  </button>

                  <span className={`min-w-[2rem] text-center ${theme.text.primary}`}>
                    {repeatMonths}
                  </span>

                  <button
                    type="button"
                    onClick={() => setRepeatMonths(prev => prev + 1)}
                    disabled={isSubmitting}
                    className={`px-2 py-1 rounded ${theme.bg.tertiary} ${theme.state.hover} disabled:opacity-50`}
                  >
                    +
                  </button>
                </div>

                <p className={`text-xs ${theme.text.tertiary} mt-1`}>
                  A transação será criada para os próximos {repeatMonths} {repeatMonths === 1 ? 'mês' : 'meses'}
                </p>

                {errors.repeatMonths && (
                  <p className="text-xs text-red-500 mt-1">{errors.repeatMonths}</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Botões de ação */}
      <div className={`p-4 lg:p-6 border-t ${theme.border.primary} flex-shrink-0 ${theme.bg.primary}`}>
        <div className="flex gap-3 w-full max-w-2xl ml-auto">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleClose}
            disabled={isSubmitting}
            className="flex-1"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            className="flex-1"
            isLoading={isSubmitting}
            disabled={isSubmitting}
          >
            {editingTransaction ? 'Atualizar' : 'Adicionar'}
          </Button>
        </div>
      </div>
    </form>
  );
}