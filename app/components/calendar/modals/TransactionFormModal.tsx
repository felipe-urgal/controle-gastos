"use client";

import { useState, useEffect, useCallback } from "react";
import { useTheme } from "@/app/context/ThemeContext";
import { HiX, HiCheck, HiRefresh } from "react-icons/hi";
import { TransactionFormModalProps } from "@/app/types/calendar";
import { Input, Select, Button } from "@/app/components";

export default function TransactionFormModal({
  isOpen,
  onClose,
  formData,
  setFormData,
  editingTransaction,
  isSubmitting,
  categories,
  accounts,
  onSubmit,
  selectedDate // Data selecionada no calendário
}: TransactionFormModalProps) {
  const { resolvedTheme } = useTheme();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [repeatMonths, setRepeatMonths] = useState<number>(1);
  
  const colors = {
    bg: resolvedTheme === 'dark' ? 'bg-gray-900' : 'bg-white',
    text: resolvedTheme === 'dark' ? 'text-gray-100' : 'text-gray-800',
    textSecondary: resolvedTheme === 'dark' ? 'text-gray-300' : 'text-gray-600',
    border: resolvedTheme === 'dark' ? 'border-gray-700' : 'border-gray-300',
    inputBg: resolvedTheme === 'dark' ? 'bg-gray-800' : 'bg-white',
  };

  // CORREÇÃO: Converter valor para centavos - versão simplificada
  const formatCurrencyToCents = (value: string): number => {
    if (!value || value === 'R$ 0,00') return 0;
    
    try {
      // Remove R$, pontos e substitui vírgula por ponto
      const cleaned = value
        .replace('R$', '')
        .replace(/\./g, '')
        .replace(',', '.')
        .trim();
      
      const parsed = parseFloat(cleaned);
      
      if (isNaN(parsed) || !isFinite(parsed)) {
        return 0;
      }
      
      // CORREÇÃO: Já está em reais, só converter para centavos
      return Math.round(parsed * 100);
    } catch (error) {
      console.error('Erro ao converter valor para centavos:', error);
      return 0;
    }
  };

  // Formatar valor para exibição (de centavos para real)
  const formatCentsToCurrency = (cents: number): string => {
    const amountInReais = cents / 100;
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(amountInReais);
  };

  // Handler para campo de valor monetário - CORRIGIDO
  const handleAmountChange = (value: string) => {
    // Remove tudo que não é dígito
    const numericValue = value.replace(/\D/g, "");
    
    // Se estiver vazio, define como R$ 0,00
    if (!numericValue) {
      setFormData({...formData, amount: 'R$ 0,00'});
      return;
    }

    // Converte para número (em centavos) e depois formata para exibição
    const cents = parseInt(numericValue);
    const amountInReais = cents / 100;
    
    const formattedValue = new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(amountInReais);

    setFormData({...formData, amount: formattedValue});
    
    // Limpar erro do campo
    if (errors.amount) {
      setErrors(prev => ({ ...prev, amount: '' }));
    }
  };

  // Validar formulário
  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    // Validar valor (AGORA em centavos)
    const amountInCents = formatCurrencyToCents(formData.amount);
    if (!formData.amount || formData.amount === 'R$ 0,00' || amountInCents === 0) {
      newErrors.amount = 'Valor é obrigatório';
    } else if (amountInCents <= 0) {
      newErrors.amount = 'Valor deve ser maior que zero';
    } else if (amountInCents > 100000000) { // R$ 1.000.000,00 em centavos
      newErrors.amount = 'Valor não pode ser maior que R$ 1.000.000,00';
    }

    // Validar descrição
    if (!formData.description?.trim()) {
      newErrors.description = 'Descrição é obrigatória';
    } else if (formData.description.trim().length < 2) {
      newErrors.description = 'Descrição deve ter pelo menos 2 caracteres';
    } else if (formData.description.trim().length > 255) {
      newErrors.description = 'Descrição não pode exceder 255 caracteres';
    }

    // Validar conta
    if (!formData.accountId) {
      newErrors.accountId = 'Conta é obrigatória';
    }

    // Validar categoria (agora obrigatória pois define o tipo)
    if (!formData.categoryId) {
      newErrors.categoryId = 'Categoria é obrigatória';
    }

    // Validar repeatMonths
    if (repeatMonths < 1 || repeatMonths > 60) {
      newErrors.repeatMonths = 'Número de meses deve estar entre 1 e 60';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handler para outros campos
  const handleFieldChange = (field: string, value: string | number) => {
    setFormData({...formData, [field]: value});
    
    // Limpar erro do campo
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // Handler para status
  const handleStatusChange = (status: 'PENDING' | 'COMPLETED' | 'CANCELLED') => {
    setFormData({...formData, status});
  };

  // Handler para repeatMonths
  const handleRepeatMonthsChange = (value: string | number) => {
    const months = parseInt(value.toString()) || 1; // Converta para string primeiro
    setRepeatMonths(months);
    
    // Limpar erro do campo
    if (errors.repeatMonths) {
      setErrors(prev => ({ ...prev, repeatMonths: '' }));
    }
  };

  // Obter tipo da transação baseado na categoria selecionada
  const getTransactionTypeFromCategory = (categoryId: string): 'EXPENSE' | 'INCOME' => {
    if (!categoryId) return 'EXPENSE';
    
    const category = categories.find(cat => cat.id === categoryId);
    return category?.type === 'INCOME' ? 'INCOME' : 'EXPENSE';
  };

  // Handler do submit - CORRIGIDO
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      const firstErrorField = Object.keys(errors)[0];
      const errorElement = document.querySelector(`[data-field="${firstErrorField}"]`);
      errorElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    
    // Determinar o tipo baseado na categoria selecionada
    const transactionType = getTransactionTypeFromCategory(formData.categoryId || '');

    // console.log("Valor original:", formData.amount);
    
    // CORREÇÃO: Converter valor para centavos
    const amountInCents = formatCurrencyToCents(formData.amount);
    // console.log("Valor em centavos:", amountInCents);
    
    // Preparar dados para envio
    const submitData = {
      ...formData,
      // CORREÇÃO: Usar o valor já convertido para centavos
      amount: amountInCents,
      description: formData.description?.trim() || '',
      type: transactionType, // Tipo definido pela categoria
      status: formData.status || 'COMPLETED',
      accountId: formData.accountId || '',
      categoryId: formData.categoryId || '',
      repeatMonths: editingTransaction ? 1 : repeatMonths, // Só aplica repeat para novas transações
      // Incluir data se existir (day, month, year)
      ...(selectedDate && { 
        day: selectedDate.getDate(),
        month: selectedDate.getMonth() + 1,
        year: selectedDate.getFullYear()
      })
    };
    
    console.log('Dados enviados:', submitData);
    
    // Chamar onSubmit
    onSubmit(submitData as any);
  };

  // Opções para os selects
  const categoryOptions = [
    { value: '', label: 'Selecione uma categoria' },
    ...categories.map(category => ({
      value: category.id,
      label: `${category.name} (${category.type === 'INCOME' ? 'Receita' : 'Despesa'})`,
      type: category.type // Manter o tipo para referência
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

  const repeatOptions = [
    { value: '1', label: 'Apenas este mês' },
    { value: '2', label: '2 meses' },
    { value: '3', label: '3 meses' },
    { value: '6', label: '6 meses' },
    { value: '12', label: '1 ano' },
    { value: '24', label: '2 anos' },
    { value: '60', label: '5 anos' }
  ];

  const handleClose = () => {
    onClose();
    setErrors({});
    setRepeatMonths(1);
  };

  // CORREÇÃO: useCallback para resetFormData
  const resetFormData = useCallback(() => {
    if (editingTransaction && isOpen) {
      // CORREÇÃO: amount já está em centavos no editingTransaction
      const amountFormatted = formatCentsToCurrency(Number(editingTransaction.amount));
      setFormData({
        amount: amountFormatted,
        description: editingTransaction.description || '',
        categoryId: editingTransaction.categoryId || '',
        accountId: editingTransaction.accountId || '',
        status: editingTransaction.status || 'COMPLETED',
        type: editingTransaction.type || 'EXPENSE'
      });
      // Resetar repeatMonths para edição
      setRepeatMonths(1);
    } else if (!editingTransaction && isOpen) {
      // Resetar para nova transação
      setFormData({
        amount: 'R$ 0,00',
        description: '',
        categoryId: '',
        accountId: '',
        status: 'COMPLETED'
      });
      setRepeatMonths(1);
    }
  }, [editingTransaction, isOpen, setFormData]);

  // Efeito para inicializar dados quando editingTransaction mudar - CORRIGIDO
  useEffect(() => {
    resetFormData();
  }, [resetFormData]);

  // Obter o tipo da transação baseado na categoria selecionada para exibição
  const currentTransactionType = formData.categoryId 
    ? getTransactionTypeFromCategory(formData.categoryId)
    : null;

  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 px-2 py-3">
      <div className={`${colors.bg} rounded-3xl shadow-xl w-full h-full sm:max-w-6xl sm:max-h-[90vh] p-6 overflow-y-auto`}>
        <div className="flex justify-between items-center mb-6">
          <h4 className={`text-lg font-bold ${colors.text}`}>
            {editingTransaction ? 'Editar Transação' : 'Nova Transação'}
          </h4>
          <Button 
            onClick={handleClose}
            variant="secondary"
            size="sm"
            icon={<HiX className="w-4 h-4" />}
            className="rounded-full !p-2"
            title="Fechar"
            disabled={isSubmitting}
          />
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Indicador de Tipo (baseado na categoria) */}
          {currentTransactionType && (
            <div className={`p-3 rounded-lg ${
              currentTransactionType === 'INCOME' 
                ? 'bg-green-50 border border-green-200 text-green-800'
                : 'bg-red-50 border border-red-200 text-red-800'
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
              value={formData.amount}
              onChange={(e) => handleAmountChange(e.target.value)}
              placeholder="R$ 0,00"
              variant="outlined"
              size="md"
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
              value={formData.description}
              onChange={(e) => handleFieldChange('description', e.target.value)}
              placeholder="Descrição da transação"
              variant="outlined"
              size="md"
              required
              disabled={isSubmitting}
              loading={isSubmitting}
              error={errors.description}
              // maxLength={255}
            />
          </div>

          {/* Categoria (agora obrigatória) */}
          <div data-field="categoryId">
            <Select
              value={formData.categoryId}
              onChange={(value) => handleFieldChange('categoryId', value)}
              label="Categoria *"
              options={categoryOptions}
              placeholder="Selecione uma categoria"
              variant="outlined"
              size="md"
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
                value={formData.status}
                onChange={(value) => handleStatusChange(value as any)}
                label="Status"
                options={statusOptions}
                placeholder="Selecione o status"
                variant="outlined"
                size="md"
                disabled={isSubmitting}
                loading={isSubmitting}
              />
            </div>

            <div data-field="accountId">
              <Select
                value={formData.accountId}
                onChange={(value) => handleFieldChange('accountId', value)}
                label="Conta *"
                options={accountOptions}
                placeholder="Selecione uma conta"
                variant="outlined"
                size="md"
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
              <Select
                value={repeatMonths.toString()}
                onChange={handleRepeatMonthsChange}
                label="Repetir transação"
                options={repeatOptions}
                placeholder="Selecione por quantos meses repetir"
                variant="outlined"
                size="md"
                disabled={isSubmitting}
                loading={isSubmitting}
                error={errors.repeatMonths}
                icon={<HiRefresh className="w-4 h-4" />}
              />
              <p className="text-xs text-gray-500 mt-1">
                A transação será criada para os próximos {repeatMonths} {repeatMonths === 1 ? 'mês' : 'meses'}
              </p>
            </div>
          )}

          {/* Data selecionada */}
          {selectedDate && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-blue-800 text-sm">
                <strong>Data:</strong> {selectedDate.toLocaleDateString('pt-BR')}
              </p>
              {!editingTransaction && repeatMonths > 1 && (
                <p className="text-blue-700 text-xs mt-1">
                  Será repetida até {new Date(
                    selectedDate.getFullYear(),
                    selectedDate.getMonth() + repeatMonths - 1,
                    selectedDate.getDate()
                  ).toLocaleDateString('pt-BR')}
                </p>
              )}
            </div>
          )}

          {/* Resumo de erros */}
          {Object.keys(errors).length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-800 text-sm font-medium mb-1">
                Por favor, corrija os seguintes erros:
              </p>
              <ul className="text-red-700 text-xs list-disc list-inside space-y-1">
                {Object.entries(errors).map(([field, error]) => (
                  <li key={field}>{error}</li>
                ))}
              </ul>
            </div>
          )}
          
          {/* Botões de ação */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button
              type="button"
              onClick={handleClose}
              variant="secondary"
              size="md"
              icon={<HiX className="w-4 h-4" />}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              isLoading={isSubmitting}
              icon={<HiCheck className="w-4 h-4" />}
            >
              {editingTransaction ? "Atualizar" : "Criar"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
