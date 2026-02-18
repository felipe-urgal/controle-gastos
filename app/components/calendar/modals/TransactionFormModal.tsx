"use client";

import { useState, useEffect, useCallback } from "react";
import { Input, Select, Button, LoadingAction } from "@/app/components";
import { useThemeColors } from "@/app/hook";
import { motion } from "framer-motion";

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
  // MELHORIA: Nova prop para loading específico
  actionLoading?: {
    creating: boolean;
    updating: boolean;
    deleting: boolean;
  };
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
  errors,
  actionLoading = { creating: false, updating: false, deleting: false }
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

  // MELHORIA: Loading específico para este formulário
  const isFormLoading = actionLoading.creating || actionLoading.updating || isSubmitting;

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

  const getFieldError = (field: string) => {
    if (!errors || !errors.length) return "";

    const map: Record<string, string[]> = {
      amount: ["valor"],
      description: ["descrição"],
      categoryId: ["categoria"],
      accountId: ["conta"],
      status: ["status"],
      type: ["tipo"],
    };

    const keywords = map[field] || [];

    const found = errors.find(err =>
      keywords.some(keyword =>
        err.toLowerCase().includes(keyword)
      )
    );

    return found || "";
  };

  if (!isOpen) return null;
  
  return (
    <form
      onSubmit={handleSubmit}
      className={`flex flex-col h-full relative ${className}`}
    >
      {/* MELHORIA: Overlay de loading durante submit */}
      {isFormLoading && (
        <motion.div
          className="absolute inset-0 z-20 flex items-center justify-center rounded-2xl bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <LoadingAction 
            message={actionLoading.updating ? "Atualizando transação..." : "Criando transação..."} 
          />
        </motion.div>
      )}

      <motion.div
        className="p-2 sm:p-6 flex-1 overflow-y-auto"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.3 }}
      >
        <div className="grid grid-cols-1 xl:grid-cols-1 gap-2 sm:gap-6">
          <div className="space-y-3 sm:space-y-4">
            {/* Valor */}

            <motion.div
              data-field="amount"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
            >
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
                  disabled={isFormLoading}
                  loading={isFormLoading}
                  error={getFieldError("amount")}
                />
              </div>

            </motion.div>

            {/* Descrição */}
            <motion.div
              data-field="amount"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
            >
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
                  disabled={isFormLoading}
                  loading={isFormLoading}
                  error={getFieldError("description")}
                />
              </div>
            </motion.div>

            {/* Categoria */}
            <motion.div
              data-field="amount"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
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
                  disabled={isFormLoading}
                  loading={isFormLoading}
                  searchable={true}
                  error={getFieldError("description")}
                />
              </div>
            </motion.div>

            {/* Status e Conta */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <motion.div
                data-field="amount"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
              >
                <div data-field="status">
                  <Select
                    value={localFormData.status}
                    onChange={handleStatusChange}
                    label="Status"
                    options={statusOptions}
                    placeholder="Selecione o status"
                    variant="outlined"
                    size="sm"
                    disabled={isFormLoading}
                    loading={isFormLoading}
                    error={getFieldError("description")}
                  />
                </div>
              </motion.div>

              <motion.div
                data-field="amount"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.30 }}
              >
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
                    disabled={isFormLoading}
                    loading={isFormLoading}
                    error={getFieldError("description")}
                  />
                </div>
              </motion.div>
            </div>

            {/* Repetir para outros meses (apenas para novas transações) */}
            {!editingTransaction && (
              <motion.div
                data-field="amount"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
              >
                <div data-field="repeatMonths">
                  <label className={`block text-sm font-medium mb-1 ${theme.text.primary}`}>
                    Repetir transação
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setRepeatMonths(prev => Math.max(1, prev - 1))}
                      disabled={isFormLoading || repeatMonths <= 1}
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
                      disabled={isFormLoading}
                      className={`px-2 py-1 rounded ${theme.bg.tertiary} ${theme.state.hover} disabled:opacity-50`}
                    >
                      +
                    </button>
                  </div>

                  <p className={`text-xs ${theme.text.tertiary} mt-1`}>
                    A transação será criada para os próximos {repeatMonths} {repeatMonths === 1 ? 'mês' : 'meses'}
                  </p>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Botões de ação */}
      <div
        className={`
          p-4
          border-t ${theme.border.primary}
          flex-shrink-0
          backdrop-blur-xl
          bg-white/40 dark:bg-slate-900/40
          shadow-[0_-10px_30px_-10px_rgba(0,0,0,0.2)]
        `}
      >
        <div className="flex gap-3 w-full max-w-2xl ml-auto">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleClose}
            disabled={isFormLoading}
            className="flex-1 hover:bg-slate-200/40 dark:hover:bg-slate-700/40 transition-all duration-200"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            className="flex-1 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
            isLoading={isFormLoading}
            disabled={isFormLoading}
          >
            {editingTransaction ? 'Atualizar' : 'Adicionar'}
          </Button>
        </div>
      </div>
    </form>
  );
}