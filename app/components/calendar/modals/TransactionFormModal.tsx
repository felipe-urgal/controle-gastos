"use client";

import { useState } from "react";
import { useTheme } from "@/app/context/ThemeContext";
import { HiX, HiCheck } from "react-icons/hi";
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
  selectedDate
}: TransactionFormModalProps) {
  const { resolvedTheme } = useTheme();
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const colors = {
    bg: resolvedTheme === 'dark' ? 'bg-gray-900' : 'bg-white',
    text: resolvedTheme === 'dark' ? 'text-gray-100' : 'text-gray-800',
    textSecondary: resolvedTheme === 'dark' ? 'text-gray-300' : 'text-gray-600',
    border: resolvedTheme === 'dark' ? 'border-gray-700' : 'border-gray-300',
    inputBg: resolvedTheme === 'dark' ? 'bg-gray-800' : 'bg-white',
  };

  // Formatar valor para input monetário
  const formatCurrency = (value: string) => {
    const numericValue = value.replace(/\D/g, "");
    const floatValue = (parseInt(numericValue || "0") / 100).toFixed(2);
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(parseFloat(floatValue));
  };

  // Parse do valor monetário para número - mais robusto
  const parseCurrency = (value: string): number => {
    if (!value || value === 'R$ 0,00') return 0;
    
    try {
      // Remove R$, pontos e substitui vírgula por ponto
      const cleaned = value
        .replace('R$', '')
        .replace(/\./g, '')
        .replace(',', '.')
        .trim();
      
      const parsed = parseFloat(cleaned);
      
      // Verifica se é um número válido e não é NaN
      if (isNaN(parsed) || !isFinite(parsed)) {
        return 0;
      }
      
      return parsed;
    } catch (error) {
      console.error('Erro ao parsear valor monetário:', error);
      return 0;
    }
  };

  // Validar formulário
  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    // Validar tipo
    if (!formData.type) {
      newErrors.type = 'Tipo da transação é obrigatório';
    }

    // Validar valor
    const amountValue = parseCurrency(formData.amount);
    if (!formData.amount || formData.amount === 'R$ 0,00' || amountValue === 0) {
      newErrors.amount = 'Valor é obrigatório';
    } else if (amountValue <= 0) {
      newErrors.amount = 'Valor deve ser maior que zero';
    } else if (amountValue > 1000000) {
      newErrors.amount = 'Valor não pode ser maior que R$ 1.000.000,00';
    }

    // Validar descrição
    if (!formData.description?.trim()) {
      newErrors.description = 'Descrição é obrigatória';
    } else if (formData.description.trim().length < 2) {
      newErrors.description = 'Descrição deve ter pelo menos 2 caracteres';
    } else if (formData.description.trim().length > 100) {
      newErrors.description = 'Descrição não pode exceder 100 caracteres';
    }

    // Validar conta
    if (!formData.accountId) {
      newErrors.accountId = 'Conta é obrigatória';
    }

    // Validar categoria (opcional, mas recomendado)
    if (!formData.categoryId) {
      newErrors.categoryId = 'Categoria é recomendada';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handler para campo de valor monetário
  const handleAmountChange = (value: string) => {
    const formattedValue = formatCurrency(value);
    setFormData({...formData, amount: formattedValue});
    
    // Limpar erro do campo
    if (errors.amount) {
      setErrors(prev => ({ ...prev, amount: '' }));
    }
  };

  // Handler para outros campos
  const handleFieldChange = (field: string, value: string | number) => {
    setFormData({...formData, [field]: value});
    
    // Limpar erro do campo
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // Handler para tipo de transação
  const handleTypeChange = (type: 'EXPENSE' | 'INCOME') => {
    setFormData({...formData, type});
    
    // Limpar erro do tipo
    if (errors.type) {
      setErrors(prev => ({ ...prev, type: '' }));
    }
  };

  // Handler do submit - converter valor monetário
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      // Scroll para o primeiro erro
      const firstErrorField = Object.keys(errors)[0];
      const errorElement = document.querySelector(`[data-field="${firstErrorField}"]`);
      errorElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    
    // Converter o valor formatado para número de forma segura
    // const amountValue = parseCurrency(formData.amount);
    
    // Garantir que todos os campos obrigatórios estejam presentes
    const submitData = {
      ...formData,
      amount: parseCurrency(formData.amount),
      // Garantir que não enviamos valores null/undefined
      description: formData.description?.trim() || '',
      type: formData.type || 'EXPENSE',
      accountId: formData.accountId || '',
      categoryId: formData.categoryId || null, // categoria pode ser null
      // Incluir a data se existir
      ...(selectedDate && { transactionDate: selectedDate })
    };
    
    console.log('Dados enviados:', submitData); // Para debug
    
    // Chamar onSubmit com os dados garantidos
    onSubmit(e as any);
  };

  // Opções para os selects
  const categoryOptions = [
    { value: '', label: 'Selecione uma categoria' },
    ...categories.map(category => ({
      value: category.id,
      label: category.name
    }))
  ];

  const accountOptions = [
    { value: '', label: 'Selecione uma conta' },
    ...accounts.map(account => ({
      value: account.id,
      label: account.name
    }))
  ];

  const handleClose = () => {
    onClose()
    setErrors({})
  }

  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-opacity-50 flex items-center justify-center z-50 px-2 py-3">
      <div className={`${colors.bg} rounded-3xl shadow-xl w-full h-full sm:max-w-6xl max-h-[90vh] p-4 overflow-y-auto`}>
        <div className="flex justify-between items-center mb-4">
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
        
        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Tipo de Transação */}
          <div data-field="type">
            <label className={`block text-sm font-medium ${colors.textSecondary} mb-1`}>
              Tipo *
            </label>
            <div className="flex space-x-2">
              <Button
                type="button"
                onClick={() => handleTypeChange('EXPENSE')}
                variant={formData.type === 'EXPENSE' ? 'danger' : 'outline'}
                size="sm"
                className="flex-1"
                disabled={isSubmitting}
              >
                Despesa
              </Button>
              <Button
                type="button"
                onClick={() => handleTypeChange('INCOME')}
                variant={formData.type === 'INCOME' ? 'success' : 'outline'}
                size="sm"
                className="flex-1"
                disabled={isSubmitting}
              >
                Receita
              </Button>
            </div>
            {errors.type && (
              <p className="text-red-500 text-xs mt-1">{errors.type}</p>
            )}
          </div>

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
            />
          </div>

          {/* Categoria e Conta */}
          <div className="grid grid-cols-2 gap-2">
            <div data-field="categoryId">
              <Select
                value={formData.categoryId}
                onChange={(value) => handleFieldChange('categoryId', value)}
                label="Categoria"
                options={categoryOptions}
                placeholder="Selecione uma categoria"
                variant="outlined"
                size="md"
                disabled={isSubmitting}
                loading={isSubmitting}
                error={errors.categoryId}
                searchable={true}
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

          {/* Resumo de erros (se houver múltiplos erros) */}
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
          <div className="flex justify-end space-x-2 pt-3 border-t">
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
