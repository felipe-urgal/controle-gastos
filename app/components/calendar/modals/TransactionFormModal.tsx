"use client";

import { useState, useEffect, useCallback } from "react";

import { Input, Select, Button } from "@/app/components";

import { useThemeColors } from "@/app/hook";

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
  errors?: any[];
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
  className = "",
  errors
}: TransactionFormModalProps) {
  const theme = useThemeColors();
  const [repeatMonths, setRepeatMonths] = useState<number>(1);
  
  // Estado interno para o formulário
  const [localFormData, setLocalFormData] = useState({
    amount: 'R$ 0,00',
    description: '',
    categoryId: '',
    accountId: '',
    status: '',
    type: '',
  });

  // Handler para atualizar dados - separado da atualização do estado
  const updateFormData = useCallback((updates: any) => {
    setLocalFormData(prev => {
      const newData = { ...prev, ...updates };
      // Chamar setFormData após a atualização do estado, não durante
      setTimeout(() => {
        setFormData?.(newData);
      }, 0);
      return newData;
    });
  }, [setFormData]);

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
  }, [formData, isOpen]);

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
  };

  // Handlers para campos
  const handleDescriptionChange = (value: string) => {
    updateFormData({ description: value });
  };

  const handleCategoryChange = (value: string | number) => {
    updateFormData({ categoryId: value.toString() });
  };

  const handleAccountChange = (value: string | number) => {
    updateFormData({ accountId: value.toString() });
  };

  const handleStatusChange = (status: string | number) => {
    updateFormData({ status: status.toString() });
  };

  // Obter tipo da transação baseado na categoria
  const getTransactionTypeFromCategory = (categoryId: string): string => {
    if (!categoryId) return '';
    const category = categories.find(cat => cat.id === categoryId);
    return category?.type === 'INCOME' ? 'INCOME' : 'EXPENSE';
  };

  // Handler do submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const transactionType = getTransactionTypeFromCategory(localFormData.categoryId || '');
    const amountInCents = formatCurrencyToCents(localFormData.amount);
    
    const submitData = {
      ...localFormData,
      amount: amountInCents,
      description: localFormData.description?.trim() || '',
      type: transactionType,
      status: localFormData.status || '',
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

  const categoryOptions = [
    {
      label: 'Receitas ( + )',
      options: categories
        .filter(category => category.type === 'INCOME')
        .map(category => ({
          value: category.id,
          label: `${category.name} (Receitas)`,
          type: category.type
        }))
    },
    {
      label: 'Despesas ( - )', 
      options: categories
        .filter(category => category.type === 'EXPENSE')
        .map(category => ({
          value: category.id,
          label: `${category.name} (Despesas)`,
          type: category.type
        }))
    }
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
          status: editingTransaction.status || '',
          type: editingTransaction.type || ''
        };
        setLocalFormData(newFormData);
        setRepeatMonths(1);
      } else {
        const newFormData = {
          amount: 'R$ 0,00',
          description: '',
          categoryId: '',
          accountId: '',
          status: '',
          type: ''
        };
        setLocalFormData(newFormData);
        setRepeatMonths(1);
      }
    }
  }, [editingTransaction, isOpen]);

  if (!isOpen) return null;
  
  return (
    <form onSubmit={handleSubmit} className={`flex-1 flex flex-col overflow-hidden ${className}`}>
      <div className="p-3 sm:p-4 lg:p-6 flex-1 overflow-y-auto">
        <div className="grid grid-cols-1 xl:grid-cols-1 gap-4 sm:gap-6">
          <div className="space-y-3 sm:space-y-4">

            {/* Valor */}
            <div data-field="amount">
              <Input
                type="text"
                label="Valor"
                value={localFormData.amount}
                onChange={(e) => handleAmountChange(e.target.value)}
                placeholder="R$ 0,00"
                variant="outlined"
                size="sm"
                required
                disabled={isSubmitting}
                loading={isSubmitting}
                error={(errors || []).filter(a => a.toLowerCase().includes('valor')).join('; ') || ''}
              />
            </div>

            {/* Descrição */}
            <div data-field="description">
              <Input
                type="text"
                label="Descrição"
                value={localFormData.description}
                onChange={(e) => handleDescriptionChange(e.target.value)}
                placeholder="Descrição da transação"
                variant="outlined"
                size="sm"
                required
                disabled={isSubmitting}
                loading={isSubmitting}
                error={(errors || []).filter(a => a.toLowerCase().includes('descrição')).join('; ') || ''}
              />
            </div>

            {/* Categoria */}
            <div data-field="categoryId">
              <Select
                value={localFormData.categoryId}
                onChange={handleCategoryChange}
                label="Categoria"
                options={categoryOptions}
                grouped={true} // ← Isso ativa o modo de grupos
                placeholder="Selecione uma categoria"
                variant="outlined"
                size="sm"
                required
                disabled={isSubmitting}
                loading={isSubmitting}
                searchable={true}
                error={(errors || []).filter(a => a.toLowerCase().includes('categoria')).join('; ') || ''}
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
                  error={(errors || []).filter(a => a.toLowerCase().includes('status')).join('; ') || ''}
                />
              </div>

              <div data-field="accountId">
                <Select
                  value={localFormData.accountId}
                  onChange={handleAccountChange}
                  label="Conta"
                  options={accountOptions}
                  placeholder="Selecione uma conta"
                  variant="outlined"
                  size="sm"
                  required
                  disabled={isSubmitting}
                  loading={isSubmitting}
                  error={(errors || []).filter(a => a.toLowerCase().includes('conta')).join('; ') || ''}
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
